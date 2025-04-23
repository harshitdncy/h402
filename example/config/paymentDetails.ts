import { type PaymentDetails } from "@bit-gpt/h402/dist/src/types";

export const paymentDetails: PaymentDetails = {
  scheme: "evm",
  namespace: "eip155",
  chainId: "1",
  amountRequired: BigInt("1000000000000000"),
  tokenAddress: "0x0000000000000000000000000000000000000000",
  tokenDecimals: 18,
  resource: "example-resource",
  description: "Access to protected content",
  mimeType: "application/json",
  outputSchema: null,
  toAddress: "0x1234567890123456789012345678901234567890",
  estimatedProcessingTime: 60,
  extra: null
};