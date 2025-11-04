import { Namespace } from "../types/verify/h402Specs";

/**
 * Gets the maximum amount of coins for a given namespace
 * @param namespace - The namespace to get the maximum amount of coins for
 * @returns The maximum amount of coins for the given namespace
 */
export function getMaxValueForNamespace(namespace: Namespace): bigint {
  switch (namespace) {
    case "evm":
    case "solana":
      return BigInt(0.1 * 10 ** 6); // 0.1 USDC
    case "arkade":
      return BigInt(0.00001 * 10 ** 8); // 0.00001 BTC
  }
}