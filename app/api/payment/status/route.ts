// // app/api/payment/status/route.ts

// import { prisma } from "@/lib/prisma";
// import { NextResponse } from "next/server";
// import { auth } from "@/app/api/auth/[...nextauth]/route";

// export async function GET(req: Request) {
//   try {
//     const session = await auth();

//     if (!session?.user?.id) {
//       return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
//     }

//     const { searchParams } = new URL(req.url);
//     const orderNumber = searchParams.get("orderNumber");

//     if (!orderNumber) {
//       return NextResponse.json(
//         { error: "Missing orderNumber" },
//         { status: 400 }
//       );
//     }

//     const order = await prisma.order.findFirst({
//       where: {
//         orderNumber,
//         userId: parseInt(session.user.id), // 🔒 SECURITY
//       },
//       select: {
//         paymentStatus: true,
//         status: true,
//       },
//     });

//     if (!order) {
//       return NextResponse.json(
//         { error: "Order not found" },
//         { status: 404 }
//       );
//     }

//     return NextResponse.json(order);

//   } catch (err) {
//     console.error("Payment status error:", err);

//     return NextResponse.json(
//       { error: "Failed to fetch status" },
//       { status: 500 }
//     );
//   }
// }

// app/api/payment/status/route.ts

import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req: Request) {

  const { searchParams } = new URL(req.url);

  const orderNumber =
    searchParams.get("orderNumber");

  if (!orderNumber) {
    return NextResponse.json(
      { error: "Missing orderNumber" },
      { status: 400 }
    );
  }

  const order = await prisma.order.findUnique({
    where: { orderNumber },

    select: {
      orderNumber: true,
      paymentStatus: true,
      status: true,
      paymentMethod: true,
      totalAmount: true,
      finalAmount: true,
      customerName: true,
      createdAt: true,
    },
  });

  if (!order) {
    return NextResponse.json(
      { error: "Order not found" },
      { status: 404 }
    );
  }

  return NextResponse.json(order);
}