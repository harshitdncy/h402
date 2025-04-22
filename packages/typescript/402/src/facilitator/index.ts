import type { PaymentDetails, VerifyResponse } from "@/types";
import {
  isChainSupported,
  type PublicClient,
  type WalletClient,
} from "@/shared/evm";
import { exact } from "@/schemes";

// TODO: Add JSDoc
export async function verify(
  client: PublicClient,
  payload: string,
  paymentDetails: PaymentDetails
): Promise<VerifyResponse> {
  try {
    // Decode the payload
    const payment = exact.evm.decodePayment(payload);

    // Verify namespace and chain support
    if (
      paymentDetails.namespace !== "eip155" ||
      !isChainSupported(paymentDetails.chainId)
    ) {
      return {
        isValid: false,
        errorMessage: "Unsupported namespace or chain",
      };
    }

    // Verify scheme
    switch (payment.scheme) {
      case "exact":
        return await exact.evm.verify(client, payment, paymentDetails);
      default:
        return {
          isValid: false,
          errorMessage: "Unsupported scheme",
        };
    }
  } catch (error) {
    return {
      isValid: false,
      errorMessage: error instanceof Error ? error.message : String(error),
    };
  }
}

// TODO: Add JSDoc
export async function settle(
  client: WalletClient,
  payload: string,
  paymentDetails: PaymentDetails
): Promise<{ txHash: string } | { errorMessage: string }> {
  try {
    // Decode the payload
    const payment = exact.evm.decodePayment(payload);

    // Perform scheme-specific settlement
    return await exact.evm.settle(client, payment, paymentDetails);
  } catch (error) {
    return {
      errorMessage: error instanceof Error ? error.message : String(error),
    };
  }
}
