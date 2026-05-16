// app/api/user/profile/route.ts
// GET  → fetch current user profile
// PATCH → update name / email / phone

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/app/api/auth/[...nextauth]/route";

// ─── GET ──────────────────────────────────────────────────────────────────────
export async function GET() {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = parseInt(session.user.id as string);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id:            true,
      name:          true,
      email:         true,
      phone:         true,
      image:         true,
      phoneVerified: true,
      createdAt:     true,
    },
  });

  if (!user)
    return NextResponse.json({ error: "User not found" }, { status: 404 });

  // Hide internal placeholder emails from frontend
  const isPlaceholderEmail =
    user.email?.endsWith("@phone.zafy.internal") ||
    user.email?.endsWith("@zafy.local");

  return NextResponse.json({
    ...user,
    email: isPlaceholderEmail ? null : user.email,
  });
}

// ─── PATCH ─────────────────────────────────────────────────────────────────────
export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = parseInt(session.user.id as string);
  const body   = await req.json();

  const { name, email } = body as { name?: string; email?: string };

  // Basic validation
  if (name !== undefined && name.trim().length < 2)
    return NextResponse.json({ error: "Name must be at least 2 characters" }, { status: 400 });

  if (email !== undefined) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim()))
      return NextResponse.json({ error: "Invalid email address" }, { status: 400 });

    // Check if email already taken by someone else
    const existing = await prisma.user.findFirst({
      where: { email: email.trim().toLowerCase(), NOT: { id: userId } },
    });
    if (existing)
      return NextResponse.json({ error: "Email already in use" }, { status: 409 });
  }

  const updateData: Record<string, string> = {};
  if (name  !== undefined) updateData.name  = name.trim();
  if (email !== undefined) updateData.email = email.trim().toLowerCase();

  const updated = await prisma.user.update({
    where: { id: userId },
    data:  updateData,
    select: {
      id:    true,
      name:  true,
      email: true,
      phone: true,
      image: true,
    },
  });

  const isPlaceholderEmail =
    updated.email?.endsWith("@phone.zafy.internal") ||
    updated.email?.endsWith("@zafy.local");

  return NextResponse.json({
    ...updated,
    email: isPlaceholderEmail ? null : updated.email,
  });
}