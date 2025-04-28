import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { openai } from "@/lib/openai";

export async function POST(request: NextRequest) {
  const { prompt } = await request.json();

  const filename = `image-${randomUUID()}.png`;
  const filepath = path.join(__dirname, "uploads", filename);

  await fs.promises.mkdir(path.join(__dirname, "uploads"), { recursive: true });

  const imageResponse = await openai.images.generate({
    model: "gpt-image-1",
    prompt: prompt,
    n: 1,
    size: "1024x1024",
  });

  if (!imageResponse.data || !imageResponse.data[0].b64_json) {
    return NextResponse.json({ error: "No image data" }, { status: 500 });
  }

  const buffer = Buffer.from(imageResponse.data[0].b64_json, "base64");

  if (!buffer) {
    return NextResponse.json({ error: "No buffer data" }, { status: 500 });
  }

  try {
    await fs.promises.writeFile(filepath, buffer);
  } catch {
    return NextResponse.json(
      { error: "Error writing image file" },
      { status: 500 }
    );
  }

  return NextResponse.redirect(`/image?filename=${filename}`, {
    status: 200,
  });
}
