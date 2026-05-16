"use client";

import Link from "next/link";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function PaymentCancelledPage() {

  return (
    <div className="min-h-screen bg-white flex flex-col">

      <Navbar />

      <main className="flex-1 flex items-center justify-center px-4 py-16">

        <div className="w-full max-w-lg border rounded-3xl p-8 text-center">

          <div className="text-6xl mb-6">
            ❌
          </div>

          <h1 className="text-4xl font-light mb-4">
            Payment Cancelled
          </h1>

          <p className="text-gray-600 mb-8">
            Your payment was not completed.
          </p>

          <div className="space-y-4">

            <Link
              href="/checkout"
              className="block w-full bg-black text-white py-4 rounded-xl"
            >
              Try Again
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