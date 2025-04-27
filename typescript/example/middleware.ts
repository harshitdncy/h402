import { h402Middleware } from "@bit-gpt/h402/next";
import { paymentDetails } from "./config/paymentDetails";
import { NextResponse } from "next/server";
import { openai } from "@/lib/openai";
import path from "path";
import { readFile } from "fs/promises";
import { writeFile } from "fs/promises";

const TX_HASH_DB_FILE = path.join(process.cwd(), "data", "txHash.json")

export const middleware = h402Middleware({
  routes: ["/create-image"],
  paywallRoute: "/",
  paymentDetails,
  facilitatorUrl: "http://localhost:3000/api/facilitator",
  onSuccess: async (request, facilitatorResponse) => {
    const prompt = request.nextUrl.searchParams.get("prompt");
    const txHash = facilitatorResponse.data.txHash!;

    const errorRedirectUrl = new URL("/");

    if (!prompt) {
      return NextResponse.redirect(errorRedirectUrl, { status: 400 });
    }

    if (prompt.length > 30) {
      return NextResponse.redirect(errorRedirectUrl, { status: 400 });
    }

    const txHashDbRaw = await readFile(TX_HASH_DB_FILE, "utf-8").catch(() => "[]")
    const txHashDb = JSON.parse(txHashDbRaw) as string [];

    if (txHashDb.includes(txHash)) {
      return NextResponse.redirect(errorRedirectUrl, { status: 400});
    }

    txHashDb.push(txHash);

    await writeFile(TX_HASH_DB_FILE, JSON.stringify(txHashDb), { encoding: "utf-8" });

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
