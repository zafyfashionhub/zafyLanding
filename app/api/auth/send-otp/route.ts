import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { phone } = await req.json();

    // ✅ STEP 1: GET TOKEN
    const tokenRes = await fetch(
      `https://cpaas.messagecentral.com/auth/v1/authentication/token?customerId=${process.env.MESSAGE_CENTRAL_CUSTOMER_ID}&key=${process.env.MESSAGE_CENTRAL_KEY}&scope=NEW&country=91`,
      {
        method: "GET",
        headers: {
          accept: "*/*",
        },
      }
    );

    const tokenText = await tokenRes.text(); // 👈 IMPORTANT (json nahi)
    console.log("TOKEN RAW:", tokenText);

    const tokenData = JSON.parse(tokenText);
    const authToken = tokenData?.token;

    if (!authToken) {
      return NextResponse.json(
        { error: "Token generation failed" },
        { status: 500 }
      );
    }

    // ✅ STEP 2: SEND OTP
    const otpRes = await fetch(
      `https://cpaas.messagecentral.com/verification/v3/send?countryCode=91&flowType=SMS&mobileNumber=${phone}&type=SMS`,
      {
        method: "POST",
        headers: {
          authToken: authToken,
        },
      }
    );

    const otpText = await otpRes.text(); // 👈 IMPORTANT
    console.log("OTP RAW:", otpText);

    const otpData = JSON.parse(otpText);

    if (!otpRes.ok) {
      return NextResponse.json(
        { error: otpData?.message || "OTP failed" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      verificationId: otpData.data.verificationId,
    });

  } catch (err) {
    console.error("SEND OTP ERROR:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}