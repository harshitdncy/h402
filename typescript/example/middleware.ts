import { h402Middleware } from "@bit-gpt/h402/next";
import { paymentDetails } from "./config/paymentDetails";
import { NextResponse } from "next/server";
import { openai } from "@/lib/openai";

export const middleware = h402Middleware({
  routes: ["/create-image"],
  paywallRoute: "/",
  paymentDetails,
  facilitatorUrl: "http://localhost:3000/api/facilitator",
  onSuccess: async (request, facilitatorResponse) => {
    const prompt = request.nextUrl.searchParams.get("prompt");
    const txHash = facilitatorResponse.txHash;

    const errorRedirectUrl = new URL("/");

    if (!prompt) {
      return NextResponse.redirect(errorRedirectUrl, { status: 400 });
    }

    if (prompt.length > 30) {
      return NextResponse.redirect(errorRedirectUrl, { status: 400 });
    }

    const imageResponse = await openai.images.generate({
      model: "dall-e-2",
      prompt: prompt,
      n: 1,
      size: "1024x1024",
    });

    if (!imageResponse.data) {
      return NextResponse.redirect(errorRedirectUrl, { status: 500 });
    }

    const imageUrl = imageResponse.data[0].url;

    if (!imageUrl) {
      return NextResponse.redirect(errorRedirectUrl, { status: 500 });
    }

    return NextResponse.redirect(imageUrl, { status: 302 });
  },
});

export const config = {
  matcher: "/create-image",
};
