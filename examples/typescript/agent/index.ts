import Anthropic from "@anthropic-ai/sdk";
import { config } from "dotenv";
import { Chain, createWalletClient, Hex, http, publicActions } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { wrapFetchWithPayment } from "@bit-gpt/h402-fetch";
import { base } from "viem/chains";
import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";
import { createKeyPairSignerFromBytes } from "@solana/signers";
import type { TransactionModifyingSigner } from "@solana/signers";
import type { Transaction } from "@solana/transactions";

config();

const evmPrivateKey = process.env.EVM_PRIVATE_KEY as Hex | undefined;
const solanaPrivateKey = process.env.SOLANA_PRIVATE_KEY as string | undefined;
const baseURL = process.env.RESOURCE_SERVER_URL as string;

if (!baseURL) {
  console.error("Missing RESOURCE_SERVER_URL environment variable");
  process.exit(1);
}

if (!evmPrivateKey && !solanaPrivateKey) {
  console.error("At least one of EVM_PRIVATE_KEY or SOLANA_PRIVATE_KEY must be provided");
  process.exit(1);
}

const evmClient = evmPrivateKey
  ? createWalletClient({
      account: privateKeyToAccount(evmPrivateKey),
      chain: base as Chain,
      transport: http(),
    }).extend(publicActions)
  : undefined;

const solanaClient = solanaPrivateKey
  ? (() => {
      const solanaKeypair = Keypair.fromSecretKey(bs58.decode(solanaPrivateKey));
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
    })()
  : undefined;

const paymentClient = {
  evmClient,
  solanaClient,
};

const anthropic = new Anthropic({
  baseURL,
  apiKey: "not needed",
  fetch: wrapFetchWithPayment(fetch, paymentClient),
});

const msg = await anthropic.messages.create({
  model: "claude-3-7-sonnet-20250219",
  max_tokens: 1024,
  messages: [{ role: "user", content: "Hello, Claude do you know what h402 is?" }],
});
console.log(msg);
