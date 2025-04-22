import {
  createPublicClient as createViemPublicClient,
  createWalletClient,
  http,
  publicActions,
} from "viem";
import type {
  Chain,
  Transport,
  Client,
  Account,
  RpcSchema,
  PublicActions,
  WalletActions,
  PublicClient as ViemPublicClient,
  HttpTransport,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { Hex } from "@/types";
import { getChain, getRPCEnvVariable, isChainSupported } from "./chain";

export type WalletClient<
  chain extends Chain = Chain,
  transport extends Transport = Transport,
  account extends Account = Account
> = Client<
  transport,
  chain,
  account,
  RpcSchema,
  PublicActions<transport, chain, account> & WalletActions<chain, account>
>;

export type PublicClient<
  transport extends Transport = Transport,
  chain extends Chain | undefined = Chain
> = ViemPublicClient<transport, chain>;

function createTransport(rpcEnvVariable: string): HttpTransport {
  const rpcUrl = process.env[rpcEnvVariable];
  return http(rpcUrl);
}

function validateChainId(chainId: string): void {
  if (!isChainSupported(chainId)) {
    throw new Error(`Unsupported chain ID: ${chainId}`);
  }
}

export function createPublicClient(chainId: string): PublicClient {
  validateChainId(chainId);

  const rpcEnvVariable = getRPCEnvVariable(chainId);
  const chain = getChain(chainId);
  const transport = createTransport(rpcEnvVariable);

  return createViemPublicClient({
    chain,
    transport,
  }).extend(publicActions);
}

export function createSignerClient(
  chainId: string,
  privateKey: Hex
): WalletClient {
  validateChainId(chainId);

  if (!privateKey) {
    throw new Error("Private key is required");
  }

  const rpcEnvVariable = getRPCEnvVariable(chainId);
  const chain = getChain(chainId);
  const transport = createTransport(rpcEnvVariable);
  const account = privateKeyToAccount(privateKey);

  return createWalletClient({
    chain,
    transport,
    account,
  }).extend(publicActions);
}
