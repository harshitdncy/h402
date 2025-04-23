import { NextRequest, NextResponse } from "next/server";
import { verify } from "@bit-gpt/h402/dist/src/facilitator";
import { createPublicClient } from "@bit-gpt/h402/dist/src/shared/evm/wallet";
import { VerifyResponse } from "@bit-gpt/h402/dist/src/types";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { payload, paymentDetails } = body;

  if (!payload || !paymentDetails) {
    return NextResponse.json(
      {
        isValid: false,
        errorMessage: "payload and paymentDetails required",
      } as VerifyResponse,
      { status: 400 }
    );
  }

  try {
    const publicClient = createPublicClient(paymentDetails.chainId);

    // Verify the payment with the facilitator
    const verificationResult = await verify(
      publicClient,
      payload,
      paymentDetails
    );

    if (!verificationResult.isValid && "errorMessage" in verificationResult) {
      return NextResponse.json(verificationResult, { status: 400 });
    }

    return NextResponse.json(verificationResult);
  } catch (error) {
    return NextResponse.json(
      {
        isValid: false,
        errorMessage: "Payment verification failed",
      } as VerifyResponse,
      { status: 400 }
    );
  }
}
