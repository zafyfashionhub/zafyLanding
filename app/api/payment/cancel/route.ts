import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {

  try {

    const { orderNumber } =
      await req.json();

    if (!orderNumber) {
      return NextResponse.json(
        { error: "Missing orderNumber" },
        { status: 400 }
      );
    }

    await prisma.order.update({
      where: {
        orderNumber,
      },

      data: {
        paymentStatus: "FAILED",
        status: "CANCELLED",
      },
    });

    return NextResponse.json({
      success: true,
    });

  } catch (err) {

    console.error(err);

    return NextResponse.json(
      { error: "Failed to cancel order" },
      { status: 500 }
    );
  }
}