import { z } from "zod";
import { HexSchema } from "./evmPayload";

// Arkade signAndSendTransaction: Transaction already broadcast by client
const ArkadeSignAndSendTransactionPayloadSchema = z.object({
  type: z.literal("signAndSendTransaction"),
  txId: z.string(), // The arkTxid returned from broadcasting
  signedMessage: HexSchema,
});

export type ArkadeSignAndSendTransactionPayload = z.infer<
  typeof ArkadeSignAndSendTransactionPayloadSchema
>;

// Arkade signTransaction: Signed transaction to be broadcast by facilitator
const ArkadeSignTransactionPayloadSchema = z.object({
  type: z.literal("signTransaction"),
  transaction: z.string(), // Base64 encoded signed PSBT
  checkpoints: z.array(z.string()).optional(), // Optional checkpoint transactions
});

export type ArkadeSignTransactionPayload = z.infer<
  typeof ArkadeSignTransactionPayloadSchema
>;

// Arkade signMessage: For future use
const ArkadeSignMessagePayloadSchema = z.object({
  type: z.literal("signMessage"),
  signature: z.string(),
  message: z.object({
    message: z.string(),
    signature: z.string(),
  }),
});

export type ArkadeSignMessagePayload = z.infer<
  typeof ArkadeSignMessagePayloadSchema
>;

// Combined payload schema (discriminated union)
export const ExactArkadePayloadSchema = z.discriminatedUnion("type", [
  ArkadeSignAndSendTransactionPayloadSchema,
  ArkadeSignTransactionPayloadSchema,
  ArkadeSignMessagePayloadSchema,
]);

export type ExactArkadePayload = z.infer<typeof ExactArkadePayloadSchema>;

// Export individual schemas
export {
  ArkadeSignAndSendTransactionPayloadSchema,
  ArkadeSignTransactionPayloadSchema,
  ArkadeSignMessagePayloadSchema,
};

