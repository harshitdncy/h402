import { PaymentRequirements } from "@bit-gpt/h402-next";

export const evmPaymentRequirementsUSDTonBSC: PaymentRequirements = {
  namespace: "evm",
  tokenAddress: "0x55d398326f99059ff775485246999027b3197955", // USDT on BSC
  amountRequired: 0.01, // 0.01 USDT
  amountRequiredFormat: "humanReadable", // Human readable format
  payToAddress: "0xc60d20FB910794df939eA1B758B367d7114733ae",
  networkId: "56", // BSC Chain ID
  description: "Access to generated images (EVM)",
  resource: "https://example.com/resource",
  scheme: "exact",
  mimeType: "application/json",
  outputSchema: null,
  estimatedProcessingTime: 30,
  extra: null,
  maxAmountRequired: undefined,
  requiredDeadlineSeconds: undefined,
  tokenDecimals: 18,
  tokenSymbol: "USDT",
};

// EVM native token payment option (BNB)
export const evmNativePaymentRequirements: PaymentRequirements = {
  namespace: "evm",
  tokenAddress: "0x0000000000000000000000000000000000000000", // Special address for native token
  amountRequired: 0.01, // 0.01 BNB
  amountRequiredFormat: "humanReadable", // Human readable format
  payToAddress: "0xc60d20FB910794df939eA1B758B367d7114733ae",
  networkId: "56", // BSC Chain ID
  description: "Access to generated images with BNB",
  resource: "https://example.com/resource",
  scheme: "exact",
  mimeType: "application/json",
  outputSchema: null,
  estimatedProcessingTime: 30,
  extra: null,
  maxAmountRequired: undefined,
  requiredDeadlineSeconds: undefined,
  tokenDecimals: 18,
  tokenSymbol: "BNB",
};

export const evmPaymentRequirementsUSDTOnBase: PaymentRequirements = {
  namespace: "evm",
  tokenAddress: "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2", // USDT on Base
  amountRequired: 0.01, // 0.01 USDT
  amountRequiredFormat: "humanReadable", // smallest unit format
  payToAddress: "0xc60d20FB910794df939eA1B758B367d7114733ae",
  networkId: "8453", // Base Chain ID
  description: "Get weather data with Base",
  resource: "https://example.com/resource",
  scheme: "exact",
  mimeType: "application/json",
  outputSchema: null,
  estimatedProcessingTime: 30,
  extra: null,
  maxAmountRequired: undefined,
  requiredDeadlineSeconds: undefined,
  tokenDecimals: 6,
  tokenSymbol: "USDT",
};

export const evmPaymentRequirementsUSDTonPolygon: PaymentRequirements = {
  namespace: "evm",
  tokenAddress: "0xc2132d05d31c914a87c6611c10748aeb04b58e8f", // USDT on Polygon
  amountRequired: 0.0001, // 0.01 USDT
  amountRequiredFormat: "humanReadable", // Human readable format
  payToAddress: "0xc60d20FB910794df939eA1B758B367d7114733ae",
  networkId: "137", // Polygon Chain ID
  description: "Access to generated images (EVM)",
  resource: "https://example.com/resource",
  scheme: "exact",
  mimeType: "application/json",
  outputSchema: null,
  estimatedProcessingTime: 30,
  extra: null,
  maxAmountRequired: undefined,
  requiredDeadlineSeconds: undefined,
  tokenDecimals: 6,
  tokenSymbol: "USDT",
};

export const evmPaymentRequirementsUSDConPolygon: PaymentRequirements = {
  namespace: "evm",
  tokenAddress: "0x3c499c542cef5e3811e1192ce70d8cc03d5c3359", // USDC on Polygon
  amountRequired: 0.0001, // 0.01 USDT
  amountRequiredFormat: "humanReadable", // Human readable format
  payToAddress: "0xc60d20FB910794df939eA1B758B367d7114733ae",
  networkId: "137", // Polygon Chain ID
  description: "Access to generated images (EVM)",
  resource: "https://example.com/resource",
  scheme: "exact",
  mimeType: "application/json",
  outputSchema: null,
  estimatedProcessingTime: 30,
  extra: null,
  maxAmountRequired: undefined,
  requiredDeadlineSeconds: undefined,
  tokenDecimals: 6,
  tokenSymbol: "USDC",
};

// Solana payment option (native SOL)
export const solanaNativePaymentRequirements: PaymentRequirements = {
  namespace: "solana",
  tokenAddress: "11111111111111111111111111111111", // System Program ID for native SOL
  amountRequired: 10000000, // 0.01 SOL in lamports
  amountRequiredFormat: "smallestUnit", // Amount is in lamports
  payToAddress: "4pX5LbCK85Sf6iLXMwUodo2f5rvQKAofyhANT6TUwG3f",
  networkId: "mainnet",
  description: "Generate AI image with Solana",
  resource: "https://example.com/resource",
  scheme: "exact",
  mimeType: "application/json",
  outputSchema: null,
  estimatedProcessingTime: 30,
  extra: null,
  maxAmountRequired: undefined,
  requiredDeadlineSeconds: undefined,
  tokenDecimals: 9,
  tokenSymbol: "SOL",
};

// Solana SPL token payment option (example with USDC)
export const solanaSplPaymentRequirementsUSDC: PaymentRequirements = {
  namespace: "solana",
  tokenAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", // USDC on Solana
  amountRequired: 10000, // 0.01 USDC in smallest units (6 decimals)
  amountRequiredFormat: "smallestUnit", // Amount is in smallest units
  payToAddress: "4pX5LbCK85Sf6iLXMwUodo2f5rvQKAofyhANT6TUwG3f",
  networkId: "mainnet",
  description: "Generate AI image with USDC on Solana",
  resource: "https://example.com/resource",
  scheme: "exact",
  mimeType: "application/json",
  outputSchema: null,
  estimatedProcessingTime: 30,
  extra: null,
  maxAmountRequired: undefined,
  requiredDeadlineSeconds: undefined,
  tokenDecimals: 6,
  tokenSymbol: "USDC",
};

export const evmPaymentRequirementsUSDTonSEI: PaymentRequirements = {
  namespace: "evm",
  tokenAddress: "0x9151434b16b9763660705744891fa906f660ecc5", // USDT on Sei
  amountRequired: 0.01, // 0.01 USDT
  amountRequiredFormat: "humanReadable", // Human readable format
  payToAddress: "0xc60d20FB910794df939eA1B758B367d7114733ae",
  networkId: "1329", // Sei Chain ID
  description: "Access to generated images (EVM)",
  resource: "https://example.com/resource",
  scheme: "exact",
  mimeType: "application/json",
  outputSchema: null,
  estimatedProcessingTime: 30,
  extra: null,
  maxAmountRequired: undefined,
  requiredDeadlineSeconds: undefined,
  tokenDecimals: 6,
  tokenSymbol: "USDT",
};

export const imageGenerationPaymentRequirements: PaymentRequirements[] = [
  evmPaymentRequirementsUSDTonBSC,
  solanaNativePaymentRequirements,
  solanaSplPaymentRequirementsUSDC,
  evmNativePaymentRequirements,
  evmPaymentRequirementsUSDTOnBase,
  evmPaymentRequirementsUSDTonPolygon,
  evmPaymentRequirementsUSDConPolygon,
  evmPaymentRequirementsUSDTonSEI
];
