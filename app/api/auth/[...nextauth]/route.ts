// app/api/auth/[...nextauth]/route.ts

import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { createHmac, timingSafeEqual } from "crypto";

// ─────────────────────────────────────────────────────────
// 🔒 VERIFY PROOF TOKEN (PHONE LOGIN)
// ─────────────────────────────────────────────────────────
function verifyProofToken(token: string) {
  try {
    const raw       = Buffer.from(token, "base64url").toString();
    const lastColon = raw.lastIndexOf(":");
    const payload   = raw.slice(0, lastColon);
    const sig       = raw.slice(lastColon + 1);

    const expected = createHmac("sha256", process.env.NEXTAUTH_SECRET!)
      .update(payload)
      .digest("hex");

    const a = Buffer.from(sig,      "hex");
    const b = Buffer.from(expected, "hex");
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

    const parts  = payload.split(":");
    if (parts.length < 3) return null;

    const exp    = parts[parts.length - 1];
    const userId = parts[0];
    const phone  = parts.slice(1, -1).join(":");

    if (Date.now() > Number(exp)) return null;

    return { userId: Number(userId), phone };
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────
// 🚀 NEXTAUTH CONFIG
// ─────────────────────────────────────────────────────────
export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),

  providers: [

    // ── GOOGLE ────────────────────────────────────────────
    Google({
      clientId:     process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
    }),

    // ── EMAIL + PASSWORD ──────────────────────────────────
    Credentials({
      id:   "credentials",   // ✅ explicit id required when 2 Credentials providers exist
      name: "Email",
      credentials: {
        email:    { label: "Email",    type: "email"    },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Please provide email and password");
        }

        const user = await prisma.user.findUnique({
          where: { email: (credentials.email as string).toLowerCase() },
        });

        if (!user || !user.passwordHash) {
          throw new Error("No account found with this email");
        }

        const valid = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash
        );
        if (!valid) throw new Error("Invalid password");

        return {
          id:    user.id.toString(),
          email: user.email ?? "",
          name:  user.name  ?? "",
          image: user.image ?? null,
          role:  user.role,
        };
      },
    }),

    // ── PHONE (Firebase OTP) ──────────────────────────────
    Credentials({
      id:   "phone",         // ✅ distinct id — without this, the second Credentials
      name: "Phone",         //    provider silently overwrites the first one
      credentials: {
        proofToken: { label: "Proof Token", type: "text" },
      },
      async authorize(creds) {
        if (!creds?.proofToken) return null;

        const data = verifyProofToken(creds.proofToken as string);
        if (!data) {
          console.error("[phone] invalid or expired proofToken");
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { id: data.userId },
        });
        if (!user) {
          console.error("[phone] user not found:", data.userId);
          return null;
        }
        if (user.phone !== data.phone) {
          console.error("[phone] phone mismatch");
          return null;
        }

        return {
          id:    user.id.toString(),
          name:  user.name  ?? "User",
          // ✅ NextAuth requires a non-null email in the returned object.
          // Phone-only users have no email — use a stable placeholder.
          // This is never stored (JWT strategy), just satisfies NextAuth's type check.
          email: user.email ?? `${user.id}@phone.zafy.internal`,
          image: user.image ?? null,
          role:  user.role,
          phone: user.phone,
        };
      },
    }),
  ],

  pages: {
    signIn: "/auth/signin",
    error:  "/auth/signin",
  },

  session: { strategy: "jwt" },

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id    = user.id;
        token.role  = (user as any).role  ?? "customer";
        token.phone = (user as any).phone ?? null;
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id    = token.id;
        (session.user as any).role  = token.role;
        (session.user as any).phone = token.phone;
      }
      return session;
    },

    // ✅ KEY FIX: stop NextAuth from ever using /auth/signin as a redirect target.
    // Without this, a failed signIn sets callbackUrl=/auth/signin → next page load
    // wraps it again → URL grows infinitely → permanent redirect loop.
    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) {
        if (url.startsWith("/auth/signin")) return `${baseUrl}/account`;
        return `${baseUrl}${url}`;
      }
      if (url.startsWith(baseUrl)) {
        const path = url.slice(baseUrl.length);
        if (path.startsWith("/auth/signin")) return `${baseUrl}/account`;
        return url;
      }
      return baseUrl;
    },
  },

  secret: process.env.NEXTAUTH_SECRET,
});


export const { GET, POST } = handlers;