// app/api/images/[imageId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ imageId: string }> }
) {
  const { imageId } = await params;

  if (!imageId || imageId.includes('..') || imageId.includes('/')) {
    return NextResponse.json({ error: "Invalid image ID" }, { status: 400 });
  }

  try {
    const uploadsDir = path.join(process.cwd(), "/public/uploads");
    const imagePath = path.join(uploadsDir, `${imageId}.png`);
    console.log("Image path:", imagePath);

    try {
      await fs.access(imagePath);
    } catch {
      return NextResponse.json({ error: "Image not found" }, { status: 404 });
    }

    const imageBuffer = await fs.readFile(imagePath);

    return new NextResponse(new Uint8Array(imageBuffer), {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error("Error serving image:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Max-Age": "86400",
    },
  });
}