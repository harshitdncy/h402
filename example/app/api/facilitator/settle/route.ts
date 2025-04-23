import { NextRequest, NextResponse } from "next/server";
import { settle } from "@bit-gpt/h402/dist/src/facilitator";
import { createSignerClient } from "@bit-gpt/h402/dist/src/shared/evm/wallet";
import { SettleResponse } from "@bit-gpt/h402/dist/src/types";

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
    const signerClient = createSignerClient(
      paymentDetails.chainId,
      process.env.PRIVATE_KEY
    );

    // Settle the payment
    const settleResult = await settle(signerClient, payload, paymentDetails);

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
