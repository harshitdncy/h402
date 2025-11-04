# h402-fetch

A utility package that extends the native `fetch` API to automatically handle 402 Payment Required responses using the h402 payment protocol. This package enables seamless integration of payment functionality into your applications when making HTTP requests.

## Installation

```bash
npm install @bit-gpt/h402-fetch
```

## Quick Start

### EVM (Base) Example

```typescript
import { wrapFetchWithPayment, createEvmClient } from "h402-fetch";
import { base } from "viem/chains";

// Create an EVM client
const evmClient = createEvmClient(evmPrivateKey, base);

// Wrap the fetch function with payment handling
const fetchWithPay = wrapFetchWithPayment(fetch, { evmClient });

// Make a request that may require payment
const response = await fetchWithPay("https://api.example.com/paid-endpoint", {
  method: "GET",
});

const data = await response.json();
```

## Solana Example

```typescript
import { wrapFetchWithPayment, createSolanaClient } from "h402-fetch";

// Create a Solana client
const solanaClient = createSolanaClient("YourPrivateKey");

// Wrap the fetch function with payment handling
const fetchWithPay = wrapFetchWithPayment(fetch, { solanaClient });

// Make a request that may require payment
const response = await fetchWithPay("https://api.example.com/paid-endpoint", {
  method: "GET",
});

const data = await response.json();
```

### Arkade Example

```typescript
import { wrapFetchWithPayment, createArkadeClient } from "h402-fetch";

// Create a Arkade client
const arkadeClient = createArkadeClient("YourPrivateKey");

// Wrap the fetch function with payment handling
const fetchWithPay = wrapFetchWithPayment(fetch, { arkadeClient });

// Make a request that may require payment
const response = await fetchWithPay("https://api.example.com/paid-endpoint", {
  method: "GET",
});
```

## API

### `wrapFetchWithPayment(fetch, walletClient, maxValue?, paymentRequirementsSelector?)`

Wraps the native fetch API to handle 402 Payment Required responses automatically.

#### Parameters

- `fetch`: The fetch function to wrap (typically `globalThis.fetch`)
- `walletClient`: The wallet client used to sign payment messages (must implement the x402 wallet interface)
- `maxValue`: Optional maximum allowed payment amount in base units (defaults to 0.1 USDC for EVM, Solana and 0.00001 BTC for Arkade)
- `paymentRequirementsSelector`: Optional function to select payment requirements from the response (defaults to `selectPaymentRequirements`)

#### Returns

A wrapped fetch function that automatically handles 402 responses by:

1. Making the initial request
2. If a 402 response is received, parsing the payment requirements
3. Verifying the payment amount is within the allowed maximum
4. Creating a payment header using the provided wallet client
5. Retrying the request with the payment header
