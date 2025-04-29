import { h402Middleware } from "@bit-gpt/h402/next";
import { paymentDetails } from "./config/paymentDetails";
import { NextResponse } from "next/server";

export const middleware = h402Middleware({
  routes: ["/"],
  paywallRoute: "/paywall",
  paymentDetails,
  onSuccess: async (request, facilitatorResponse) => {
    console.log("onSuccess", facilitatorResponse);

    const prompt = request.nextUrl.searchParams.get("prompt");
    const txHash = facilitatorResponse.data?.txHash;
    const baseUrl = request.nextUrl.origin;

    const errorRedirectUrl = new URL("/", baseUrl);

    if (!prompt || prompt.length > 30 || !txHash) {
      console.log("onSuccess", "redirecting to error page");
      console.log({
        prompt,
        txHash,
        baseUrl,
        errorRedirectUrl
      });

      return NextResponse.rewrite(errorRedirectUrl, { status: 302 });
    }
    
    try {
      const saveTxResponse = await fetch(
        `${baseUrl}/api/handle-tx`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ txHash }),
        }
      );

      if (!saveTxResponse.ok) {
        console.log("saveTxResponse", "not ok");
        return NextResponse.redirect(errorRedirectUrl, { status: 302 });
      }
    } catch (error) {
      console.log("saveTxResponse", "error", error);
      return NextResponse.redirect(errorRedirectUrl, { status: 302 });
    }

    request.nextUrl.searchParams.delete("402base64");

    return NextResponse.next();
  },
});

export const config = {
  matcher: "/",
};
