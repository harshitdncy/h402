import { Hex } from "@/types";

const NONCE_BYTES = 32;

// TODO: Add JSDoc
export function createNonce(): Hex {
  try {
    const randomBytes = crypto.getRandomValues(new Uint8Array(NONCE_BYTES));
    return Buffer.from(randomBytes).toString("hex") as Hex;
  } catch (error) {
    throw new Error(
      `Failed to generate nonce: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}
