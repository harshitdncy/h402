# h402-hono

Hono middleware integration for the x402 Payment Protocol. This package allows you to easily add paywall functionality to your Hono applications using the x402 protocol.

## Installation

```bash
npm install @bit-gpt/h402-hono
```

## Quick Start

## Single Network Example

```typescript
import { Hono } from "hono";
import { paymentMiddleware } from "@bit-gpt/h402-hono";

const app = new Hono();

// Configure the payment middleware
app.use(paymentMiddleware(
  {
    "/protected-route": createRouteConfigFromPrice("$0.1", "bsc", "0xYourEVMAddress") // This doesn't work with Arkade Network
  }
));

// Implement your route
app.get("/protected-route", (c) => {
  return c.json({ message: "This content is behind a paywall" });
});

serve({
  fetch: app.fetch,
  port: 3000
});
```

## Multiple Networks Example

```typescript
import { Hono } from "hono";
import { paymentMiddleware } from "@bit-gpt/h402-hono";

const app = new Hono();

// Configure the payment middleware
app.use(
  paymentMiddleware(
    {
      "/protected-route": {
        paymentRequirements: [
          {
            scheme: "exact",
            namespace: "evm",
            tokenAddress: "0x55d398326f99059ff775485246999027b3197955", // USDT on BSC
            amountRequired: 0.01,
            amountRequiredFormat: "humanReadable",
            networkId: "56",
            payToAddress: "0xYourEVMAddress",
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
            payToAddress: "0xYourEVMAddress",
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
            payToAddress: "YourSolanaAddress",
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
            payToAddress: "YourArkadeAddress",
            description: "Premium content access with BTC via Arkade",
            tokenSymbol: "BTC",
            tokenDecimals: 8,
          },
        ],
      },
    }
  ),
);

// Implement your route
app.get("/protected-route", (c) => {
  return c.json({ message: "This content is behind a paywall" });
});

serve({
  fetch: app.fetch,
  port: 3000
});
```

## Configuration

The `paymentMiddleware` function accepts three parameters:

1. `routes`: Route configurations for protected endpoints (required)
2. `facilitator`: (Optional) Configuration for the h402 facilitator service

See the Middleware Options section below for detailed configuration options.

## Middleware Options

The middleware supports various configuration options:

### Route Configuration

```typescript
type RoutesConfig = Record<string, RouteConfig>;

type RouteConfig = {
  paymentRequirements: PaymentRequirements[];
};
```

Each route can be configured with either:
- A simple `Price` (string like `"$0.01"` or `Money` type) - this will be automatically converted to a `RouteConfig`
- A full `RouteConfig` object with detailed `paymentRequirements` array

### Facilitator Configuration

```typescript
type FacilitatorConfig = {
  url: Resource;                      // URL of the h402 facilitator service
  createAuthHeaders?: CreateHeaders;  // Optional function to create authentication headers
};
```
