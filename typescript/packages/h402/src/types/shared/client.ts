import type { PublicActions, WalletClient } from "viem";
import type {
  TransactionModifyingSigner,
  TransactionSendingSigner,
} from "@solana/signers";
import { Identity } from "@arkade-os/sdk";

/**
 * Interface for Solana client used in payment operations
 */
export interface SolanaClient {
  publicKey: string;
  signAndSendTransaction?: TransactionSendingSigner["signAndSendTransactions"];
  signTransaction?: TransactionModifyingSigner["modifyAndSignTransactions"];
}

/**
 * Interface for EVM client used in payment operations
 */
export interface EvmClient extends WalletClient, PublicActions {}

/**
 * Interface for Arkade client used in payment operations
 * Uses the Arkade SDK's Wallet for VTXO-based Bitcoin payments
 * Reference: https://github.com/arkade-os/ts-sdk
 */
export interface ArkadeClient {
  /**
   * Sign and immediately broadcast transaction
   * This is the native method from @arkade-os/sdk Wallet
   * @param params - { address: string, amount: number (in sats) }
   * @returns arkTxid
   */
  signAndSendTransaction?: (params: {
    address: string;
    amount: number; // sats
  }) => Promise<string>;

  /**
   * Optional: The wallet's Identity for signing (needed for checkpoint finalization)
   */
  identity?: Identity; // Identity from @arkade-os/sdk
}

/**
 * Interface for the payment client that can handle different blockchains
 */
export interface PaymentClient {
  evmClient?: EvmClient;
  solanaClient?: SolanaClient;
  arkadeClient?: ArkadeClient;
}
