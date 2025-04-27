import { exact } from "../schemes/index.js";
import { PaymentDetails, VerifyResponse } from "../types/index.js";
import { PublicActions } from "viem";
import { evm } from "../shared/index.js";
import { utils } from "./index.js";
import { parsePaymentDetailsForAmount } from "../shared/parsePaymentDetails.js";

/**
 * Verifies a payment payload against the provided payment details.
 *
 * @param {string} payload - The encoded payment payload to verify
 * @param {PaymentDetails} paymentDetails - The payment details to verify against
 * @returns {Promise<VerifyResponse>} A promise that resolves to the verification result
 *
 * @description
 * This function performs several verification steps:
 * 1. Creates a public client for the specified network
 * 2. Parses and validates payment details
 * 3. Decodes the payment payload
 * 4. Verifies the namespace and chain support
 * 5. Delegates to scheme-specific verification
 *
 * @throws Will return a VerifyResponse with isValid: false and an error message if verification fails
 */
async function verify(
  payload: string,
  paymentDetails: PaymentDetails
): Promise<VerifyResponse> {
  try {
    const client = utils.createPublicClient(paymentDetails.networkId);

    paymentDetails = await parsePaymentDetailsForAmount(
      paymentDetails,
      client as PublicActions
    );

    const payment = exact.evm.utils.decodePaymentPayload(payload);

    switch (paymentDetails.namespace) {
      case "eip155":
        if (!evm.isChainSupported(paymentDetails.networkId)) {
          return {
            isValid: false,
            errorMessage: "Unsupported namespace or chain",
          };
        }
        break;
      default:
        return {
          isValid: false,
          errorMessage: "Unsupported namespace",
        };
    }

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

export { verify };
