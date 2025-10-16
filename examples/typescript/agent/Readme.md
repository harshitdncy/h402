# Agent Example Client

This example demonstrates how to use the `h402-fetch` package with the Anthropic SDK to make AI model requests through a paid proxy endpoint. It showcases multi-chain payment support for both EVM (Base) and Solana networks.

## Prerequisites

- Node.js v20+ (install via [nvm](https://github.com/nvm-sh/nvm))
- pnpm v10 (install via [pnpm.io/installation](https://pnpm.io/installation))
- A running h402 server (you can use the example express server at `examples/typescript/servers/express`)
- A valid Ethereum private key for making payments

## Setup

1. Install and build all packages from the typescript examples root:

```bash
cd ../../
pnpm install
pnpm build
cd agent
```

2. Copy `.env-local` to `.env` and add your Ethereum private key:

```bash
cp .env-local .env
```

3. Start the example client:

```bash
pnpm dev
```

## How It Works

The example demonstrates how to:

1. Set up wallet clients for both EVM (Base) and Solana chains
2. Create a payment client that supports multiple blockchain networks
3. Wrap the native fetch function with h402 payment handling
4. Initialize the Anthropic SDK with the wrapped fetch function
5. Make AI model requests through a paid proxy endpoint

## Example Code

```typescript
import Anthropic from "@anthropic-ai/sdk";
import { config } from "dotenv";
import { Chain, createWalletClient, Hex, http, publicActions } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { wrapFetchWithPayment } from "@bit-gpt/h402-fetch";
import { base } from "viem/chains";
import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";

config();

const evmPrivateKey = process.env.EVM_PRIVATE_KEY as Hex | undefined;
const solanaPrivateKey = process.env.SOLANA_PRIVATE_KEY as string | undefined;
const baseURL = process.env.RESOURCE_SERVER_URL as string;

// Create EVM wallet client (Base chain)
const evmClient = evmPrivateKey
  ? createWalletClient({
      account: privateKeyToAccount(evmPrivateKey),
      chain: base as Chain,
      transport: http(),
    }).extend(publicActions)
  : undefined;

// Create Solana wallet client
const solanaClient = solanaPrivateKey
  ? createSolanaClient(solanaPrivateKey)
  : undefined;

// Combine clients for multi-chain support
const paymentClient = { evmClient, solanaClient };

// Create Anthropic client with payment-wrapped fetch
const anthropic = new Anthropic({
  baseURL,
  apiKey: "not needed",
  fetch: wrapFetchWithPayment(fetch, paymentClient),
});

// Make AI request through paid proxy
const msg = await anthropic.messages.create({
  model: "claude-3-7-sonnet-20250219",
  max_tokens: 1024,
  messages: [{ role: "user", content: "Hello, Claude!" }],
});
console.log(msg);
```
