import { NextRequest, NextResponse } from "next/server";
import { settle } from "@bit-gpt/h402/facilitator";
import { SettleResponse } from "@bit-gpt/h402/types";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { payload, paymentDetails } = body;

  if (!payload || !paymentDetails) {
    return NextResponse.json(
      {
        success: false,
        error: "payload and paymentDetails required",
      } as SettleResponse,
      { status: 400 }
    );
  }

  if (!process.env.PRIVATE_KEY) {
    return NextResponse.json(
      { success: false, error: "PRIVATE_KEY is not set" } as SettleResponse,
      { status: 500 }
    );
  }

  try {
    const settleResult = await settle(
      payload,
      paymentDetails,
      process.env.PRIVATE_KEY
    );

    if ("errorMessage" in settleResult) {
      return NextResponse.json(
        { success: false, error: settleResult.errorMessage } as SettleResponse,
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      content: "This is the secret protected content that requires payment!",
    } as SettleResponse);
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Payment settlement failed" } as SettleResponse,
      { status: 400 }
    );
  }
}
