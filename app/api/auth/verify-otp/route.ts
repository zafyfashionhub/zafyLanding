import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { verificationId, code } = await req.json();

    const res = await fetch("https://cpaas.messagecentral.com/verification/v3/validateOtp", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "authToken": process.env.MESSAGE_CENTRAL_API_KEY!,
      },
      body: JSON.stringify({
        verificationId,
        code,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json(
        { error: data?.message || "OTP invalid" },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });

  } catch (err) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}