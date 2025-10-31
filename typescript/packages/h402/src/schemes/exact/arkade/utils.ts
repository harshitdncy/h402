import { ArkadePaymentPayload } from "../../../types/index.js";
import { safeBase64Decode, safeBase64Encode } from "../../../shared/index.js";
import { ArkAddress } from "@arkade-os/sdk";

/**
 * Encodes an Arkade payment payload to base64
 */
function encodePaymentPayload(payload: ArkadePaymentPayload): string {
  const safe = {
    ...payload,
    payload: {
      ...payload.payload,
    },
  };

  return safeBase64Encode(JSON.stringify(safe));
}

/**
 * Decodes a base64 Arkade payment payload
 */
function decodePaymentPayload(payment: string): ArkadePaymentPayload {
  const decoded = safeBase64Decode(payment);
  const parsed = JSON.parse(decoded);

  return validatePaymentPayload(parsed);
}

/**
 * Validates an Arkade payment payload structure
 */
function validatePaymentPayload(obj: ArkadePaymentPayload): ArkadePaymentPayload {
  if (!obj || typeof obj !== "object") {
    throw new Error("Invalid payment payload: not an object");
  }

  if (!obj.payload || typeof obj.payload !== "object") {
    throw new Error("Invalid payment payload: missing or invalid payload");
  }

  if (!obj.payload.type || typeof obj.payload.type !== "string") {
    throw new Error("Invalid payment payload: missing or invalid payload type");
  }

  const validTypes = [
    "signAndSendTransaction",
    "signTransaction",
    "signMessage",
  ];
  if (!validTypes.includes(obj.payload.type)) {
    throw new Error(
      `Invalid payment payload: unsupported type ${obj.payload.type}`
    );
  }

  if (obj.payload.type === "signAndSendTransaction") {
    if (!obj.payload.txId || typeof obj.payload.txId !== "string") {
      throw new Error(
        "Invalid payment payload: signAndSendTransaction type requires signature field"
      );
    }
  }

  if (obj.payload.type === "signTransaction") {
    if (
      !obj.payload.transaction ||
      typeof obj.payload.transaction !== "string"
    ) {
      throw new Error(
        "Invalid payment payload: signTransaction type requires transaction field"
      );
    }

    if (
      obj.payload.checkpoints !== undefined &&
      !Array.isArray(obj.payload.checkpoints)
    ) {
      throw new Error(
        "Invalid payment payload: checkpoints must be an array if provided"
      );
    }
  }

  if (obj.payload.type === "signMessage") {
    if (!obj.payload.signature || typeof obj.payload.signature !== "string") {
      throw new Error(
        "Invalid payment payload: signMessage type requires signature field"
      );
    }
    if (!obj.payload.message || typeof obj.payload.message !== "object") {
      throw new Error(
        "Invalid payment payload: signMessage type requires message object"
      );
    }
    if (
      !obj.payload.message.message ||
      typeof obj.payload.message.message !== "string"
    ) {
      throw new Error(
        "Invalid payment payload: signMessage requires message.message field"
      );
    }
    if (
      !obj.payload.message.signature ||
      typeof obj.payload.message.signature !== "string"
    ) {
      throw new Error(
        "Invalid payment payload: signMessage requires message.signature field"
      );
    }
  }

  return obj as ArkadePaymentPayload;
}

/**
 * Validates an Arkade address format using the SDK's ArkAddress decoder
 * Arkade addresses are bech32m encoded with format: hrp + version + serverPubKey + vtxoTaprootKey
 */
function isValidArkadeAddress(address: string): boolean {
  try {
    if (typeof address !== "string" || address.length === 0) {
      return false;
    }

    ArkAddress.decode(address);
    return true;
  } catch {
    return false;
  }
}

export {
  encodePaymentPayload,
  decodePaymentPayload,
  validatePaymentPayload,
  isValidArkadeAddress,
};

