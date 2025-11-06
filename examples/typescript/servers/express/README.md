# h402-express Example Server

This is an example Express.js server that demonstrates how to use the `h402-express` middleware to implement paywall functionality in your API endpoints with support for multiple payment methods and cross-chain payments.

## Features

- **Multiple Payment Options**: Each route can accept payments via different tokens/networks
- **Cross-Chain Support**: Accept payments on both EVM chains (BSC USDT) and Solana (USDC) and Arkade (BTC)
- **User Choice**: Users can choose their preferred payment method from available options
- **Simple Configuration**: Use helper functions for basic setups or define advanced configurations

## Prerequisites

- Node.js v20+ (install via [nvm](https://github.com/nvm-sh/nvm))
- pnpm v10 (install via [pnpm.io/installation](https://pnpm.io/installation))
- A valid Ethereum address for receiving EVM payments
- A valid Solana address for receiving Solana payments (if using Solana)
- A valid Arkade address for receiving Arkade payments (if using Arkade)
- Coinbase Developer Platform API Key & Secret (if accepting payments on Base mainnet)
  -- Get them here [https://portal.cdp.coinbase.com/projects](https://portal.cdp.coinbase.com/projects)

## Setup

1. Copy `.env-local` to `.env` and add your addresses to receive payments:

```bash
cp .env-local .env
```

2. Install and build all packages from the typescript examples root:
```bash
cd ../../
pnpm install
pnpm build
cd servers/express
```

3. Run the server
```bash
pnpm install
pnpm dev
```

## API Endpoints

### `/weather` - Simple Payment Configuration
- **Payment**: $0.001 (configured via `createRouteConfigFromPrice`)
- **Network**: Based on NETWORK environment variable
- **Response**: Weather data

### `/premium/content` - Multiple Payment Options
- **Payment Options**:
  - USDT on BSC (Binance Smart Chain) - $0.01
  - USDC on Solana - $0.01
- **User Choice**: Users can pay with either option
- **Response**: Premium content with payment method information

## Configuration Examples

### Simple Configuration
```typescript
app.use(
  paymentMiddleware(
    {
      "/weather": createRouteConfigFromPrice("$0.001", network, evmAddress, solanaAddress), // This doesn't work with Arkade Network
    },
    {
      url: facilitatorUrl,
    },
  ),
);
```

### Advanced Multi-Chain Configuration
```typescript
app.use(
  paymentMiddleware(
    {
      "/premium/*": {
        paymentRequirements: [
          {
            scheme: "exact",
            namespace: "evm",
            tokenAddress: "0x55d398326f99059ff775485246999027b3197955", // USDT on BSC
            amountRequired: 0.01,
            amountRequiredFormat: "humanReadable",
            networkId: "56",
            payToAddress: evmAddress, // Example Evm address
            description: "Premium content access with USDT on BSC",
            tokenDecimals: 18,
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
```

## Testing the Server

You can test the server using one of the example clients:

### Using the Fetch Client
```bash
cd ../clients/fetch
# Ensure .env is setup
pnpm install
pnpm dev
```

### Using the Axios Client
```bash
cd ../clients/axios
# Ensure .env is setup
pnpm install
pnpm dev
```

## Payment Flow

1. **Request**: Client makes a request to a protected endpoint
2. **Payment Required**: Server responds with 402 status and available payment options
3. **Payment Choice**: Client chooses preferred payment method (EVM or Solana or Arkade)
4. **Payment**: Client creates and signs payment transaction
5. **Verification**: Server verifies the payment via facilitator
6. **Access**: Server provides access to protected content
7. **Settlement**: Payment is settled on-chain

## Environment Variables

- `FACILITATOR_URL`: URL of the payment facilitator service
- `NETWORK`: Network to use for simple price configurations (e.g., "base", "bsc", "polygon", "sei", "story", "abstract", "peaq", "solana" or "bitcoin")
- `EVM_ADDRESS`: Your Ethereum address for receiving EVM payments
- `SOLANA_ADDRESS`: Your Solana address for receiving Solana payments
- `ARKADE_ADDRESS`: Your Arkade address for receiving Arkade payments

## Supported Networks & Tokens

### EVM Chains
- **BSC (Binance Smart Chain)**: USDT (0x55d398326f99059ff775485246999027b3197955)
- **Base**: USDC (configurable via network parameter)

### Solana
- **Mainnet**: USDC (EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v)

### Arkade
- **Mainnet**: BTC

## Architecture Benefits

- **Better UX**: Users can choose their preferred payment method
- **Cross-Chain**: Support multiple blockchain ecosystems
- **Extensible**: Easy to add new networks and tokens
- **Granular Control**: Different payment options per route
