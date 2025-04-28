import { h402Middleware } from "@bit-gpt/h402/next";
import { paymentDetails } from "./config/paymentDetails";
import { NextResponse } from "next/server";

export const middleware = h402Middleware({
  routes: ["/api/create-image"],
  paywallRoute: "/",
  paymentDetails,
  facilitatorUrl: process.env.FACILITATOR_URL!,
  onError: (error, request) => {
    console.log("error", error);
    return NextResponse.rewrite(request.nextUrl.origin, { status: 402 });
  },
  onSuccess: async (request, facilitatorResponse) => {
    console.log("onSuccess called with response:", facilitatorResponse);
    console.log("Current URL:", request.nextUrl.toString());

    const prompt = request.nextUrl.searchParams.get("prompt");
    const txHash = facilitatorResponse.data?.txHash;
    const baseUrl = request.nextUrl.origin;

    const errorRedirectUrl = new URL("/", baseUrl);

    if (!prompt || prompt.length > 30 || !txHash) {
      console.log("Invalid input, redirecting to error page");
      return NextResponse.redirect(errorRedirectUrl, { status: 302 });
    }

    try {
      console.log("Attempting to save transaction:", txHash);
      const saveTxResponse = await fetch(baseUrl + "/api/handle-tx", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ txHash }),
      });

      console.log("Save transaction response:", saveTxResponse.status);

      if (!saveTxResponse.ok) {
        console.log("Failed to save transaction, redirecting to error page");
        return NextResponse.redirect(errorRedirectUrl, { status: 302 });
      }

      console.log("Transaction saved successfully, continuing with request");
    } catch (error) {
      console.error("Error saving transaction:", error);
      return NextResponse.redirect(errorRedirectUrl, { status: 302 });
    }
  },
});

export const config = {
  matcher: "/api/create-image",
};
