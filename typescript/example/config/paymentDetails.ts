import { PaymentDetails } from "@bit-gpt/h402/types";

export const paymentDetails: PaymentDetails = {
  scheme: "evm",
  namespace: "eip155",
  networkId: "56",
  amountRequired: 0.01,
  amountRequiredFormat: "formatted",
  tokenAddress: "0x55d398326f99059fF775485246999027B3197955",
  resource: "image-generation",
  description: "Access to generated images",
  mimeType: "application/json",
  outputSchema: null,
  payToAddress: "0xc60d20FB910794df939eA1B758B367d7114733ae",
  estimatedProcessingTime: 60,
  extra: null,
};
