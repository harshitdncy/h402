import {
  ArkadePaymentPayload,
  ArkadeSignAndSendTransactionPayload,
  ArkadeSignMessagePayload,
  PaymentRequirements,
  VerifyResponse,
} from "../../../types/index.js";
import {
  RestIndexerProvider,
} from "@arkade-os/sdk";
import { getArkadeServerUrl } from "../../../shared/next.js";
import { validateArkadeTransaction } from "./utils.js";

/**
 * Transaction is already broadcast, so we verify it exists off-chain
 */
async function verifySignAndSendTransactionPayload(
  payload: ArkadeSignAndSendTransactionPayload,
  paymentRequirements: PaymentRequirements
): Promise<VerifyResponse> {
  console.log("[Arkade Verify] Verifying signAndSendTransaction", {
    arkTxid: payload.txId,
    payToAddress: paymentRequirements.payToAddress,
    amountRequired: paymentRequirements.amountRequired,
    signedMessage: payload.signedMessage,
  });

  if (!payload.txId) {
    return {
      isValid: false,
      errorMessage:
        "Missing required arkTxid in signAndSendTransaction payload",
      invalidReason: "invalid_exact_arkade_payload_txId",
    };
  }

  if (!payload.signedMessage) {
    return {
      isValid: false,
      errorMessage:
        "Missing required signedMessage in signAndSendTransaction payload",
      invalidReason: "invalid_exact_arkade_payload_signedMessage",
    };
  }

  try {
    const indexer = new RestIndexerProvider(getArkadeServerUrl());
    const virtualTxs = await indexer.getVirtualTxs([payload.txId]);

    if (!virtualTxs || (virtualTxs?.txs && virtualTxs.txs.length === 0)) {
      return {
        isValid: false,
        errorMessage: "Transaction not found",
        invalidReason: "invalid_exact_arkade_payload_txId_not_found",
      };
    }

    const tx = virtualTxs.txs[0];

    const validationResult = await validateArkadeTransaction(
      tx,
      payload.signedMessage,
      paymentRequirements
    );

    if (!validationResult.isValid) {
      return {
        isValid: false,
        errorMessage: validationResult.errorMessage,
        invalidReason: validationResult.invalidReason,
      };
    }

    return {
      isValid: true,
      txHash: payload.txId,
      type: "transaction",
    };
  } catch (error) {
    console.error("[Arkade Verify] Error verifying transaction:", error);
    return {
      isValid: false,
      errorMessage: `Failed to verify transaction: ${
        error instanceof Error ? error.message : String(error)
      }`,
      invalidReason: "invalid_payload",
    };
  }
}

/**
 * Verifies a signMessage payload
 * Message signatures are not transactions and cannot be used for payment
 */
async function verifySignMessagePayload(
  payload: ArkadeSignMessagePayload,
  paymentRequirements: PaymentRequirements
): Promise<VerifyResponse> {
  console.log("[Arkade Verify] Rejecting signMessage payload");

  return {
    isValid: false,
    errorMessage: "SignMessage payloads cannot be verified as transactions",
    invalidReason: "invalid_payload",
  };
}

/**
 * Main verification function that routes to specific validators
 */
export async function verify(
  payload: ArkadePaymentPayload,
  paymentRequirements: PaymentRequirements
): Promise<VerifyResponse> {
  console.log("[Arkade Verify] Starting verification", {
    payloadType: payload.payload.type,
    networkId: paymentRequirements.networkId,
    amountRequired: paymentRequirements.amountRequired,
  });

  if (paymentRequirements.namespace !== "arkade") {
    return {
      isValid: false,
      errorMessage: 'Payment details must use the "arkade" namespace',
      invalidReason: "invalid_payment_requirements",
    };
  }

  try {
    switch (payload.payload.type) {
      case "signAndSendTransaction":
        return await verifySignAndSendTransactionPayload(
          payload.payload,
          paymentRequirements
        );

      case "signMessage":
        return await verifySignMessagePayload(
          payload.payload,
          paymentRequirements
        );

      default:
        return {
          isValid: false,
          errorMessage: `Unsupported payload type: ${
            (payload.payload as any).type
          }`,
          invalidReason: "invalid_payload",
        };
    }
  } catch (error) {
    return {
      isValid: false,
      errorMessage: `Error verifying transaction: ${
        error instanceof Error ? error.message : String(error)
      }`,
      invalidReason: "unexpected_verify_error",
    };
  }
}
