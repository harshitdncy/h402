import { NextRequest, NextResponse } from "next/server";
import { verify } from "@bit-gpt/h402/facilitator";
import { FacilitatorResponse, VerifyResponse } from "@bit-gpt/h402/types";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { payload, paymentDetails } = body;

  if (!payload || !paymentDetails) {
    return NextResponse.json(
      {
        data: {
          isValid: false,
          errorMessage: "payload and paymentDetails required",
        },
        error: "payload and paymentDetails required",
      } as FacilitatorResponse<VerifyResponse>,
      { status: 400 }
    );
  }

  try {
    const verificationResult = await verify(payload, paymentDetails);

    if (!verificationResult.isValid && "errorMessage" in verificationResult) {
      return NextResponse.json(verificationResult, { status: 400 });
    }

    return NextResponse.json({
      data: verificationResult,
      error: undefined,
    } as FacilitatorResponse<VerifyResponse>);
  } catch {
    return NextResponse.json(
      {
        data: {
          isValid: false,
          errorMessage: "Payment verification failed",
        },
        error: "Payment verification failed",
      } as FacilitatorResponse<VerifyResponse>,
      { status: 400 }
    );
  }
}
