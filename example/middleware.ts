import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { useFacilitator } from "@bit-gpt/h402";
import { paymentDetails } from "./config/paymentDetails";

export async function middleware(request: NextRequest) {
  if (request.nextUrl.pathname === "/resource") {
    const paymentHeader = request.nextUrl.searchParams.get("h402");

    if (!paymentHeader) {
      return NextResponse.json({ error: "Payment Required" }, { status: 402 });
    }

    const { verify, settle } = useFacilitator(
      "http://localhost:3000/api/facilitator"
    );

    const { data: verifyData, error: verifyError } = await verify(
      paymentHeader,
      paymentDetails
    );

    if (verifyError) {
      return NextResponse.json({ error: verifyError }, { status: 402 });
    }

    console.log(verifyData);

    const { data: settleData, error: settleError } = await settle(
      paymentHeader,
      paymentDetails
    );

    if (settleError) {
      return NextResponse.json({ error: settleError }, { status: 402 });
    }

    console.log(settleData);

    // After successful verification and settlement, redirect to clean URL
    if (request.nextUrl.searchParams.has("h402")) {
      const cleanUrl = request.nextUrl.clone();
      cleanUrl.searchParams.delete("h402");
      return NextResponse.redirect(cleanUrl);
    }

    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/resource",
};
