import { config } from "dotenv";
import express from "express";
import {
  paymentMiddleware,
  Resource,
  createRouteConfigFromPrice,
  Network,
  isArkadeNetwork,
  isEVMNetwork,
  isSolanaNetwork,
} from "@bit-gpt/h402-express";

config();

const facilitatorUrl = process.env.FACILITATOR_URL as Resource;
const evmAddress = process.env.EVM_ADDRESS as `0x${string}`;
const solanaAddress = process.env.SOLANA_ADDRESS as string;
const arkadeAddress = process.env.ARKADE_ADDRESS as string;
const network = process.env.NETWORK as Network;

if (!facilitatorUrl || !network) {
  console.error("Missing required environment variables");
  process.exit(1);
}

if (!evmAddress && !solanaAddress && !arkadeAddress) {
  console.error(
    "Missing required environment variables: EVM_ADDRESS or SOLANA_ADDRESS or ARKADE_ADDRESS",
  );
  process.exit(1);
}

if (isSolanaNetwork(network) && !solanaAddress) {
  console.error("Missing required environment variable: SOLANA_ADDRESS");
  process.exit(1);
}

if (isEVMNetwork(network) && !evmAddress) {
  console.error("Missing required environment variable: EVM_ADDRESS");
  process.exit(1);
}

if (isArkadeNetwork(network) && !arkadeAddress) {
  console.error("Missing required environment variable: ARKADE_ADDRESS");
  process.exit(1);
}

const app = express();

console.log("Server is running");

app.use(
  paymentMiddleware(
    {
      // Use createRouteConfigFromPrice to construct the RouteConfig
      "/weather": createRouteConfigFromPrice(
        "$0.0001",
        network,
        evmAddress,
        solanaAddress,
      ),
      // Example of advanced configuration with multiple payment options
      "/premium/*": {
        paymentRequirements: [
          {
            scheme: "exact",
            namespace: "evm",
            tokenAddress: "0x55d398326f99059ff775485246999027b3197955", // USDT on BSC
            amountRequired: 0.01,
            amountRequiredFormat: "humanReadable",
            networkId: "56",
            payToAddress: evmAddress,
            description: "Premium content access with USDT on BSC",
            tokenDecimals: 18,
            tokenSymbol: "USDT",
          },
          {
            scheme: "exact",
            namespace: "evm",
            tokenAddress: "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2", // USDT on Base
            amountRequired: 0.01, 
            amountRequiredFormat: "humanReadable", 
            networkId: "8453", 
            payToAddress: evmAddress,
            description: "Premium content access with USDT on Base",
            tokenDecimals: 6,
            tokenSymbol: "USDT",
          },
          {
            scheme: "exact",
            namespace: "solana",
            tokenAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", // USDC on Solana
            amountRequired: 0.01,
            amountRequiredFormat: "humanReadable",
            networkId: "mainnet",
            payToAddress: solanaAddress, // Example Solana address
            description: "Premium content access with USDC on Solana",
            tokenDecimals: 6,
            tokenSymbol: "USDC",
          },
          {
            scheme: "exact",
            namespace: "arkade",
            amountRequired: 0.00001, // Amount should be more than dust amount otherwise it will be rejected
            amountRequiredFormat: "humanReadable",
            networkId: "bitcoin",
            payToAddress: arkadeAddress,
            description: "Premium content access with BTC via Arkade",
            tokenSymbol: "BTC",
            tokenDecimals: 8,
          },
        ],
      },
    },
    {
      url: facilitatorUrl,
    },
  ),
);

app.get("/weather", (req, res) => {
  res.send({
    report: {
      weather: "sunny",
      temperature: 70,
    },
  });
});

app.get("/premium/content", (req, res) => {
  res.send({
    content: "This is premium content accessible via multiple payment methods",
    supportedPayments: ["USDT on BSC", "USDT on Base", "USDC on Solana"],
  });
});

app.listen(4021, () => {
  console.log(`Server listening at http://localhost:${4021}`);
});
