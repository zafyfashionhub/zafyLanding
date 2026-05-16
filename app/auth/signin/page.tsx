// app/auth/signin/page.tsx
"use client";


export default function SignInPage() {
  return null;
}


// import { signIn, useSession } from "next-auth/react";
// import { useRouter, useSearchParams } from "next/navigation";
// import { useEffect, useState, Suspense } from "react";
// import Link from "next/link";
// // import { firebaseAuth } from "@/lib/firebase-client";
// import { RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";

// // ── Sanitize callbackUrl: never redirect back to the signin page itself ───────
// function getSafeCallbackUrl(raw: string | null): string {
//   if (!raw) return "/account";
//   try {
//     // Decode all layers of nesting
//     let url = raw;
//     for (let i = 0; i < 5; i++) {
//       const decoded = decodeURIComponent(url);
//       if (decoded === url) break;
//       url = decoded;
//     }
//     // Strip everything back to the root destination (no more nesting)
//     // If it contains /auth/signin anywhere, just go to /account
//     if (url.includes("/auth/signin")) return "/account";
//     // Only allow relative paths or same-origin
//     if (url.startsWith("http")) {
//       const parsed = new URL(url);
//       return parsed.pathname + parsed.search;
//     }
//     return url;
//   } catch {
//     return "/account";
//   }
// }

// // ── Inner component (needs Suspense for useSearchParams) ──────────────────────
// function SignInContent() {
//   const { status } = useSession();
//   const router      = useRouter();
//   const searchParams = useSearchParams();

//   // ✅ FIX 1: Sanitize callbackUrl on the way in — no more nesting
//   const callbackUrl = getSafeCallbackUrl(searchParams.get("callbackUrl"));

//   const [loading, setLoading]         = useState(false);
//   const [error,   setError]           = useState("");
//   const [phone,   setPhone]           = useState("");
//   const [otp,     setOtp]             = useState("");
//   const [step,    setStep]            = useState<"phone" | "otp">("phone");
//   const [otpSent, setOtpSent]         = useState(false); // prevent double-send
//   const [confirmation, setConfirmation] = useState<any>(null);
//   const [countdown,   setCountdown]   = useState(0);

//   // Already logged in → redirect away immediately
//   useEffect(() => {
//     if (status === "authenticated") {
//       window.location.href = callbackUrl; // full navigation, not router
//     }
//   }, [status, callbackUrl]);

//   // Countdown timer for resend OTP
//   useEffect(() => {
//     if (countdown <= 0) return;
//     const t = setTimeout(() => setCountdown(c => c - 1), 1000);
//     return () => clearTimeout(t);
//   }, [countdown]);

//   // ── Google ──────────────────────────────────────────────────────────────────
//   const handleGoogle = async () => {
//     setLoading(true);
//     setError("");
//     try {
//       // Let NextAuth handle the redirect entirely — no manual router call
//       await signIn("google", { callbackUrl });
//     } catch {
//       setError("Failed to sign in. Please try again.");
//       setLoading(false);
//     }
//   };

//   // ── Send OTP ─────────────────────────────────────────────────────────────────
//   const sendOTP = async () => {
//     if (otpSent && countdown > 0) return;
//     setError("");
//     setLoading(true);
//     try {
//       // Reuse or create reCAPTCHA verifier
//       if (!(window as any).recaptchaVerifier) {
//         (window as any).recaptchaVerifier = new RecaptchaVerifier(
//           firebaseAuth,
//           "recaptcha-container",
//           { size: "invisible" }
//         );
//       }

//       const result = await signInWithPhoneNumber(
//         firebaseAuth,
//         `+91${phone}`,
//         (window as any).recaptchaVerifier
//       );

//       setConfirmation(result);
//       setStep("otp");
//       setOtpSent(true);
//       setCountdown(30); // 30s before resend allowed
//     } catch (err: any) {
//       console.error("sendOTP error:", err);
//       // Reset verifier on error so next attempt gets a fresh one
//       (window as any).recaptchaVerifier = null;
//       if (err?.code === "auth/too-many-requests") {
//         setError("Too many attempts. Please wait a few minutes and try again.");
//       } else {
//         setError("Failed to send OTP. Check the number and try again.");
//       }
//     } finally {
//       setLoading(false);
//     }
//   };

//   // ── Verify OTP ───────────────────────────────────────────────────────────────
//   const verifyOTP = async () => {
//     if (!confirmation || otp.length < 6) return;
//     setError("");
//     setLoading(true);
//     try {
//       // 1. Verify OTP with Firebase
//       const result  = await confirmation.confirm(otp);
//       const idToken = await result.user.getIdToken();

//       // 2. Exchange Firebase idToken for our proof token
//       const res  = await fetch("/api/auth/phone-signin", {
//         method:  "POST",
//         headers: { "Content-Type": "application/json" },
//         body:    JSON.stringify({ idToken }),
//       });
//       const data = await res.json();

//       if (!res.ok || !data.proofToken) {
//         throw new Error(data.error || "Server error during login");
//       }

//       // 3. Sign in via NextAuth credentials provider
//       const signInResult = await signIn("phone", {
//         proofToken: data.proofToken,
//         redirect:   false, // handle redirect manually
//       });

//       if (signInResult?.error) {
//         throw new Error("Login verification failed. Please try again.");
//       }

//       // ✅ FIX 2: Use window.location.href instead of router.replace.
//       // router.replace() uses the stale Next.js router cache which doesn't
//       // know about the new session yet → middleware sees no session → loops.
//       // A full page navigation forces the browser to re-fetch everything
//       // including the session cookie, breaking the redirect loop.
//       window.location.href = callbackUrl;

//     } catch (err: any) {
//       console.error("verifyOTP error:", err);
//       setError(err.message || "Invalid OTP. Please try again.");
//       setLoading(false);
//     }
//   };

//   // ── Loading / already authenticated ─────────────────────────────────────────
//   if (status === "loading" || status === "authenticated") {
//     return (
//       <div className="min-h-screen flex items-center justify-center bg-white">
//         <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin" />
//       </div>
//     );
//   }

//   // ── UI ───────────────────────────────────────────────────────────────────────
//   return (
//     <div className="min-h-screen bg-white flex flex-col">

//       {/* Header */}
//       <header className="border-b border-gray-200 py-4 px-6">
//         <Link href="/" className="flex items-center justify-center">
//           <span className="text-2xl font-bold tracking-tight">ZAFY FASHION</span>
//         </Link>
//       </header>

//       <main className="flex-1 flex items-center justify-center px-4 py-12">
//         <div className="w-full max-w-sm">
//           <div className="border border-gray-200 rounded-3xl p-8 shadow-sm">

//             {/* Title */}
//             <div className="text-center mb-8">
//               <h1 className="text-2xl font-semibold text-gray-900">Sign in</h1>
//               <p className="text-gray-500 text-sm mt-2">
//                 {callbackUrl.includes("checkout")
//                   ? "Login to complete your order"
//                   : "Access your account, orders & wishlist"}
//               </p>
//             </div>

//             {/* Checkout context banner */}
//             {callbackUrl.includes("checkout") && (
//               <div className="mb-6 p-3 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-800 text-center">
//                 🛒 Your cart is saved — login to place your order
//               </div>
//             )}

//             {/* Error */}
//             {error && (
//               <div className="mb-5 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 text-center">
//                 ⚠ {error}
//               </div>
//             )}

//             {/* ── Google ── */}
//             <button
//               onClick={handleGoogle}
//               disabled={loading}
//               className={`w-full flex items-center justify-center gap-3 border border-gray-300 rounded-2xl py-3.5 px-4 text-sm font-medium transition
//                 ${loading ? "bg-gray-100 text-gray-400 cursor-not-allowed" : "bg-white hover:bg-gray-50 text-gray-700"}`}
//             >
//               {loading ? (
//                 <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
//               ) : (
//                 <svg width="20" height="20" viewBox="0 0 24 24">
//                   <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
//                   <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
//                   <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
//                   <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
//                 </svg>
//               )}
//               {loading ? "Signing in…" : "Continue with Google"}
//             </button>

//             {/* Divider */}
//             <div className="flex items-center gap-3 my-5">
//               <div className="flex-1 h-px bg-gray-200" />
//               <span className="text-xs text-gray-400">or</span>
//               <div className="flex-1 h-px bg-gray-200" />
//             </div>

//             {/* ── Phone: enter number ── */}
//             {step === "phone" && (
//               <div className="space-y-3">
//                 <div className="flex border border-gray-300 rounded-xl overflow-hidden focus-within:border-black transition">
//                   <span className="flex items-center px-3 text-sm text-gray-500 bg-gray-50 border-r border-gray-300 select-none">
//                     🇮🇳 +91
//                   </span>
//                   <input
//                     type="tel"
//                     inputMode="numeric"
//                     placeholder="10-digit mobile number"
//                     value={phone}
//                     maxLength={10}
//                     onChange={e => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
//                     onKeyDown={e => e.key === "Enter" && phone.length === 10 && sendOTP()}
//                     className="flex-1 px-3 py-3 text-sm focus:outline-none bg-white"
//                   />
//                 </div>
//                 <button
//                   onClick={sendOTP}
//                   disabled={phone.length !== 10 || loading}
//                   className={`w-full py-3 rounded-xl text-sm font-medium transition ${
//                     phone.length === 10 && !loading
//                       ? "bg-black text-white hover:bg-gray-900"
//                       : "bg-gray-200 text-gray-400 cursor-not-allowed"
//                   }`}
//                 >
//                   {loading ? (
//                     <span className="flex items-center justify-center gap-2">
//                       <span className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
//                       Sending OTP…
//                     </span>
//                   ) : "Continue with Phone"}
//                 </button>
//               </div>
//             )}

//             {/* ── Phone: enter OTP ── */}
//             {step === "otp" && (
//               <div className="space-y-3">
//                 <p className="text-xs text-gray-500 text-center">
//                   OTP sent to <span className="font-medium text-black">+91 {phone}</span>
//                   {" · "}
//                   <button
//                     onClick={() => { setStep("phone"); setOtp(""); setError(""); setOtpSent(false); }}
//                     className="text-blue-600 hover:underline"
//                   >
//                     Change
//                   </button>
//                 </p>

//                 <input
//                   type="text"
//                   inputMode="numeric"
//                   placeholder="Enter 6-digit OTP"
//                   value={otp}
//                   maxLength={6}
//                   onChange={e => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
//                   onKeyDown={e => e.key === "Enter" && otp.length === 6 && verifyOTP()}
//                   className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm text-center tracking-[0.3em] text-lg font-medium focus:outline-none focus:border-black transition"
//                   autoFocus
//                 />

//                 <button
//                   onClick={verifyOTP}
//                   disabled={otp.length !== 6 || loading}
//                   className={`w-full py-3 rounded-xl text-sm font-medium transition ${
//                     otp.length === 6 && !loading
//                       ? "bg-black text-white hover:bg-gray-900"
//                       : "bg-gray-200 text-gray-400 cursor-not-allowed"
//                   }`}
//                 >
//                   {loading ? (
//                     <span className="flex items-center justify-center gap-2">
//                       <span className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
//                       Verifying…
//                     </span>
//                   ) : "Verify & Login"}
//                 </button>

//                 {/* Resend OTP */}
//                 <p className="text-center text-xs text-gray-400">
//                   {countdown > 0 ? (
//                     <>Resend OTP in <span className="font-medium text-gray-600">{countdown}s</span></>
//                   ) : (
//                     <button
//                       onClick={sendOTP}
//                       className="text-black font-medium hover:underline"
//                     >
//                       Resend OTP
//                     </button>
//                   )}
//                 </p>
//               </div>
//             )}

//             {/* reCAPTCHA container — invisible, must be in DOM */}
//             <div id="recaptcha-container" />

//             {/* Trust signals */}
//             <div className="mt-6 space-y-2 border-t border-gray-100 pt-5">
//               {[
//                 { icon: "🔒", text: "Your data is encrypted & secure" },
//                 { icon: "📦", text: "Track all your orders in one place" },
//                 { icon: "❤️", text: "Save your wishlist & addresses" },
//               ].map(item => (
//                 <div key={item.text} className="flex items-center gap-3 text-xs text-gray-400">
//                   <span>{item.icon}</span>
//                   <span>{item.text}</span>
//                 </div>
//               ))}
//             </div>
//           </div>

//           <div className="mt-6 text-center space-y-2">
//             <p className="text-xs text-gray-400">
//               By continuing, you agree to our{" "}
//               <Link href="/terms" className="underline">Terms</Link>
//               {" "}and{" "}
//               <Link href="/privacy" className="underline">Privacy Policy</Link>
//             </p>
//             <Link href="/" className="block text-xs text-gray-500 hover:text-black transition">
//               ← Back to shopping
//             </Link>
//           </div>
//         </div>
//       </main>

//       <footer className="border-t border-gray-100 py-4 text-center">
//         <p className="text-xs text-gray-400">© {new Date().getFullYear()} Zafy Fashion. All rights reserved.</p>
//       </footer>
//     </div>
//   );
// }

// // ── Wrapper with Suspense (required for useSearchParams) ─────────────────────
// export default function SignInPage() {
//   return (
//     <Suspense fallback={
//       <div className="min-h-screen flex items-center justify-center bg-white">
//         <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin" />
//       </div>
//     }>
//       <SignInContent />
//     </Suspense>
//   );
// }