/**
 * Export all facilitator implementations
 * This file serves as a central export point for all blockchain-specific facilitators
 * and provides a unified interface for easier use
 */

// Import blockchain-specific facilitators
import * as evmFacilitator from "./evm/facilitator.js";
import * as solanaFacilitator from "./solana/facilitator.js";
import * as arkadeFacilitator from "./arkade/facilitator.js";

// Re-export the specific implementations
export * as evm from "./evm/facilitator.js";
export * as solana from "./solana/facilitator.js";
export * as arkade from "./arkade/facilitator.js";

// Import types
import {
  PaymentRequirements,
  VerifyResponse,
  SettleResponse,
  EvmPaymentPayload,
  SolanaPaymentPayload,
  ArkadePaymentPayload,
} from "../types";
import { EvmClient, SolanaClient, ArkadeClient } from "../types/shared/client";
import { createWalletClient, http, publicActions, PublicClient } from "viem";
import { getPublicClient } from "../types/shared/evm/wallet.js";
import { privateKeyToAccount } from "viem/accounts";
import { getChain } from "../shared/evm/chainUtils.js";
import { RestArkProvider, SingleKey } from "@arkade-os/sdk";
import { getArkadeServerUrl } from "../shared/next.js";

/**
 * Type representing any supported payment payload
 */
export type PaymentPayload = EvmPaymentPayload | SolanaPaymentPayload | ArkadePaymentPayload;

/**
 * Type representing any supported client
 */
export type Client = EvmClient | SolanaClient | ArkadeClient | PublicClient;

/**
 * Verifies a payment payload against the required payment details
 * Automatically detects the appropriate blockchain implementation
 *
 * @param payload - The signed payment payload
 * @param paymentRequirements - The payment requirements that the payload must satisfy
 * @param client - Optional client used for blockchain interactions (required for EVM)
 * @returns A VerifyResponse indicating if the payment is valid and any invalidation reason
 */
export async function verify(
  payload: PaymentPayload,
  paymentRequirements: PaymentRequirements
): Promise<VerifyResponse> {
  // Route to the appropriate blockchain implementation based on namespace
  switch (paymentRequirements.namespace) {
    case "solana":
      return solanaFacilitator.verify(
        payload as SolanaPaymentPayload,
        paymentRequirements
      );
    case "arkade":
      return arkadeFacilitator.verify(
        payload as ArkadePaymentPayload,
        paymentRequirements
      );
    case "evm":
    default: {
      const client = getPublicClient(paymentRequirements.networkId);
      return evmFacilitator.verify(
        client as PublicClient,
        payload as EvmPaymentPayload,
        paymentRequirements
      );
    }
  }
}

/**
 * Settles a payment payload against the required payment details
 * Automatically detects the appropriate blockchain implementation
 *
 * @param payload - The signed payment payload
 * @param paymentRequirements - The payment requirements that the payload must satisfy
 * @param privateKeyOrClient - Private key (for EVM), SolanaClient (for Solana), or ArkadeClient (for Arkade)
 * @returns A SettleResponse indicating if the payment is settled and any settlement reason
 */
export async function settle(
  payload: PaymentPayload,
  paymentRequirements: PaymentRequirements,
  privateKeyOrClient: string | Client
): Promise<SettleResponse> {
  // Route to the appropriate blockchain implementation based on namespace
  switch (paymentRequirements.namespace) {
    case "solana":
      return solanaFacilitator.settle(
        privateKeyOrClient as SolanaClient,
        payload as SolanaPaymentPayload,
        paymentRequirements
      );
    case "arkade":
      const arkProvider = new RestArkProvider(getArkadeServerUrl());
      const identity = SingleKey.fromHex(privateKeyOrClient as `0x${string}`)
      const arkadeClient: ArkadeClient = {
        arkProvider,
        identity
      };
      return arkadeFacilitator.settle(
        arkadeClient as ArkadeClient,
        payload as ArkadePaymentPayload,
        paymentRequirements
      );
    case "evm":
    default: {
      const account = privateKeyToAccount(privateKeyOrClient as `0x${string}`);
      const chain = getChain(paymentRequirements.networkId);
      const client = createWalletClient({
        account,
        transport: http(),
        chain,
      }).extend(publicActions);

      return evmFacilitator.settle(
        client,
        payload as EvmPaymentPayload,
        paymentRequirements
      );
    }
  }
}

/**
 * Get supported payment schemes and networks for all implementations
 *
 * @returns Object containing supported schemes and networks for each blockchain
 */
export function getSupported(): {
  evm: evmFacilitator.Supported;
  solana: solanaFacilitator.Supported;
  arkade: arkadeFacilitator.Supported;
} {
  return {
    evm: {
      h402Version: 1,
      kind: [{ scheme: "exact", networkId: "evm" }],
    },
    solana: {
      h402Version: 1,
      kind: [{ scheme: "exact", networkId: "solana" }],
    },
    arkade: {
      h402Version: 1,
      kind: [{ scheme: "exact", networkId: "bitcoin" }],
    },
  };
}