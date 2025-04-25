import { type PaymentDetails } from "@bit-gpt/h402";

export const paymentDetails: PaymentDetails = {
  scheme: "evm",
  namespace: "eip155",
  chainId: "56",
  amountRequired: BigInt("10000000000000000"), // 0.01 USDT
  tokenAddress: "0x55d398326f99059fF775485246999027B3197955",
  tokenDecimals: 18,
  resource: "example-resource",
  description: "Access to protected content",
  mimeType: "application/json",
  outputSchema: null,
  toAddress: "0xc60d20FB910794df939eA1B758B367d7114733ae",
  estimatedProcessingTime: 60,
  extra: null,
};
