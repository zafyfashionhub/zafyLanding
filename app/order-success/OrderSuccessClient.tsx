// "use client";

// import { useSearchParams, useRouter } from "next/navigation";
// import { useEffect, useState } from "react";
// import Navbar from "@/components/Navbar";
// import Footer from "@/components/Footer";
// import Link from "next/link";
// import { purchase } from "@/lib/metaPixel";

// export default function OrderSuccessPage() {
//   const searchParams = useSearchParams();
//   const router = useRouter();

//   const orderNumber = searchParams.get("orderNumber");

//   const [loading, setLoading] = useState(true);
//   const [valid, setValid] = useState(false);

//   useEffect(() => {
//     if (!orderNumber) {
//       router.replace("/checkout");
//       return;
//     }

//     const checkOrder = async () => {
//       try {
//         const res = await fetch(
//           `/api/orders/status?orderNumber=${orderNumber}`
//         );

//         const data = await res.json();

//         if (
//           data.paymentStatus === "PAID" ||
//           data.paymentMethod === "COD"
//         ) {
//           setValid(true);

//           purchase(
//             orderNumber,
//             Number(
//               data.finalAmount ||
//               data.totalAmount ||
//               0
//             )
//           );
//         } else {
//           router.replace("/checkout");
//         }
//       } catch (err) {
//         console.error(err);
//         router.replace("/checkout");
//       } finally {
//         setLoading(false);
//       }
//     };

//     checkOrder();
//   }, [orderNumber, router]);

//   if (loading) {
//     return (
//       <div className="min-h-screen flex items-center justify-center bg-white">
//         Loading...
//       </div>
//     );
//   }

//   if (!valid) return null;

//   return (
//     <div className="min-h-screen bg-white flex flex-col">
//       <Navbar />

//       <main className="flex-1 flex items-center justify-center py-20">
//         <div className="text-center px-6 max-w-md">
//           <div className="text-6xl mb-6">🎉</div>

//           <h1 className="text-4xl font-light mb-3">
//             Payment Successful!
//           </h1>

//           <p className="text-2xl text-green-600 mb-8">
//             Order Confirmed
//           </p>

//           <div className="bg-gray-50 border rounded-2xl p-8 mb-10">
//             <p className="text-gray-600 mb-2">Order Number</p>

//             <p className="text-2xl font-mono font-semibold">
//               {orderNumber}
//             </p>
//           </div>

//           <div className="space-y-4">
//             <Link
//               href="/account"
//               className="block w-full bg-black text-white py-4 rounded-xl"
//             >
//               View Order in Account
//             </Link>

//             <Link
//               href="/products"
//               className="block w-full border border-black py-4 rounded-xl"
//             >
//               Continue Shopping
//             </Link>
//           </div>
//         </div>
//       </main>

//       <Footer />
//     </div>
//   );
// }

"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

import Link from "next/link";

interface OrderData {
  orderNumber: string;
  paymentStatus: string;
  status: string;
  paymentMethod: string;
  totalAmount: number;
  finalAmount: number;
  customerName: string;
}

export default function OrderSuccessPage() {

  const searchParams = useSearchParams();

  const router = useRouter();

  const orderNumber =
    searchParams.get("orderNumber");

  const [loading, setLoading] =
    useState(true);

  const [order, setOrder] =
    useState<OrderData | null>(null);

  useEffect(() => {

    if (!orderNumber) {
      router.replace("/");
      return;
    }

    const loadOrder = async () => {

      try {

        const res = await fetch(
          `/api/payment/status?orderNumber=${orderNumber}`
        );

        const data = await res.json();

        if (!res.ok) {
          router.replace("/");
          return;
        }

        setOrder(data);

      } catch (err) {

        console.error(err);

        router.replace("/");

      } finally {

        setLoading(false);
      }
    };

    loadOrder();

  }, [orderNumber, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        Loading...
      </div>
    );
  }

  if (!order) return null;

  return (
    <div className="min-h-screen bg-white flex flex-col">

      <Navbar />

      <main className="flex-1 flex items-center justify-center py-16 px-4">

        <div className="w-full max-w-lg border rounded-3xl p-8 text-center">

          <div className="text-6xl mb-6">
            🎉
          </div>

          <h1 className="text-4xl font-light mb-3">
            Order Placed Successfully
          </h1>

          <p className="text-green-600 text-lg mb-8">
            Your order has been confirmed
          </p>

          <div className="bg-gray-50 rounded-2xl p-6 mb-6 border">

            <p className="text-sm text-gray-500 mb-2">
              Order ID
            </p>

            <p className="text-2xl font-bold break-all">
              {order.orderNumber}
            </p>

          </div>

          <div className="bg-yellow-50 border border-yellow-300 rounded-2xl p-4 mb-8">

            <p className="text-sm font-medium text-yellow-800">
              Please save this Order ID or take a screenshot for future tracking.
            </p>

          </div>

          <div className="space-y-4">

            <Link
              href={`/track/${order.orderNumber}`}
              className="block w-full bg-black text-white py-4 rounded-xl"
            >
              Track Order
            </Link>

            <Link
              href="/products"
              className="block w-full border border-black py-4 rounded-xl"
            >
              Continue Shopping
            </Link>

          </div>

        </div>

      </main>

      <Footer />

    </div>
  );
}