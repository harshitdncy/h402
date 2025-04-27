import { PublicActions, WalletClient } from "viem";
import { PaymentDetails } from "../types/index.js";
import { evm } from "../shared/index.js";
import { exact } from "../schemes/index.js";
import { parsePaymentDetailsForAmount } from "../shared/parsePaymentDetails.js";

/**
 * Creates a payment based header on the provided payment details and client.
 *
 * @param {PaymentDetails} paymentDetails - The details of the payment to be created
 * @param {Object} client - The client object containing chain-specific clients
 * @param {(WalletClient & PublicActions)} [client.evmClient] - The EVM client for EIP-155 payments
 * @returns {Promise<string>} A promise that resolves to the payment header
 *
 * @throws {Error} If payment details namespace is missing
 * @throws {Error} If the specified EVM network is not supported
 * @throws {Error} If evmClient is missing for EIP-155 payments
 * @throws {Error} If EVM client chainId doesn't match payment networkId
 * @throws {Error} If the namespace is not supported
 * @throws {Error} If the payment scheme is not supported
 *
 * @description
 * This function handles the payment creation process by:
 * 1. Validating the payment namespace
 * 2. For EIP-155 (EVM) payments:
 *    - Verifies network support
 *    - Validates client configuration
 *    - Ensures chain ID matches
 *    - Processes the payment based on the specified scheme
 * 3. Encodes and returns the payment data
 */
async function createPayment(
  paymentDetails: PaymentDetails,
  client: { evmClient?: WalletClient & PublicActions }
): Promise<string> {
  if (!paymentDetails.namespace) {
    throw new Error("Payment details namespace is required");
  }

  paymentDetails = await parsePaymentDetailsForAmount(
    paymentDetails,
    client.evmClient as PublicActions
  );

  switch (paymentDetails.namespace) {
    case "eip155": {
      if (!Object.keys(evm.chains).includes(paymentDetails.networkId)) {
        throw new Error(`Unsupported EVM Network: ${paymentDetails.networkId}`);
      }
      if (!client.evmClient) {
        throw new Error("evmClient is required for EIP-155 payments");
      }
      if (client.evmClient.chain?.id.toString() !== paymentDetails.networkId) {
        throw new Error(
          `EVM client chainId doesn't match payment networkId: ${paymentDetails.networkId}`
        );
      }
      switch (paymentDetails.scheme) {
        case "exact":
          return await exact.evm.createPayment(
            client.evmClient,
            paymentDetails
          );
        default:
          throw new Error(`Unsupported scheme: ${paymentDetails.scheme}`);
      }
    }
    default:
      throw new Error(`Unsupported namespace: ${paymentDetails.namespace}`);
  }
}

export { createPayment };
