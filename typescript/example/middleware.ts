import { h402Middleware } from "@bit-gpt/h402/next";
import { paymentDetails } from "./config/paymentDetails";
import { NextResponse } from "next/server";
import { openai } from "@/lib/openai";

export const middleware = h402Middleware({
  routes: ["/image"],
  paywallRoute: "/",
  paymentDetails,
  facilitatorUrl: process.env.FACILITATOR_URL!,
  onSuccess: async (request, facilitatorResponse) => {
    const prompt = request.nextUrl.searchParams.get("prompt");
    const txHash = facilitatorResponse.data.txHash!;
    const baseUrl = request.nextUrl.origin;

    const errorRedirectUrl = new URL("/", baseUrl);

    if (!prompt) {
      return NextResponse.redirect(errorRedirectUrl, { status: 400 });
    }

    if (prompt.length > 30) {
      return NextResponse.redirect(errorRedirectUrl, { status: 400 });
    }

    const saveTxResponse = await fetch(baseUrl+"/api/handle-tx", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ txHash }),
    });

    if (!saveTxResponse.ok) {
      return NextResponse.redirect(errorRedirectUrl, { status: 400 });
    }

    const imageResponse = await openai.images.generate({
      model: "gpt-image-1",
      prompt: prompt,
      n: 1,
      size: "1024x1024",
    });

    if (!imageResponse.data) {
      return NextResponse.redirect(errorRedirectUrl, { status: 500 });
    }

    const b64EncodedImage = imageResponse.data[0].b64_json;

    if (!b64EncodedImage) {
      return NextResponse.redirect(errorRedirectUrl, { status: 500 });
    }

    const url = new URL(`/image?b64=${b64EncodedImage}`, baseUrl);

    return NextResponse.redirect(url, { status: 302 });
  },
});

export const config = {
  matcher: "/image",
};
