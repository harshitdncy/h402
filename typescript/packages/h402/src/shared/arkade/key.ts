import { nip19 } from "nostr-tools";

/**
 * Converts an Arkade private key to hexadecimal format.
 * Supports both nsec-encoded (Nostr bech32) and raw hex string formats.
 *
 * @param privateKey - The private key as either:
 *   - An nsec-encoded string (starts with "nsec")
 *   - A 64-character hexadecimal string
 * @returns The private key as a hexadecimal string
 * @throws Error if the private key format is invalid
 */
export function privateKeyToHex(privateKey: string): string {
  if (privateKey.startsWith("nsec")) {
    const { type, data } = nip19.decode(privateKey);
    if (type !== "nsec") {
      throw new Error("Expected nsec (Nostr private key), got: " + type);
    }
    return Buffer.from(data).toString("hex");
  } else if (privateKey.length === 64) {
    return privateKey;
  } else {
    throw new Error(
      "Invalid private key format. Expected 64-character hex string or nsec encoded key."
    );
  }
}

