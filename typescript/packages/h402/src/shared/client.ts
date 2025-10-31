import { Chain, createWalletClient, Hex, http, publicActions } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";
import { createKeyPairSignerFromBytes } from "@solana/signers";
import type { TransactionModifyingSigner } from "@solana/signers";
import type { Transaction } from "@solana/transactions";
import type { PaymentClient, EvmClient, SolanaClient, ArkadeClient } from "../types/shared/client";
import { Identity, SingleKey, Wallet } from "@arkade-os/sdk";
import { nip19 } from 'nostr-tools';

/**
 * Creates an EVM wallet client with public actions
 * @param privateKey - The private key as a hex string
 * @param chain - The chain configuration (e.g., base, mainnet, etc.)
 * @param rpcUrl - Optional custom RPC URL
 * @returns A wallet client with public actions extended
 */
export function createEvmClient(
  privateKey: Hex,
  chain: Chain,
  rpcUrl?: string
): EvmClient {
  return createWalletClient({
    account: privateKeyToAccount(privateKey),
    chain,
    transport: http(rpcUrl),
  }).extend(publicActions) as EvmClient;
}

/**
 * Creates a Solana client with signing capabilities
 * @param privateKey - The private key as a base58 string
 * @returns An object with publicKey and signTransaction method
 */
export function createSolanaClient(privateKey: string) : SolanaClient {
  const solanaKeypair = Keypair.fromSecretKey(bs58.decode(privateKey));
  
  return {
    publicKey: solanaKeypair.publicKey.toBase58(),
    signTransaction: async <T extends Transaction>(
      transactions: readonly T[],
    ): Promise<readonly T[]> => {
      const signer = await createKeyPairSignerFromBytes(solanaKeypair.secretKey);
      const signatures = await signer.signTransactions(transactions);
      
      const modifiedTransactions = transactions.map((transaction, index) => {
        const signature = signatures[index];
        if (!signature || Object.keys(signature).length === 0) {
          throw new Error(`Failed to sign transaction at index ${index}`);
        }
        return {
          ...transaction,
          signatures: {
            ...transaction.signatures,
            ...signature,
          },
        } as T;
      });
      
      return modifiedTransactions;
    },
  } satisfies {
    publicKey: string;
    signTransaction: TransactionModifyingSigner["modifyAndSignTransactions"];
  };
}

export function createArkadeClient(privateKey: string): ArkadeClient {
  let privateKeyHex: string;
  if (privateKey.startsWith('nsec')) {
    const { type, data } = nip19.decode(privateKey);
    if (type !== 'nsec') {
      throw new Error('Expected nsec (Nostr private key), got: ' + type);
    }
    privateKeyHex = Buffer.from(data).toString('hex');
  } else if(privateKey.length === 64) {
    privateKeyHex = privateKey;
  } else {
    throw new Error('Invalid private key format. Expected 64-character hex string or nsec encoded key.');
  }

  const identity = SingleKey.fromHex(privateKeyHex);

  return {
    identity,
    signAndSendTransaction: async (
       params: { address: string, amount: number }
    ): Promise<string> => {
      const wallet = await Wallet.create({
        identity,
        arkServerUrl: 'https://arkade.computer',
      });
      return wallet.sendBitcoin(params);
    },
  } satisfies {
    identity: Identity;
    signAndSendTransaction: (params: { address: string, amount: number }) => Promise<string>;
  };
}

export type { PaymentClient };

