import { z } from "zod";
import { NetworkSchema } from "../shared/index.js";
import { ExactEvmPayloadSchema } from "./evmPayload.js";
import { ExactSolanaPayloadSchema } from "./solanaPayload.js";
import { ExactArkadePayloadSchema } from "./arkadePayload.js";

// Constants
const MixedAddressRegex =
  /^0x[a-fA-F0-9]{40}|[A-Za-z0-9][A-Za-z0-9-]{0,34}[A-Za-z0-9]$/;

// Enums
export const schemes = ["exact"] as const;
export const h402Versions = [1] as const;
export const ErrorReasons = [
  "insufficient_funds",
  "invalid_exact_evm_payload_authorization_valid_after",
  "invalid_exact_evm_payload_authorization_valid_before",
  "invalid_exact_evm_payload_authorization_value",
  "invalid_exact_evm_payload_signature",
  "invalid_exact_evm_payload_recipient_mismatch",
  "invalid_exact_solana_payload_authorization_valid_after",
  "invalid_exact_solana_payload_authorization_valid_before",
  "invalid_exact_solana_payload_authorization_value",
  "invalid_exact_solana_payload_signature",
  "invalid_exact_solana_payload_recipient_mismatch",
  "invalid_exact_arkade_payload_txId",
  "invalid_exact_arkade_payload_tx_input_invalid",
  "invalid_exact_arkade_payload_tx_recipient_mismatch",
  "invalid_exact_arkade_payload_tx_amount_mismatch",
  "invalid_exact_arkade_payload_tx_amount_less_than_dust",
  "invalid_exact_arkade_payload_tx_output_not_found",
  "invalid_exact_arkade_payload_signer_pubkey",
  "invalid_exact_arkade_payload_txId_not_found",
  "invalid_exact_arkade_payload_psbt_empty",
  "invalid_exact_arkade_payload_tx_sender_pubkey_not_found",
  "invalid_exact_arkade_payload_tx_input_missing_witness",
  "invalid_exact_arkade_payload_tx_input_missing_tapleaf",
  "invalid_exact_arkade_payload_tx_input_unsigned",
  "invalid_exact_arkade_payload_signed_message_signature_mismatch",
  "invalid_exact_arkade_payload_signedMessage",
  "invalid_network",
  "invalid_payload",
  "invalid_payment_requirements",
  "invalid_scheme",
  "unsupported_scheme",
  "invalid_h402_version",
  "invalid_transaction_state",
  "unexpected_verify_error",
  "unexpected_settle_error",
] as const;

// h402PaymentRequirements
const NamespaceSchema = z.enum(["evm", "solana", "arkade"]);
const AmountFormatSchema = z.enum(["humanReadable", "smallestUnit"]);

// Helper function to validate bigint or number
const BigintOrNumberSchema = z.union([z.bigint(), z.number()]);

// Common fields shared by all namespaces
const CommonPaymentRequirementsSchema = z.object({
  tokenDecimals: z.number().int().optional(),
  tokenSymbol: z.string().optional(),
  amountRequired: BigintOrNumberSchema,
  amountRequiredFormat: AmountFormatSchema,
  payToAddress: z.string(),
  networkId: z.string(),
  description: z.string().optional(),
  resource: z.string().url().optional(),
  scheme: z.enum(schemes),
  mimeType: z.string().optional(),
  outputSchema: z.any().optional(),
  estimatedProcessingTime: z.number().int().optional(),
  extra: z.any().optional(),
  maxAmountRequired: BigintOrNumberSchema.optional(),
  requiredDeadlineSeconds: z.number().int().optional(),
});

// Namespace-specific schemas
export const EvmPaymentRequirementsSchema = CommonPaymentRequirementsSchema.extend({
  namespace: z.literal("evm"),
  tokenAddress: z.string(), // Required for EVM
});

export const SolanaPaymentRequirementsSchema = CommonPaymentRequirementsSchema.extend({
  namespace: z.literal("solana"),
  tokenAddress: z.string(), // Required for Solana
});

export const ArkadePaymentRequirementsSchema = CommonPaymentRequirementsSchema.extend({
  namespace: z.literal("arkade"),
  tokenAddress: z.string().optional(), // Optional for Arkade (BTC only, can be omitted)
});

// Base Payment Requirements Schema (discriminated union)
export const BasePaymentRequirementsSchema = z.discriminatedUnion("namespace", [
  EvmPaymentRequirementsSchema,
  SolanaPaymentRequirementsSchema,
  ArkadePaymentRequirementsSchema,
]);

// Enriched namespace-specific schemas
export const EvmEnrichedPaymentRequirementsSchema = EvmPaymentRequirementsSchema.extend({
  tokenDecimals: z.number().int(), // Required after enrichment
  tokenSymbol: z.string(), // Required after enrichment
});

export const SolanaEnrichedPaymentRequirementsSchema = SolanaPaymentRequirementsSchema.extend({
  tokenDecimals: z.number().int(),
  tokenSymbol: z.string(),
});

export const ArkadeEnrichedPaymentRequirementsSchema = ArkadePaymentRequirementsSchema.extend({
  tokenDecimals: z.number().int(), // Always 8 for BTC
  tokenSymbol: z.string(), // Always "BTC"
});

// Enriched Payment Requirements Schema (discriminated union)
export const EnrichedPaymentRequirementsSchema = z.discriminatedUnion("namespace", [
  EvmEnrichedPaymentRequirementsSchema,
  SolanaEnrichedPaymentRequirementsSchema,
  ArkadeEnrichedPaymentRequirementsSchema,
]);

// Main export schema
export const PaymentRequirementsSchema = BasePaymentRequirementsSchema;

// Type exports (inferred from schemas)
export type BasePaymentRequirements = z.infer<
  typeof BasePaymentRequirementsSchema
>;
export type EnrichedPaymentRequirements = z.infer<
  typeof EnrichedPaymentRequirementsSchema
>;
export type PaymentRequirements = z.infer<typeof PaymentRequirementsSchema>;
export type Namespace = z.infer<typeof NamespaceSchema>;
export type AmountFormat = z.infer<typeof AmountFormatSchema>;

// h402PaymentPayload
export function createPaymentPayloadSchema<T extends z.ZodType>(
  payloadSchema: T
) {
  return z.object({
    h402Version: z.number().refine((val) => h402Versions.includes(val as 1)),
    scheme: z.enum(schemes),
    payload: payloadSchema,
    namespace: NamespaceSchema,
    networkId: z.string(),
    resource: z.string().url().optional(),
  });
}

export const EvmPaymentPayloadSchema = createPaymentPayloadSchema(
  ExactEvmPayloadSchema
);
export const SolanaPaymentPayloadSchema = createPaymentPayloadSchema(
  ExactSolanaPayloadSchema
);
export const ArkadePaymentPayloadSchema = createPaymentPayloadSchema(
  ExactArkadePayloadSchema
);
export type EvmPaymentPayload = z.infer<typeof EvmPaymentPayloadSchema>;
export type SolanaPaymentPayload = z.infer<typeof SolanaPaymentPayloadSchema>;
export type ArkadePaymentPayload = z.infer<typeof ArkadePaymentPayloadSchema>;

// h402VerifyResponse
export const VerifyResponseSchema = z.object({
  isValid: z.boolean(),
  invalidReason: z.enum(ErrorReasons).optional(),
  payer: z.string().regex(MixedAddressRegex).optional(),
  //
  errorMessage: z.string().optional(),
  txHash: z.string().regex(MixedAddressRegex).optional(),
  type: z.enum(["payload", "transaction"] as const).optional(),
});
export type VerifyResponse = z.infer<typeof VerifyResponseSchema>;

// h402SettleResponse
export const SettleResponseSchema = z.object({
  success: z.boolean(),
  transaction: z.string().regex(MixedAddressRegex),
  namespace: NamespaceSchema.optional(),
  errorReason: z.enum(ErrorReasons).optional(),
  payer: z.string().regex(MixedAddressRegex).optional(),
  //
  error: z.string().optional(),
});
export type SettleResponse = z.infer<typeof SettleResponseSchema>;

// h402SupportedPaymentKind
export const SupportedPaymentKindSchema = z.object({
  h402Version: z.number().refine((val) => h402Versions.includes(val as 1)),
  scheme: z.enum(schemes),
  network: NetworkSchema,
});
export type SupportedPaymentKind = z.infer<typeof SupportedPaymentKindSchema>;

// h402SupportedPaymentKindsResponse
export const SupportedPaymentKindsResponseSchema = z.object({
  kinds: z.array(SupportedPaymentKindSchema),
});
export type SupportedPaymentKindsResponse = z.infer<
  typeof SupportedPaymentKindsResponseSchema
>;
