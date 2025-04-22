import { safeBase64Encode, safeBase64Decode } from "@/utils";
import type { PaymentPayload } from "@/types";
import type {
  NativeTransferPayload,
  AuthorizationPayload,
  Payload,
  TokenTransferPayload,
} from "..";

export function encodePayment(
  payment: PaymentPayload<
    NativeTransferPayload | TokenTransferPayload | AuthorizationPayload
  >
): string {
  const safe = {
    ...payment,
    payload: {
      ...payment.payload,
      ...(payment.payload.type === "authorization" && {
        authorization: {
          ...payment.payload.authorization,
          value: payment.payload.authorization.value.toString(),
          validAfter: payment.payload.authorization.validAfter.toString(),
          validBefore: payment.payload.authorization.validBefore.toString(),
        },
      }),
      ...((payment.payload.type === "nativeTransfer" ||
        payment.payload.type === "tokenTransfer") && {
        transaction: {
          ...(payment.payload as NativeTransferPayload | TokenTransferPayload)
            .transaction,
          value: (
            payment.payload as NativeTransferPayload | TokenTransferPayload
          ).transaction.value.toString(),
        },
      }),
    },
  };

  return safeBase64Encode(JSON.stringify(safe));
}

export function decodePayment(payment: string): PaymentPayload<Payload> {
  const decoded = safeBase64Decode(payment);
  const parsed = JSON.parse(decoded);

  const obj = {
    ...parsed,
    payload: {
      ...parsed.payload,
      ...(parsed.payload.type === "authorization" && {
        authorization: {
          ...parsed.payload.authorization,
          value: BigInt(parsed.payload.authorization.value),
          validAfter: BigInt(parsed.payload.authorization.validAfter),
          validBefore: BigInt(parsed.payload.authorization.validBefore),
        },
      }),
      ...((parsed.payload.type === "nativeTransfer" ||
        parsed.payload.type === "tokenTransfer") && {
        transaction: {
          ...parsed.payload.transaction,
          value: BigInt(parsed.payload.transaction.value),
        },
      }),
    },
  };

  const validated = validatePaymentPayload(obj);
  return validated;
}

function validatePaymentPayload(obj: any): PaymentPayload<Payload> {
  if (
    !obj ||
    typeof obj !== "object" ||
    !obj.payload ||
    typeof obj.payload !== "object" ||
    !obj.payload.type
  ) {
    throw new Error("Invalid payment payload structure");
  }

  switch (obj.payload.type) {
    case "authorization":
      if (
        !obj.payload.authorization ||
        typeof obj.payload.authorization.value !== "bigint" ||
        typeof obj.payload.authorization.validAfter !== "bigint" ||
        typeof obj.payload.authorization.validBefore !== "bigint" ||
        typeof obj.payload.authorization.nonce !== "string" ||
        typeof obj.payload.authorization.version !== "string"
      ) {
        throw new Error("Invalid authorization payload values");
      }
      break;

    case "nativeTransfer":
      if (
        !obj.payload.transaction ||
        typeof obj.payload.transaction.value !== "bigint" ||
        typeof obj.payload.transaction.from !== "string" ||
        typeof obj.payload.transaction.to !== "string" ||
        typeof obj.payload.transaction.nonce !== "number"
      ) {
        throw new Error("Invalid native transfer payload values");
      }
      break;

    case "tokenTransfer":
      if (
        !obj.payload.transaction ||
        typeof obj.payload.transaction.value !== "bigint" ||
        typeof obj.payload.transaction.from !== "string" ||
        typeof obj.payload.transaction.to !== "string" ||
        typeof obj.payload.transaction.nonce !== "number" ||
        typeof obj.payload.transaction.data !== "string"
      ) {
        throw new Error("Invalid token transfer payload values");
      }
      break;

    default:
      throw new Error("Invalid payload type");
  }

  return obj as PaymentPayload<Payload>;
}
