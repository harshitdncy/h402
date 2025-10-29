import type {
  PaymentRequirements,
  EnrichedPaymentRequirements,
} from "../types/index.js";
import {
  getTokenDecimals as getSolanaTokenDecimals,
  getTokenSymbol as getSolanaTokenSymbol,
} from "./solana/tokenMetadata.js";
import {
  getTokenDecimals as getEvmTokenDecimals,
  getTokenSymbol as getEvmTokenSymbol,
} from "./evm/tokenMetadata.js";

/**
 * Enrich payment requirements with token metadata (decimals and symbol)
 * This is used by the middleware before redirecting to the paywall
 */
export async function enrichPaymentRequirements(
  requirements: PaymentRequirements[]
): Promise<EnrichedPaymentRequirements[]> {
  return Promise.all(
    requirements.map(async (req) => {
      // Skip if metadata is already present
      if (req.tokenDecimals !== undefined && req.tokenSymbol !== undefined) {
        return req as EnrichedPaymentRequirements;
      }

      // Handle different namespaces
      if (req.namespace === "solana") {
        // Get token metadata for Solana tokens
        const [decimals, symbol] = await Promise.all([
          getSolanaTokenDecimals(req.tokenAddress),
          getSolanaTokenSymbol(req.tokenAddress),
        ]);

        return {
          ...req,
          tokenDecimals: decimals,
          tokenSymbol: symbol || "UNKNOWN",
        };
      } else if (req.namespace === "evm") {
        // Get token metadata for EVM tokens
        const [decimals, symbol] = await Promise.all([
          getEvmTokenDecimals(req.tokenAddress),
          getEvmTokenSymbol(req.tokenAddress),
        ]);

        return {
          ...req,
          tokenDecimals: decimals,
          tokenSymbol: symbol || "UNKNOWN",
        };
      } else if (req.namespace === "arkade") {
        // Arkade only supports BTC/satoshi offchain (no token addresses)
        return {
          ...req,
          tokenDecimals: 8, // satoshis
          tokenSymbol: "BTC",
        };
      }

      // Return unchanged for unknown namespaces
      return req as EnrichedPaymentRequirements;
    })
  );
}
