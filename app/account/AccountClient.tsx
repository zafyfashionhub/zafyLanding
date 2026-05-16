"use client";

import { useSession, signOut, signIn } from "next-auth/react";
import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import WhatsappButton from "@/components/WhatsappButton";

declare global { interface Window { Razorpay: any; } }

// ─── Types ────────────────────────────────────────────────────────────────────
interface UserProfile {
  id: number;
  name: string | null;
  email: string | null;
  phone: string | null;
  image: string | null;
  phoneVerified: boolean;
  createdAt: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getInitials(name: string | null, email: string | null): string {
  if (name) return name.trim().split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  if (email) return email[0].toUpperCase();
  return "U";
}

function isPlaceholder(email: string | null | undefined): boolean {
  if (!email) return true;
  return email.endsWith("@phone.zafy.internal") || email.endsWith("@zafy.local");
}

// ── Dynamically load Firebase (avoids SSR issues) ────────────────────────────
async function getFirebase() {
  const { initializeApp, getApps, getApp } = await import("firebase/app");
  const { getAuth, RecaptchaVerifier, signInWithPhoneNumber } = await import("firebase/auth");
  const cfg = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };
  const app = getApps().length ? getApp() : initializeApp(cfg);
  const auth = getAuth(app);
  return { auth, RecaptchaVerifier, signInWithPhoneNumber };
}

// ─── Status Badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    Delivered: "bg-green-100 text-green-700",
    Confirmed: "bg-green-100 text-green-700",
    Shipped: "bg-blue-100 text-blue-700",
    Processing: "bg-yellow-100 text-yellow-700",
    Pending: "bg-gray-100 text-gray-600",
    Cancelled: "bg-red-100 text-red-600",
  };
  return (
    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${map[status] ?? "bg-gray-100 text-gray-600"}`}>
      {status}
    </span>
  );
}

// ─── Edit Profile Modal ───────────────────────────────────────────────────────
function EditProfileModal({
  profile, onClose, onSave,
}: {
  profile: UserProfile;
  onClose: () => void;
  onSave: (u: Partial<UserProfile>) => void;
}) {
  const [name, setName] = useState(profile.name ?? "");
  const [email, setEmail] = useState(!isPlaceholder(profile.email) ? (profile.email ?? "") : "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true); setError(null);
    try {
      const body: Record<string, string> = {};
      const trimName = name.trim();
      const trimEmail = email.trim().toLowerCase();
      if (trimName && trimName !== (profile.name ?? "")) body.name = trimName;
      if (trimEmail && trimEmail !== (profile.email ?? "").toLowerCase()) body.email = trimEmail;
      if (!Object.keys(body).length) { onClose(); return; }

      const res = await fetch("/api/user/profile", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to save"); return; }
      onSave(body);
      onClose();
    } catch { setError("Network error. Please try again."); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm px-0 sm:px-4">
      <div className="bg-white w-full sm:max-w-md sm:rounded-3xl rounded-t-3xl shadow-2xl p-6 sm:p-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Edit Profile</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500 text-xl">&times;</button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">Full Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your full name"
              className="w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black transition" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">
              Email Address
              {isPlaceholder(profile.email) && <span className="ml-2 text-blue-500 normal-case font-normal">— Link to your account</span>}
            </label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your@email.com" type="email"
              className="w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black transition" />
          </div>
          {profile.phone && (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">Phone Number</label>
              <div className="w-full border border-gray-200 bg-gray-50 rounded-xl px-4 py-3 text-sm text-gray-500 flex items-center gap-2">
                <span>{profile.phone}</span>
                {profile.phoneVerified && <span className="ml-auto text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full font-medium">✓ Verified</span>}
              </div>
              <p className="text-xs text-gray-400 mt-1">Phone number cannot be changed here.</p>
            </div>
          )}
          {error && <div className="bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-3 rounded-xl">{error}</div>}
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 border rounded-xl py-3 text-sm font-medium hover:bg-gray-50 transition">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 bg-black text-white rounded-xl py-3 text-sm font-medium disabled:bg-gray-300 hover:bg-gray-900 transition">
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Add Phone Modal ──────────────────────────────────────────────────────────
function AddPhoneModal({ onClose, onSuccess }: {
  onClose: () => void;
  onSuccess: (phone: string) => void;
}) {
  const [step, setStep] = useState<"enter" | "otp">("enter");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timer, setTimer] = useState(0);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const confirmRef = useRef<any>(null);
  // ✅ FIX: ref inside component — not a module-level variable.
  // Module-level vars survive unmount/remount but the DOM element they
  // point to doesn't → RecaptchaVerifier holds a reference to a detached node.
  const verifierRef = useRef<any>(null);

  // ✅ FIX: cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      clearVerifier();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const clearVerifier = () => {
    try { verifierRef.current?.clear(); } catch { }
    verifierRef.current = null;
  };

  const startTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setTimer(30);
    timerRef.current = setInterval(() => {
      setTimer((t) => {
        if (t <= 1) { clearInterval(timerRef.current!); return 0; }
        return t - 1;
      });
    }, 1000);
  };

  const sendOtp = async () => {
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.length !== 10) {
      setError("Enter a valid 10-digit number");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { auth, RecaptchaVerifier, signInWithPhoneNumber } = await getFirebase();

      // 🔥 always reset
      clearVerifier();

      // AddPhoneModal ke andar sendOtp function mein:
      verifierRef.current = new RecaptchaVerifier(
        auth,
        "recaptcha-phone-modal",
        {
          size: "invisible", // Agar fir bhi fail ho, toh ise 'normal' karke test karo check karne ke liye
          callback: (_response: any) => {
            // reCAPTCHA solved
          },
          'expired-callback': () => {
            // Response expired
            clearVerifier();
          }
        }
      );

      // ✅ MUST
      await verifierRef.current.render();

      // ✅ ONLY ONE CALL (IMPORTANT)
      confirmRef.current = await signInWithPhoneNumber(
        auth,
        `+91${cleaned}`,
        verifierRef.current
      );

      setStep("otp");
      startTimer();

    } catch (err: any) {
      console.error("OTP SEND ERROR:", err);

      clearVerifier();

      if (err?.code === "auth/too-many-requests") {
        setError("Too many attempts. Please wait a few minutes.");
      } else if (err?.code === "auth/invalid-phone-number") {
        setError("Invalid phone number. Use a valid Indian mobile number.");
      } else {
        setError("Failed to send OTP. Please try again.");
      }

    } finally {
      setLoading(false);
    }
  };
  const verifyOtp = async () => {
    if (otp.length !== 6) { setError("Enter the 6-digit OTP"); return; }
    if (!confirmRef.current) { setError("Session expired. Please resend OTP."); setStep("enter"); return; }

    setLoading(true);
    setError(null);

    try {
      const result = await confirmRef.current.confirm(otp);
      const idToken = await result.user.getIdToken();

      const res = await fetch("/api/user/link-phone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });
      const data = await res.json();

      if (!res.ok) { setError(data.error ?? "Failed to link phone"); return; }

      const cleaned = phone.replace(/\D/g, "");
      onSuccess(`+91${cleaned}`);
      onClose();

    } catch (err: any) {
      console.error("OTP VERIFY ERROR:", err);
      setError(
        err?.code === "auth/invalid-verification-code" ? "Incorrect OTP. Please try again."
          : err?.code === "auth/code-expired" ? "OTP expired. Please resend."
            : "Verification failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm px-0 sm:px-4">
      <div className="bg-white w-full sm:max-w-md sm:rounded-3xl rounded-t-3xl shadow-2xl p-6 sm:p-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Add Phone Number</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500 text-xl">&times;</button>
        </div>

        {step === "enter" ? (
          <div className="space-y-4">
            <p className="text-sm text-gray-500">We'll send a one-time password to verify your number.</p>
            <div className="flex border border-gray-300 rounded-xl overflow-hidden focus-within:border-black transition">
              <span className="flex items-center px-3 text-sm text-gray-500 bg-gray-50 border-r border-gray-200 select-none">🇮🇳 +91</span>
              <input
                type="tel"
                inputMode="numeric"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                placeholder="10-digit mobile number"
                className="flex-1 px-3 py-3 text-sm focus:outline-none bg-white"
                autoFocus
              />
            </div>

            {error && <div className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</div>}

            <button onClick={sendOtp} disabled={loading || phone.length !== 10}
              className={`w-full py-3 rounded-xl text-sm font-medium transition ${phone.length === 10 && !loading ? "bg-black text-white hover:bg-gray-900" : "bg-gray-200 text-gray-400 cursor-not-allowed"
                }`}>
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                  Sending OTP…
                </span>
              ) : "Send OTP"}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-gray-500">
              OTP sent to <span className="font-medium text-black">+91 {phone}</span>{" · "}
              <button onClick={() => { setStep("enter"); setOtp(""); setError(null); }} className="text-blue-600 hover:underline text-sm">Change</button>
            </p>

            <input
              type="text"
              inputMode="numeric"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="Enter 6-digit OTP"
              maxLength={6}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-center text-lg tracking-[0.4em] font-medium focus:outline-none focus:border-black transition"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && verifyOtp()}
            />

            {error && <div className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</div>}

            <button onClick={verifyOtp} disabled={loading || otp.length !== 6}
              className={`w-full py-3 rounded-xl text-sm font-medium transition ${otp.length === 6 && !loading ? "bg-black text-white hover:bg-gray-900" : "bg-gray-200 text-gray-400 cursor-not-allowed"
                }`}>
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                  Verifying…
                </span>
              ) : "Verify & Link"}
            </button>

            <p className="text-center text-xs text-gray-400">
              {timer > 0
                ? <>Resend in <span className="font-medium text-gray-600">{timer}s</span></>
                : <button onClick={sendOtp} disabled={loading} className="text-black font-medium hover:underline">Resend OTP</button>
              }
            </p>
          </div>
        )}

        {/*
          ✅ KEY FIX: reCAPTCHA container is ALWAYS rendered — not inside a conditional.
          If it's inside step === "enter" block, it disappears when step changes to "otp".
          When user tries to resend OTP, verifier tries to attach to a non-existent node → crash.
          Keeping it here (always in DOM but hidden) means the node always exists.
        */}
        <div id="recaptcha-phone-modal" className="hidden" />
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AccountClient() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"orders" | "profile">("orders");
  const [editOpen, setEditOpen] = useState(false);
  const [phoneOpen, setPhoneOpen] = useState(false);
  const [payingOrderNumber, setPayingOrderNumber] = useState<string | null>(null);

  const rzpScriptLoaded = useRef(false);
  const rzpInstanceRef = useRef<any>(null);

  const fetchData = useCallback(async () => {
    try {
      const [pRes, oRes] = await Promise.all([
        fetch("/api/user/profile"),
        fetch("/api/orders"),
      ]);
      if (pRes.ok) setProfile(await pRes.json());
      if (oRes.ok) {
        const od = await oRes.json();
        setOrders(od.orders ?? []);
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (session?.user?.id) fetchData();
    else setLoading(false);
  }, [session, fetchData]);

  const ensureRazorpay = useCallback((): Promise<void> =>
    new Promise((resolve, reject) => {
      if (rzpScriptLoaded.current && window.Razorpay) return resolve();
      const s = document.createElement("script");
      s.src = "https://checkout.razorpay.com/v1/checkout.js";
      s.async = true;
      s.onload = () => { rzpScriptLoaded.current = true; resolve(); };
      s.onerror = () => reject(new Error("Razorpay load failed"));
      document.body.appendChild(s);
    }), []);

  const handlePayNow = async (orderNumber: string) => {
    setPayingOrderNumber(orderNumber);
    try {
      await ensureRazorpay();
      const res = await fetch("/api/payment/create-order", { method: "POST", body: JSON.stringify({ orderNumber }) });
      const rzpOrder = await res.json();
      rzpInstanceRef.current = new window.Razorpay({
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: rzpOrder.amount, currency: "INR", order_id: rzpOrder.id,
        handler: async (response: any) => {
          await fetch("/api/payment/verify", { method: "POST", body: JSON.stringify(response) });
          router.push(`/order-success?orderNumber=${orderNumber}`);
        },
      });
      rzpInstanceRef.current.open();
    } catch (err) { console.error(err); }
    finally { setPayingOrderNumber(null); }
  };

  // ── Derived ──
  const displayName = profile?.name ?? (session?.user?.name ?? null);
  const displayEmail = !isPlaceholder(profile?.email) ? (profile?.email ?? null) : null;
  const avatarUrl = (session?.user?.image as string | undefined) ?? profile?.image ?? null;
  const initials = getInitials(displayName, displayEmail);

  const handleProfileSave = (updates: Partial<UserProfile>) => {
    setProfile(prev => prev ? { ...prev, ...updates } : prev);
  };

  // ── Guards ──
  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center text-center px-6 py-20">
          <div>
            <p className="text-2xl text-gray-400 mb-6">Please login to view your account</p>
            <button onClick={() => signIn("google")} className="bg-black text-white px-8 py-3 rounded-xl text-sm font-medium">Login</button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const tabs = [
    { id: "orders" as const, label: "Orders" },
    { id: "profile" as const, label: "Profile" },
  ];

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Navbar />

      {editOpen && profile && (
        <EditProfileModal
          profile={profile}
          onClose={() => setEditOpen(false)}
          onSave={handleProfileSave}
        />
      )}
      {phoneOpen && (
        <AddPhoneModal
          onClose={() => setPhoneOpen(false)}
          onSuccess={(phone) => setProfile((p) => p ? { ...p, phone, phoneVerified: true } : p)}
        />
      )}

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <h1 className="text-3xl sm:text-4xl font-light mb-8">My Account</h1>

        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">

          {/* ── Sidebar ── */}
          <aside className="w-full lg:w-64 xl:w-72 shrink-0">
            <div className="border rounded-3xl p-6 lg:sticky lg:top-24">

              {/* Avatar + info */}
              <div className="flex flex-col items-center pb-5 border-b mb-4">
                <div className="w-20 h-20 rounded-full overflow-hidden bg-black flex items-center justify-center text-white text-2xl font-semibold mb-3 ring-4 ring-gray-100">
                  {avatarUrl
                    ? <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    : <span>{initials}</span>
                  }
                </div>
                <div className="font-semibold text-base text-center leading-snug">{displayName ?? "User"}</div>
                {displayEmail && <div className="text-xs text-gray-400 mt-0.5 break-all text-center">{displayEmail}</div>}
                {profile?.phone && <div className="text-xs text-gray-400 mt-0.5">{profile.phone}</div>}
              </div>

              {/* Mobile: tab pills */}
              <div className="flex lg:hidden gap-2 mb-4">
                {tabs.map(({ id, label }) => (
                  <button key={id} onClick={() => setActiveTab(id)}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition ${activeTab === id ? "bg-black text-white" : "border text-gray-600 hover:bg-gray-50"}`}>
                    {label}
                  </button>
                ))}
              </div>

              {/* Desktop: vertical nav */}
              <nav className="hidden lg:flex flex-col gap-1">
                {tabs.map(({ id, label }) => (
                  <button key={id} onClick={() => setActiveTab(id)}
                    className={`w-full text-left px-3 py-2.5 rounded-xl text-sm transition ${activeTab === id ? "bg-black text-white font-medium" : "text-gray-600 hover:bg-gray-50"}`}>
                    {label}
                  </button>
                ))}
                <button onClick={() => router.push("/account/addresses")} className="w-full text-left px-3 py-2.5 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition">Addresses</button>
                <button onClick={() => router.push("/account/wishlist")} className="w-full text-left px-3 py-2.5 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition">Wishlist</button>
                <div className="border-t my-2" />
                <button onClick={() => signOut({ callbackUrl: "/" })} className="w-full text-left px-3 py-2.5 rounded-xl text-sm text-red-500 hover:bg-red-50 transition">Logout</button>
              </nav>

              {/* Mobile: extra links */}
              <div className="flex lg:hidden flex-col gap-1 border-t pt-3">
                <button onClick={() => router.push("/account/addresses")} className="w-full text-left px-3 py-2 rounded-xl text-sm text-gray-600 hover:bg-gray-50">Addresses</button>
                <button onClick={() => router.push("/account/wishlist")} className="w-full text-left px-3 py-2 rounded-xl text-sm text-gray-600 hover:bg-gray-50">Wishlist</button>
                <button onClick={() => signOut({ callbackUrl: "/" })} className="w-full text-left px-3 py-2 rounded-xl text-sm text-red-500 hover:bg-red-50">Logout</button>
              </div>
            </div>
          </aside>

          {/* ── Content ── */}
          <div className="flex-1 min-w-0">

            {/* ══ PROFILE ══ */}
            {activeTab === "profile" && (
              <div>
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-xl sm:text-2xl font-light">Profile Information</h2>
                  <button onClick={() => setEditOpen(true)} className="border px-4 py-2 rounded-xl text-sm font-medium hover:bg-gray-50 transition">Edit</button>
                </div>

                {/* Incomplete banner */}
                {(!displayName || !displayEmail || !profile?.phone) && (
                  <div className="mb-5 bg-amber-50 border border-amber-100 rounded-2xl px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <div className="font-medium text-sm text-amber-800">Complete your profile</div>
                      <div className="text-xs text-amber-600 mt-0.5">
                        Missing: {[!displayName && "name", !displayEmail && "email", !profile?.phone && "phone"].filter(Boolean).join(", ")}
                      </div>
                    </div>
                    <button onClick={() => setEditOpen(true)} className="self-start sm:self-auto bg-amber-800 text-white text-xs px-4 py-2 rounded-xl whitespace-nowrap hover:bg-amber-900 transition">
                      Update Now
                    </button>
                  </div>
                )}

                <div className="border rounded-3xl overflow-hidden divide-y">
                  {/* Name */}
                  <div className="px-5 sm:px-6 py-4 flex items-start justify-between gap-4">
                    <div>
                      <div className="text-xs text-gray-400 mb-0.5 uppercase tracking-wide">Full Name</div>
                      <div className={`font-medium text-sm sm:text-base ${!displayName ? "text-gray-400 italic" : ""}`}>{displayName ?? "Not set"}</div>
                    </div>
                    <button onClick={() => setEditOpen(true)} className="text-xs text-blue-600 hover:underline shrink-0 mt-1">Edit</button>
                  </div>

                  {/* Email */}
                  <div className="px-5 sm:px-6 py-4 flex items-start justify-between gap-4">
                    <div>
                      <div className="text-xs text-gray-400 mb-0.5 uppercase tracking-wide">Email Address</div>
                      <div className={`font-medium text-sm sm:text-base ${!displayEmail ? "text-gray-400 italic" : ""}`}>{displayEmail ?? "Not set"}</div>
                      {!displayEmail && <div className="text-xs text-blue-600 mt-0.5">Add email to receive order updates</div>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0 mt-1">
                      {displayEmail && <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full font-medium">✓ Linked</span>}
                      <button onClick={() => setEditOpen(true)} className="text-xs text-blue-600 hover:underline">{displayEmail ? "Edit" : "Add"}</button>
                    </div>
                  </div>

                  {/* Phone */}
                  <div className="px-5 sm:px-6 py-4 flex items-start justify-between gap-4">
                    <div>
                      <div className="text-xs text-gray-400 mb-0.5 uppercase tracking-wide">Phone Number</div>
                      <div className={`font-medium text-sm sm:text-base ${!profile?.phone ? "text-gray-400 italic" : ""}`}>{profile?.phone ?? "Not set"}</div>
                      {!profile?.phone && <div className="text-xs text-blue-600 mt-0.5">Add phone for OTP login</div>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0 mt-1">
                      {profile?.phone && (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${profile.phoneVerified ? "text-green-600 bg-green-50" : "text-yellow-600 bg-yellow-50"}`}>
                          {profile.phoneVerified ? "✓ Verified" : "Unverified"}
                        </span>
                      )}
                      {!profile?.phone && (
                        <button onClick={() => setPhoneOpen(true)} className="text-xs text-blue-600 hover:underline">Add</button>
                      )}
                    </div>
                  </div>

                  {/* Member since */}
                  <div className="px-5 sm:px-6 py-4">
                    <div className="text-xs text-gray-400 mb-0.5 uppercase tracking-wide">Member Since</div>
                    <div className="font-medium text-sm sm:text-base">
                      {profile?.createdAt
                        ? new Date(profile.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })
                        : "—"}
                    </div>
                  </div>
                </div>

                {/* Quick links */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
                  {[
                    { label: "Manage Addresses", sub: "Add or edit delivery addresses", href: "/account/addresses", icon: "📍" },
                    { label: "Your Wishlist", sub: "Products saved for later", href: "/account/wishlist", icon: "❤️" },
                  ].map(({ label, sub, href, icon }) => (
                    <button key={href} onClick={() => router.push(href)}
                      className="border rounded-2xl p-5 text-left hover:shadow-sm hover:border-gray-300 transition">
                      <div className="text-2xl mb-2">{icon}</div>
                      <div className="font-medium text-sm">{label}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{sub}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ══ ORDERS ══ */}
            {activeTab === "orders" && (
              <div>
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-xl sm:text-2xl font-light">Your Orders</h2>
                  <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">{orders.length} Orders</span>
                </div>

                {orders.length === 0 ? (
                  <div className="border rounded-3xl p-10 sm:p-16 text-center">
                    <div className="text-6xl mb-4">📦</div>
                    <p className="text-gray-400 text-lg mb-6">No orders yet</p>
                    <button onClick={() => router.push("/")} className="bg-black text-white px-8 py-3 rounded-xl text-sm font-medium hover:bg-gray-900 transition">
                      Start Shopping
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {orders.map((order) => (
                      <div key={order.id} className="border rounded-3xl p-5 sm:p-6 hover:shadow-sm transition">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-semibold text-sm">#{order.orderNumber}</span>
                              <StatusBadge status={order.status} />
                              {order.paymentStatus === "PENDING" && (
                                <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-orange-100 text-orange-700">Payment Pending</span>
                              )}
                              {order.paymentStatus === "PAID" && (
                                <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-green-100 text-green-700">Paid ✓</span>
                              )}
                            </div>
                            {order.createdAt && (
                              <div className="text-xs text-gray-400 mt-1">
                                {new Date(order.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                              </div>
                            )}
                          </div>
                          <div className="text-lg sm:text-xl font-semibold shrink-0">₹{Number(order.finalAmount).toLocaleString("en-IN")}</div>
                        </div>

                        {order.items?.length > 0 && (
                          <div className="mt-4 border-t pt-4 space-y-2">
                            {order.items.slice(0, 2).map((item: any) => (
                              <div key={item.id} className="flex justify-between text-sm">
                                <span className="line-clamp-1 pr-4 text-gray-700">{item.title} × {item.quantity}</span>
                                <span className="text-gray-600 shrink-0">₹{Number(item.subtotal).toLocaleString("en-IN")}</span>
                              </div>
                            ))}
                            {order.items.length > 2 && <div className="text-xs text-gray-400">+ {order.items.length - 2} more item(s)</div>}
                          </div>
                        )}

                        {order.trackingEvents?.length > 0 && (
                          <div className="mt-3 bg-green-50 text-green-700 text-xs px-4 py-2.5 rounded-xl">
                            📍 {order.trackingEvents[0]?.message || order.trackingEvents[0]?.status || "Processing"}
                          </div>
                        )}

                        <div className="flex flex-wrap gap-3 mt-5">
                          <button onClick={() => router.push(`/track/${order.orderNumber}`)} className="border px-4 py-2 rounded-xl text-sm font-medium hover:bg-gray-50 transition">
                            Track Order
                          </button>
                          {order.paymentStatus === "PENDING" && (
                            <button onClick={() => handlePayNow(order.orderNumber)} disabled={payingOrderNumber === order.orderNumber}
                              className="bg-black text-white px-5 py-2 rounded-xl text-sm font-medium disabled:bg-gray-300 hover:bg-gray-900 transition">
                              {payingOrderNumber === order.orderNumber ? "Opening…" : "Pay Now"}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      </main>

      <WhatsappButton />
      <Footer />
    </div>
  );
}