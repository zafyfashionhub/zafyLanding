// app/checkout/page.tsx
"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import WhatsappButton from "@/components/WhatsappButton";
import { initiateCheckout } from "@/lib/metaPixel";

declare global {
  interface Window { Razorpay: any; }
}

// ─── Constants ────────────────────────────────────────────────────────────────
const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa",
  "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala",
  "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland",
  "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura",
  "Uttar Pradesh", "Uttarakhand", "West Bengal", "Andaman and Nicobar Islands",
  "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu", "Delhi",
  "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry",
];

const EMPTY_FORM = {
  name: "",
  phone: "",
  confirmPhone: "",
  email: "",
  address: "",
  city: "",
  state: "",
  pincode: "",
  landmark: ""
};

type PaymentState = "idle" | "creating_order" | "awaiting_payment" | "verifying" | "success" | "failed";
type FieldErrors = Record<string, string>;

// ─── AddressForm (OUTSIDE checkout component — prevents focus loss on re-render)
type AddressFormProps = {
  form: typeof EMPTY_FORM;
  setField: (k: keyof typeof EMPTY_FORM) => (v: string) => void;
  fieldErrors: FieldErrors;
  loading: boolean;
  onSave: () => void;
  onCancel: () => void;
};

function AddressForm({ form, setField, fieldErrors, loading, onSave, onCancel }: AddressFormProps) {
  const inp = (
    id: keyof typeof EMPTY_FORM,
    label: string,
    placeholder: string,
    opts?: { required?: boolean; type?: string; maxLength?: number }
  ) => (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">
        {label}{opts?.required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <input
        type={opts?.type || "text"}
        value={form[id]}
        maxLength={opts?.maxLength}
        placeholder={placeholder}
        autoComplete="off"
        onChange={(e) => setField(id)(e.target.value)}
        className={`w-full border px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 transition ${fieldErrors[id]
          ? "border-red-400 focus:ring-red-100"
          : "border-gray-300 focus:border-black focus:ring-black/10"
          }`}
      />
      {fieldErrors[id] && <p className="text-red-500 text-xs mt-1">⚠ {fieldErrors[id]}</p>}
    </div>
  );

  return (
    <div className="border border-gray-200 rounded-2xl p-5 bg-gray-50/50 space-y-3">
      <h3 className="font-medium text-sm mb-1">New Delivery Address</h3>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 sm:col-span-1">{inp("name", "Full Name", "Rahul Sharma", { required: true })}</div>
        <div className="col-span-2 sm:col-span-1">
          {inp("phone", "Mobile No.", "9876543210", { required: true, type: "tel", maxLength: 10 })}
        </div>

        <div className="col-span-2 sm:col-span-1">
          {inp("confirmPhone", "Confirm Mobile No.", "9876543210", { required: true, type: "tel", maxLength: 10 })}
        </div>

        <div className="col-span-2">
          {inp("email", "Email (Optional)", "you@example.com", { type: "email" })}
        </div>
        <div className="col-span-2">               {inp("address", "Flat/Street", "Flat 101, MG Road", { required: true })}</div>
        <div>                                      {inp("city", "City", "Surat", { required: true })}</div>

        {/* State dropdown — also OUTSIDE component prevents remount */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            State<span className="text-red-500 ml-0.5">*</span>
          </label>
          <select
            value={form.state}
            onChange={(e) => setField("state")(e.target.value)}
            className={`w-full border px-3 py-2.5 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 transition ${fieldErrors.state ? "border-red-400 focus:ring-red-100" : "border-gray-300 focus:border-black focus:ring-black/10"
              }`}
          >
            <option value="">Select state</option>
            {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          {fieldErrors.state && <p className="text-red-500 text-xs mt-1">⚠ {fieldErrors.state}</p>}
        </div>

        <div>{inp("pincode", "Pincode", "395001", { required: true, maxLength: 6 })}</div>
        <div>{inp("landmark", "Landmark", "Near City Mall (optional)")}</div>
      </div>

      <div className="flex gap-2 pt-1">
        <button
          onClick={onSave}
          disabled={loading}
          className="flex-1 bg-black text-white py-2.5 rounded-xl text-sm font-medium disabled:bg-gray-400 transition"
        >
          {loading ? "Saving…" : "Use This Address"}
        </button>

      </div>
    </div>
  );
}

// ─── Validate address form ────────────────────────────────────────────────────
function validateAddr(form: typeof EMPTY_FORM): FieldErrors {
  const e: FieldErrors = {};
  if (!form.name.trim() || form.name.trim().length < 2) e.name = "At least 2 characters";
  if (!/^\d{10}$/.test(form.phone.trim())) e.phone = "Valid 10-digit number (no +91)";
  if (form.phone !== form.confirmPhone) e.confirmPhone = "Phone numbers do not match";
  if (!form.address.trim() || form.address.trim().length < 10) e.address = "Complete address required (min 10 chars)";
  if (!form.city.trim()) e.city = "Required";
  if (!form.state) e.state = "Select a state";
  if (!/^\d{6}$/.test(form.pincode.trim())) e.pincode = "Valid 6-digit pincode";
  return e;
}

// ─── Main Checkout Page ───────────────────────────────────────────────────────
export default function CheckoutPage() {
  const router = useRouter();

  const [cart, setCart] = useState<any[]>([]);
  const [savedAddresses, setSavedAddresses] = useState<any[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addrLoading, setAddrLoading] = useState(false);
  const [addrFieldErrors, setAddrFieldErrors] = useState<FieldErrors>({});
  const [addrForm, setAddrForm] = useState({ ...EMPTY_FORM });
  const [paymentMethod, setPaymentMethod] = useState<"COD" | "RAZORPAY">("COD");
  const [paymentState, setPaymentState] = useState<PaymentState>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const rzpRef = useRef<any>(null);
  const rzpScriptRef = useRef(false);

  // ── Setfield helper (stable ref, no re-render issue) ──────────────────────
  const setAddrField = useCallback((k: keyof typeof EMPTY_FORM) => (v: string) => {
    setAddrForm(prev => ({ ...prev, [k]: v }));
    setAddrFieldErrors(prev => ({ ...prev, [k]: "" }));
  }, []);

  // ── Load cart ──────────────────────────────────────────────────────────────
  useEffect(() => {
    setCart(JSON.parse(localStorage.getItem("cart") || "[]"));
  }, []);

  // ── Load addresses ─────────────────────────────────────────────────────────
  const loadAddresses = useCallback(() => {
    try {
      const local =
        localStorage.getItem("guest_addresses");

      const list = local ? JSON.parse(local) : [];

      setSavedAddresses(list);

      if (list.length > 0) {
        setSelectedAddressId(
          list[0].id.toString()
        );
        setShowAddForm(false);
      } else {
        setShowAddForm(true);
      }

    } catch {
      setSavedAddresses([]);
      setShowAddForm(true);
    }
  }, []);

  useEffect(() => {
    loadAddresses();
  }, [loadAddresses]);

  // ── Save new address ───────────────────────────────────────────────────────
  // const saveAddress = async () => {
  //   const errs = validateAddr(addrForm);
  //   if (Object.keys(errs).length > 0) { setAddrFieldErrors(errs); return; }

  //   setAddrLoading(true);
  //   setErrorMsg(null);
  //   try {
  // const res = await fetch("/api/user/addresses", {
  //   method: "POST",
  //   headers: { "Content-Type": "application/json" },
  //   body: JSON.stringify({
  //     name: addrForm.name.trim(),
  //     phone: addrForm.phone.trim(),
  //     address: addrForm.address.trim(),
  //     city: addrForm.city.trim(),
  //     state: addrForm.state,
  //     pincode: addrForm.pincode.trim(),
  //     landmark: addrForm.landmark.trim(),
  //   }),
  // });
  //     const data = await res.json();
  //     if (!res.ok) { setErrorMsg(data.error || "Failed to save address"); return; }

  //     setAddrForm({ ...EMPTY_FORM });
  //     setAddrFieldErrors({});
  //     await loadAddresses(); // reloads + auto-selects new address
  //   } catch {
  //     setErrorMsg("Network error saving address");
  //   } finally {
  //     setAddrLoading(false);
  //   }
  // };

  const saveAddress = async () => {
    const errs = validateAddr(addrForm);

    if (Object.keys(errs).length > 0) {
      setAddrFieldErrors(errs);
      return;
    }

    setAddrLoading(true);
    setErrorMsg(null);

    try {
      const newAddress = {
        id: Date.now(),
        name: addrForm.name.trim(),
        phone: addrForm.phone.trim(),
        email: addrForm.email.trim(),
        address: addrForm.address.trim(),
        city: addrForm.city.trim(),
        state: addrForm.state,
        pincode: addrForm.pincode.trim(),
        landmark: addrForm.landmark.trim(),
        isDefault: true,
      };

      // save in localStorage
      localStorage.setItem(
        "guest_addresses",
        JSON.stringify([newAddress])
      );

      // update state instantly
      setSavedAddresses([newAddress]);

      // auto select
      setSelectedAddressId(
        newAddress.id.toString()
      );

      // reset form
      setAddrForm({ ...EMPTY_FORM });
      setAddrFieldErrors({});
      setShowAddForm(false);

    } catch {
      setErrorMsg("Failed to save address");
    } finally {
      setAddrLoading(false);
    }
  };

  // ── Razorpay script (load once) ────────────────────────────────────────────
  const ensureRzpScript = useCallback((): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (rzpScriptRef.current && window.Razorpay) return resolve();
      document.querySelectorAll('script[src*="checkout.razorpay.com"]').forEach(e => e.remove());
      const s = document.createElement("script");
      s.src = "https://checkout.razorpay.com/v1/checkout.js";
      s.async = true;
      s.onload = () => { rzpScriptRef.current = true; resolve(); };
      s.onerror = () => reject(new Error("Razorpay failed to load"));
      document.body.appendChild(s);
    });
  }, []);

  const destroyRzp = useCallback(() => {
    try { rzpRef.current?.close(); } catch { }
    rzpRef.current = null;
    document.querySelectorAll('iframe[src*="razorpay"]').forEach(e => e.remove());
    document.querySelectorAll(".razorpay-backdrop").forEach(e => e.remove());
  }, []);

  useEffect(() => () => destroyRzp(), [destroyRzp]);

  // ── Order process ──────────────────────────────────────────────────────────
  const subtotal = cart.reduce((s, i) => s + Number(i.price) * Number(i.quantity), 0);
  const isLoading = ["creating_order", "awaiting_payment", "verifying"].includes(paymentState);
  const canCheckout = !isLoading && cart.length > 0 && !!selectedAddressId;
  useEffect(() => {
    if (cart.length > 0 && subtotal > 0) {
      initiateCheckout(subtotal);
    }
  }, [cart, subtotal]);
  const processOrder = async () => {
    if (!canCheckout) return;
    const addr = savedAddresses.find(a => a.id.toString() === selectedAddressId);
    if (!addr) { setErrorMsg("Select a shipping address"); return; }

    setErrorMsg(null);
    setPaymentState("creating_order");

    try {
      const res = await fetch("/api/checkout/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cartItems: cart, shippingAddress: addr, paymentMethod }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMsg(data.error || "Failed to create order");
        setPaymentState("failed");
        return;
      }

      const { orderNumber } = data;

      if (paymentMethod === "COD") {
        localStorage.removeItem("cart");
        setPaymentState("success");
        router.push(`/order-success?orderNumber=${orderNumber}`);
        return;
      }

      // Razorpay flow
      const payRes = await fetch("/api/payment/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderNumber }),
      });
      const rzpOrder = await payRes.json();
      if (!payRes.ok) { setErrorMsg("Failed to start payment"); setPaymentState("failed"); return; }

      await ensureRzpScript();
      setPaymentState("awaiting_payment");

      rzpRef.current = new window.Razorpay({
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: rzpOrder.amount,
        currency: "INR",
        order_id: rzpOrder.id,
        name: "Zafy Fashion",
        description: `Order #${orderNumber}`,
        prefill: {
          name: addr.name || "",
          email: addr.email || "",
          contact: addr.phone || ""
        },
        theme: { color: "#000000" },
        handler: async (response: any) => {
          setPaymentState("verifying");
          try {
            const vRes = await fetch("/api/payment/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ ...response, orderNumber }),
            });
            const vData = await vRes.json();
            if (vData.success) {
              localStorage.removeItem("cart");
              setPaymentState("success");
              router.push(`/order-success?orderNumber=${orderNumber}`);
            } else {
              setErrorMsg("Payment verified failed. Contact support.");
              setPaymentState("failed");
            }
          } catch { setErrorMsg("Verification error"); setPaymentState("failed"); }
          finally { destroyRzp(); }
        },
        modal: {
          escape: true,
          backdropclose: true,

          ondismiss: async () => {

            destroyRzp();

            try {

              // mark order cancelled
              await fetch("/api/payment/cancel", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },

                body: JSON.stringify({
                  orderNumber,
                }),
              });

            } catch (err) {
              console.error(err);
            }

            router.push(
              `/payment-cancelled?orderNumber=${orderNumber}`
            );
          },
        },
      });
      rzpRef.current.on(
        "payment.failed",
        async () => {

          destroyRzp();

          try {

            await fetch("/api/payment/cancel", {
              method: "POST",

              headers: {
                "Content-Type": "application/json",
              },

              body: JSON.stringify({
                orderNumber,
              }),
            });

          } catch (err) {
            console.error(err);
          }

          router.push(
            `/payment-cancelled?orderNumber=${orderNumber}`
          );
        }
      );
      rzpRef.current.open();

    } catch { setErrorMsg("Something went wrong"); setPaymentState("failed"); }
  };

  const maxReached = savedAddresses.length >= 5;

  return (
    <div className="bg-white min-h-screen">
      <Navbar />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
        <h1 className="text-3xl sm:text-4xl font-light text-center mb-10">Checkout</h1>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">

          {/* ── LEFT ── */}
          <div className="lg:col-span-3 space-y-8">

            {/* Shipping Address */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Shipping Address</h2>
                {!showAddForm && !maxReached && (
                  <button
                    onClick={() => setShowAddForm(true)}
                    className="text-sm text-black underline underline-offset-2 hover:no-underline"
                  >
                    + Add New
                  </button>
                )}
                {maxReached && (
                  <span className="text-xs text-amber-600">Max 5 addresses</span>
                )}
              </div>

              {/* Saved addresses */}
              {savedAddresses.length > 0 && (
                <div className="space-y-3 mb-4">
                  {savedAddresses.map((addr: any) => (
                    <label
                      key={addr.id}
                      className={`flex gap-3 items-start border p-4 rounded-2xl cursor-pointer transition ${selectedAddressId === addr.id.toString()
                        ? "border-black bg-gray-50 shadow-sm"
                        : "border-gray-200 hover:border-gray-300"
                        }`}
                    >
                      <input
                        type="radio"
                        name="address"
                        checked={selectedAddressId === addr.id.toString()}
                        onChange={() => { setSelectedAddressId(addr.id.toString()); setShowAddForm(false); }}
                        className="mt-1 accent-black"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm">{addr.name}</span>
                          {addr.isDefault && (
                            <span className="text-[10px] bg-black text-white px-2 py-0.5 rounded-full">Default</span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">+91 {addr.phone}</p>
                        <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                          {addr.address}, {addr.city}, {addr.state} — {addr.pincode}
                          {addr.landmark && ` (${addr.landmark})`}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              )}

              {/* Add address form */}
              {showAddForm && (
                <AddressForm
                  form={addrForm}
                  setField={setAddrField}
                  fieldErrors={addrFieldErrors}
                  loading={addrLoading}
                  onSave={saveAddress}
                  onCancel={() => {
                    setShowAddForm(false);
                    setAddrForm({ ...EMPTY_FORM });
                    setAddrFieldErrors({});
                  }}
                />
              )}

              {/* No addresses + no form */}
              {savedAddresses.length === 0 && !showAddForm && (
                <div className="border border-dashed border-gray-300 rounded-2xl p-8 text-center">
                  <p className="text-gray-500 text-sm mb-4">No saved addresses</p>
                  <button onClick={() => setShowAddForm(true)} className="bg-black text-white px-6 py-2.5 rounded-xl text-sm">
                    Add Address
                  </button>
                </div>
              )}
            </div>

            {/* Payment Method */}
            <div>
              <h2 className="text-xl font-semibold mb-4">Payment Method</h2>
              <div className="space-y-3">
                {[
                  { val: "COD", label: "Cash on Delivery", sub: "Pay when your order arrives" },
                  { val: "RAZORPAY", label: "Pay Online via Razorpay", sub: "UPI, Card, Net Banking, Wallet" },
                ].map(opt => (
                  <label
                    key={opt.val}
                    className={`flex items-center gap-3 border p-4 rounded-2xl cursor-pointer transition ${paymentMethod === opt.val ? "border-black bg-gray-50" : "border-gray-200 hover:border-gray-300"
                      }`}
                  >
                    <input
                      type="radio"
                      checked={paymentMethod === opt.val}
                      onChange={() => setPaymentMethod(opt.val as "COD" | "RAZORPAY")}
                      className="accent-black"
                    />
                    <div>
                      <div className="font-medium text-sm">{opt.label}</div>
                      <div className="text-xs text-gray-500">{opt.sub}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* ── RIGHT ── */}
          <div className="lg:col-span-2">
            <div className="bg-gray-50 border border-gray-200 rounded-3xl p-6 sticky top-24">
              <h3 className="font-semibold mb-5">Order Summary</h3>

              <div className="space-y-3 mb-5 max-h-64 overflow-auto">
                {cart.map((item, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="line-clamp-1 flex-1 pr-2 text-gray-700">{item.title} × {item.quantity}</span>
                    <span className="whitespace-nowrap font-medium">₹{(item.price * item.quantity).toLocaleString()}</span>
                  </div>
                ))}
              </div>

              <div className="border-t border-gray-200 pt-4 mb-6">
                <div className="flex justify-between font-semibold text-lg">
                  <span>Total</span>
                  <span>₹{subtotal.toLocaleString()}</span>
                </div>
                {paymentMethod === "COD" && (
                  <p className="text-xs text-gray-500 mt-1">+ Cash on Delivery</p>
                )}
              </div>

              {/* Error */}
              {errorMsg && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
                  ⚠ {errorMsg}
                </div>
              )}

              {/* Verifying */}
              {paymentState === "verifying" && (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-700">
                  Verifying your payment, please wait…
                </div>
              )}

              {/* CTA button */}
              {(paymentState === "idle" || paymentState === "failed") && (
                <button
                  onClick={processOrder}
                  disabled={!canCheckout}
                  className="w-full bg-black text-white py-4 rounded-2xl font-medium hover:bg-gray-900 disabled:bg-gray-400 transition"
                >
                  {paymentMethod === "COD" ? "Place Order (COD)" : "Pay Now with Razorpay"}
                </button>
              )}

              {paymentState === "creating_order" && (
                <button disabled className="w-full bg-gray-800 text-white py-4 rounded-2xl font-medium cursor-not-allowed flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Creating Order…
                </button>
              )}

              {paymentState === "awaiting_payment" && (
                <button disabled className="w-full bg-gray-800 text-white py-4 rounded-2xl font-medium cursor-not-allowed">
                  Complete Payment in Popup…
                </button>
              )}

              <p className="text-center text-xs text-gray-400 mt-4">
                🔒 Secure checkout
              </p>
            </div>
          </div>
        </div>
      </div>

      <WhatsappButton />
      <Footer />
    </div>
  );
}