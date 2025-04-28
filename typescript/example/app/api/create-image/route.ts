import { NextRequest, NextResponse } from "next/server";
import { openai } from "@/lib/openai";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const prompt = searchParams.get("prompt");

  if (!prompt) {
    return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
  }

  const imageResponse = await openai.images.generate({
    model: "gpt-image-1",
    // model: "dall-e-2", 
    prompt: prompt,
    n: 1,
    size: "1024x1024",
  });

  if (!imageResponse.data || !imageResponse.data[0].b64_json) {
    return NextResponse.json({ error: "No image data" }, { status: 500 });
  }

  // Return HTML that displays the base64 image fullscreen
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body, html {
            margin: 0;
            padding: 0;
            width: 100%;
            height: 100%;
            display: flex;
            justify-content: center;
            align-items: center;
            background: black;
          }
          img {
            max-width: 100%;
            max-height: 100%;
            object-fit: contain;
          }
        </style>
      </head>
      <body>
        <img src="data:image/png;base64,${imageResponse.data[0].b64_json}" />
      </body>
    </html>
  `;

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html",
    },
  });
}
