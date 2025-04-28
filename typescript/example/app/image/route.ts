import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";

export function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const filename = searchParams.get("filename");

  if (!filename) {
    console.log()
    return new NextResponse("Bad Request", { status: 400 });
  }

  const filepath = path.join(__dirname, "uploads", filename);

  if (!fs.existsSync(filepath)) {
    return new NextResponse("Not Found", { status: 404 });
  }

  return new NextResponse(fs.readFileSync(filepath), {
    status: 200,
    headers: {
      "Content-Type": "image/png",
    },
  });
}
