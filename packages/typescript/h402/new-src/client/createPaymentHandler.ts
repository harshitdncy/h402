import { WalletClient } from "viem";

// TODO: Add JSDoc
async function createPaymentHandler(
  paymentDetails: PaymentDetails,
  evmClient?: WalletClient
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