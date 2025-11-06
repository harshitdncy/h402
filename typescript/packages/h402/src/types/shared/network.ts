import { z } from "zod";

// Define network types
export const EVMNetworkSchema = z.enum([
  "base", "avalanche", "iotex", "bsc", "polygon", "sei", "story", "abstract", "peaq"
]);

export const SolanaNetworkSchema = z.enum(["solana"]);

export const ArkadeNetworkSchema = z.enum(["bitcoin"]);

// Combined network schema
export const NetworkSchema = z.union([EVMNetworkSchema, SolanaNetworkSchema, ArkadeNetworkSchema]);

export type EVMNetwork = z.infer<typeof EVMNetworkSchema>;
export type SolanaNetwork = z.infer<typeof SolanaNetworkSchema>;
export type ArkadeNetwork = z.infer<typeof ArkadeNetworkSchema>;
export type Network = z.infer<typeof NetworkSchema>;

// Network categorization
export const SupportedEVMNetworks: EVMNetwork[] = [
  "base",
  "avalanche",
  "iotex",
  "bsc",
  "polygon",
  "sei",
  "story",
  "abstract",
  "peaq"
];

export const SupportedSolanaNetworks: SolanaNetwork[] = ["solana"];

export const SupportedArkadeNetworks: ArkadeNetwork[] = ["bitcoin"];

export const SupportedNetworks: Network[] = [
  ...SupportedEVMNetworks,
  ...SupportedSolanaNetworks,
  ...SupportedArkadeNetworks,
];

// EVM-specific mappings
export const EvmNetworkToChainId = new Map<EVMNetwork, number>([
  ["base", 8453],
  ["avalanche", 43114],
  ["iotex", 4689],
  ["bsc", 56],
  ["polygon", 137],
  ["sei", 1329],
  ["story", 1514],
  ["abstract", 2741],
  ["peaq", 3338],
]);

export const ChainIdToEvmNetwork = Object.fromEntries(
  SupportedEVMNetworks.map((network) => [
    EvmNetworkToChainId.get(network),
    network,
  ])
) as Record<number, EVMNetwork>;

// Solana-specific mappings (using cluster names)
export const SolanaNetworkToCluster = new Map<SolanaNetwork, string>([
  ["solana", "mainnet-beta"],
]);

export const ClusterToSolanaNetwork = Object.fromEntries(
  SupportedSolanaNetworks.map((network) => [
    SolanaNetworkToCluster.get(network),
    network,
  ])
) as Record<string, SolanaNetwork>;

// Utility functions for network type checking
export const isEVMNetwork = (network: Network): network is EVMNetwork => {
  return SupportedEVMNetworks.includes(network as EVMNetwork);
};

export const isSolanaNetwork = (network: Network): network is SolanaNetwork => {
  return SupportedSolanaNetworks.includes(network as SolanaNetwork);
};

export const isArkadeNetwork = (network: Network): network is ArkadeNetwork => {
  return SupportedArkadeNetworks.includes(network as ArkadeNetwork);
};

// Network metadata (optional - for display purposes)
export const NetworkMetadata = {
  // EVM Networks
  base: { name: "Base", type: "evm" },
  avalanche: { name: "Avalanche", type: "evm" },
  iotex: { name: "IoTeX", type: "evm" },
  bsc: { name: "BNB Smart Chain", type: "evm" },
  polygon: { name: "Polygon", type: "evm" },
  sei: { name: "Sei", type: "evm" },
  story: { name: "Story", type: "evm" },
  abstract: { name: "Abstract", type: "evm" },
  peaq: { name: "Peaq", type: "evm" },
  // Solana Networks
  solana: { name: "Solana", type: "solana" },
  // Arkade Networks (Bitcoin)
  bitcoin: { name: "Bitcoin Mainnet", type: "arkade" },
} as const;

// Helper to get network type
export const getNetworkType = (network: Network): "evm" | "solana" | "arkade" => {
  if (isEVMNetwork(network)) return "evm";
  if (isSolanaNetwork(network)) return "solana";
  if (isArkadeNetwork(network)) return "arkade";
  throw new Error(`Unknown network type: ${network}`);
};

// Check if a networkId/chainId corresponds to a supported EVM network
export const isSupportedEVMNetworkId = (
  networkId: number | string
): boolean => {
  const id =
    typeof networkId === "string" ? parseInt(networkId, 10) : networkId;
  return !isNaN(id) && ChainIdToEvmNetwork.hasOwnProperty(id);
};

// Get EVM network from networkId/chainId
export const getEVMNetworkById = (
  networkId: number | string
): EVMNetwork | undefined => {
  const id =
    typeof networkId === "string" ? parseInt(networkId, 10) : networkId;
  return !isNaN(id) ? ChainIdToEvmNetwork[id] : undefined;
};
