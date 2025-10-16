import { config } from "dotenv";
import { decodeXPaymentResponse, wrapFetchWithPayment } from "@bit-gpt/h402-fetch";
import { Chain, createWalletClient, http, publicActions, type Hex } from "viem";
import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";
import { createKeyPairSignerFromBytes } from "@solana/signers";
import type { TransactionModifyingSigner } from "@solana/signers";
import type { Transaction } from "@solana/transactions";
import { privateKeyToAccount } from "viem/accounts";
import { bsc } from "viem/chains";

config();

const evmPrivateKey = process.env.EVM_PRIVATE_KEY as Hex | undefined;
const solanaPrivateKey = process.env.SOLANA_PRIVATE_KEY as string | undefined;
const baseURL = process.env.RESOURCE_SERVER_URL as string; // e.g. https://example.com
const endpointPath = process.env.ENDPOINT_PATH as string; // e.g. /weather
const url = `${baseURL}${endpointPath}`; // e.g. https://example.com/weather

if (!baseURL || !endpointPath) {
  console.error("Missing required environment variables: RESOURCE_SERVER_URL or ENDPOINT_PATH");
  process.exit(1);
}

if (!evmPrivateKey && !solanaPrivateKey) {
  console.error("At least one of EVM_PRIVATE_KEY or SOLANA_PRIVATE_KEY must be provided");
  process.exit(1);
}

const evmClient = evmPrivateKey
  ? createWalletClient({
      account: privateKeyToAccount(evmPrivateKey),
      chain: bsc as Chain,
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

const fetchWithPayment = wrapFetchWithPayment(fetch, paymentClient);

fetchWithPayment(url, {
  method: "GET",
})
  .then(async response => {
    const body = await response.json();
    console.log(body);

    const paymentResponse = decodeXPaymentResponse(response.headers.get("x-payment-response")!);
    console.log(paymentResponse);
  })
  .catch(error => {
    console.error(error.response?.data?.error);
  });
