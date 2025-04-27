import { NextRequest, NextResponse } from "next/server";

export function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const b64 = params.get("b64");

  if (!b64) {
    return new NextResponse("Bad Request", {
      status: 400,
    });
  }

  const buffer = Buffer.from(b64, "base64");

  if (!buffer) {
    return new NextResponse("Bad Request", {
      status: 400,
    });
  }

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": "image/png",
      "Content-Length": buffer.length.toString(),
    },
  });
}
