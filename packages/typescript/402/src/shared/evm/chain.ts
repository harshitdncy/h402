import { base, bsc, mainnet } from "viem/chains";
import type { Chain } from "viem/chains";

type ChainConfig = {
  chain: Chain;
  rpcEnvVariable: string;
};

type ChainRegistry = {
  readonly [chainId: string]: ChainConfig;
};

const FALLBACK_CHAIN_ID = "1";

export const chains: ChainRegistry = {
  "1": {
    chain: mainnet,
    rpcEnvVariable: "ETHEREUM_RPC_URL",
  },
  "8453": {
    chain: base,
    rpcEnvVariable: "BASE_RPC_URL",
  },
  "56": {
    chain: bsc,
    rpcEnvVariable: "BSC_RPC_URL",
  },
} as const;

export function getChain(chainId: string): Chain {
  if (!chains[chainId]) {
    console.warn(
      `Chain ID ${chainId} not found, falling back to default chain ${FALLBACK_CHAIN_ID}`
    );
  }
  return chains[chainId]?.chain ?? chains[FALLBACK_CHAIN_ID].chain;
}

export function getRPCEnvVariable(chainId: string): string {
  if (!chains[chainId]) {
    console.warn(
      `Chain ID ${chainId} not found, falling back to default chain ${FALLBACK_CHAIN_ID}`
    );
  }
  return (
    chains[chainId]?.rpcEnvVariable ?? chains[FALLBACK_CHAIN_ID].rpcEnvVariable
  );
}

export function isChainSupported(chainId: string): boolean {
  return chainId in chains;
}
