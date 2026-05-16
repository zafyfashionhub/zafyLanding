// app/api/payment/create-order/route.ts

import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import Razorpay from "razorpay";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

export async function POST(req: Request) {

  try {

    const { orderNumber } = await req.json();

    if (!orderNumber) {
      return NextResponse.json(
        { error: "Missing orderNumber" },
        { status: 400 }
      );
    }

    // ✅ GUEST CHECKOUT SUPPORT
    // No auth/session required anymore

    const order = await prisma.order.findUnique({
      where: { orderNumber },
    });

    if (!order) {
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      );
    }

    // already paid
    if (order.paymentStatus === "PAID") {
      return NextResponse.json(
        { error: "Order is already paid" },
        { status: 409 }
      );
    }

    // ── Reuse existing Razorpay order if exists ─────────────────

    if (order.razorpayOrderId) {

      try {

        const existing =
          await razorpay.orders.fetch(
            order.razorpayOrderId
          );

        if (existing.status !== "paid") {

          return NextResponse.json({
            id: existing.id,
            amount: existing.amount,
            currency: existing.currency,
          });
        }

      } catch (err) {

        console.error(
          "Failed fetching existing Razorpay order:",
          err
        );
      }
    }

    // ── Create Razorpay order ───────────────────────────────────

    const razorpayOrder =
      await razorpay.orders.create({
        amount: Math.round(
          Number(order.finalAmount) * 100
        ),
        currency: "INR",
        receipt: order.orderNumber,
      });

    // save razorpay order id

    await prisma.order.update({
      where: {
        id: order.id,
      },

      data: {
        razorpayOrderId:
          razorpayOrder.id,
      },
    });

    return NextResponse.json({
      success: true,
      id: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
    });

  } catch (err) {

    console.error(
      "RAZORPAY CREATE ORDER ERROR:",
      err
    );

    return NextResponse.json(
      {
        error:
          "Failed to create Razorpay order",
      },
      {
        status: 500,
      }
    );
  }
}