import type { PublicActions, WalletClient } from "viem";
import type {
  TransactionModifyingSigner,
  TransactionSendingSigner,
} from "@solana/signers";
import { ArkProvider, Identity } from "@arkade-os/sdk";

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
   * Sign and return a transaction without broadcasting (preferred for facilitator control)
   * Custom implementation that wraps Arkade SDK to return signed tx before broadcasting
   * Returns: { signedTx: base64-encoded-PSBT, checkpoints?: base64-PSBTs[], txid: string }
   */
  signTransaction?: (params: {
    address: string;
    amount: number; // sats
  }) => Promise<{
    signedTx: string;
    checkpoints?: string[];
    txid: string;
  }>;
  
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
   * Optional: Access to the underlying Ark provider for advanced operations
   */
  arkProvider?: ArkProvider; // RestArkProvider from @arkade-os/sdk
  
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
