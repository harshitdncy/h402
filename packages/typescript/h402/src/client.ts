import { evm } from "./shared/index.js";
import type {
  PaymentDetails,
  SettleResponse,
  VerifyResponse,
} from "./types/index.js";
import { exact } from "./schemes/index.js";
import { toJsonSafe } from "./utils/index.js";

// TODO: Add JSDoc
async function createPaymentHandler(
  paymentDetails: PaymentDetails,
  evmClient?: evm.WalletClient
): Promise<string> {
  if (!paymentDetails?.namespace) {
    throw new Error("Payment details namespace is required");
  }

  switch (paymentDetails.namespace) {
    case "eip155": {
      if (!Object.keys(evm.chains).includes(paymentDetails.chainId)) {
        throw new Error(`Unsupported EVM Network: ${paymentDetails.chainId}`);
      }
      if (!evmClient) {
        throw new Error("EVM client is required for EIP-155 payments");
      }
      return await exact.evm.createPaymentHeader(evmClient, paymentDetails);
    }
    case "solana":
      throw new Error("Solana payments not yet implemented");
    case "bip122":
      throw new Error("Bitcoin payments not yet implemented");
    default:
      throw new Error(`Unsupported namespace: ${paymentDetails.namespace}`);
  }
}

type FacilitatorResponse<T> = {
  data: T;
  error?: string;
};

// TODO: Add JSDoc
function useFacilitator(url: string) {
  async function makeRequest<T>(
    endpoint: string,
    payload: string,
    paymentDetails: PaymentDetails
  ): Promise<FacilitatorResponse<T>> {
    const response = await fetch(`${url}/${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        payload,
        details: toJsonSafe(paymentDetails),
      }),
    });

    if (!response.ok) {
      const error = await response.text().catch(() => response.statusText);
      throw new Error(`Failed to ${endpoint} payment: ${error}`);
    }

    const result = (await response.json()) as FacilitatorResponse<T>;
    if (result.error) {
      throw new Error(result.error);
    }

    return { data: result.data, error: result.error };
  }

  return {
    verify: (payload: string, paymentDetails: PaymentDetails) =>
      makeRequest<VerifyResponse>("vefify", payload, paymentDetails),
    // verifyTxHash: (payload: string, paymentDetails: PaymentDetails) =>
    //   makeRequest<VerifyResponse>("verify_txhash", payload, paymentDetails),
    settle: (payload: string, paymentDetails: PaymentDetails) =>
      makeRequest<SettleResponse>("settle", payload, paymentDetails),
  };
}

export { createPaymentHandler, useFacilitator };
