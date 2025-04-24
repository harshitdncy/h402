import type { PaymentDetails, VerifyResponse } from "../types/index.js";
import { evm } from "../shared/index.js";
import { exact } from "../schemes/index.js";

// TODO: Add JSDoc
async function verify(
  client: evm.PublicClient,
  payload: string,
  paymentDetails: PaymentDetails
): Promise<VerifyResponse> {
  try {
    // Decode the payload
    const payment = exact.evm.decodePayment(payload);

    // Verify namespace and chain support
    if (
      paymentDetails.namespace !== "eip155" ||
      !evm.isChainSupported(paymentDetails.chainId)
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
async function settle(
  client: evm.WalletClient,
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

export { verify, settle };
