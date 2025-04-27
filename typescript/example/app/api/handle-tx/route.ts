import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { readFile, writeFile } from "fs/promises";

const TX_HASH_DB_FILE = path.join(process.cwd(), "data", "txHash.json");

export async function POST(req: NextRequest) {
  const { txHash } = await req.json();

  if (!txHash) {
    return NextResponse.json({ error: "Missing txHash" }, { status: 400 });
  }

  const txHashDbRaw = await readFile(TX_HASH_DB_FILE, "utf-8").catch(
    () => "[]"
  );
  const txHashDb = JSON.parse(txHashDbRaw) as string[];

  if (txHashDb.includes(txHash)) {
    return NextResponse.json({ error: "Duplicate txHash" }, { status: 400 });
  }

  txHashDb.push(txHash);
  await writeFile(TX_HASH_DB_FILE, JSON.stringify(txHashDb), {
    encoding: "utf-8",
  });

  return NextResponse.json({ success: true });
}
