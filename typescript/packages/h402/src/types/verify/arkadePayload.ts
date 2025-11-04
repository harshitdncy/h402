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
  ArkadeSignMessagePayloadSchema,
]);

export type ExactArkadePayload = z.infer<typeof ExactArkadePayloadSchema>;

// Export individual schemas
export {
  ArkadeSignAndSendTransactionPayloadSchema,
  ArkadeSignMessagePayloadSchema,
};

