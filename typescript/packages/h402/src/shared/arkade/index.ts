/**
 * Shared utilities for Arkade (Bitcoin via Ark protocol)
 * Reference: https://github.com/arkade-os/ts-sdk
 */

// Re-export utilities from @arkade-os/sdk for convenience
export { ArkAddress, RestArkProvider, RestIndexerProvider } from "@arkade-os/sdk";

// Re-export Arkade network types from centralized network definitions
export type { ArkadeNetwork } from "../../types/shared/network.js";
export { SupportedArkadeNetworks as ARKADE_NETWORKS } from "../../types/shared/network.js";

// Import ArkadeNetwork type for use in this file
import type { ArkadeNetwork } from "../../types/shared/network.js";

// Constants
export const NATIVE_BTC_DECIMALS = 8; // Bitcoin uses 8 decimal places (satoshis)
export const BTC_SYMBOL = "BTC";

/**
 * Default Arkade server URLs by network
 * Note: ArkadeNetwork type is imported from centralized network definitions
 */
export const ARKADE_SERVER_URLS: Record<ArkadeNetwork, string> = {
  bitcoin: "https://arkade.computer",
};

