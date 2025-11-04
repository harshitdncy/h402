# h402-axios

A utility package that extends Axios to automatically handle 402 Payment Required responses using the h402 payment protocol. This package enables seamless integration of payment functionality into your applications when making HTTP requests with Axios.

## Installation

```bash
npm install @bit-gpt/h402-axios
```

## Quick Start

### EVM (Base) Example

```typescript
import { withPaymentInterceptor, createEvmClient } from "h402-axios";
import axios from "axios";
import { base } from "viem/chains";

// Create an EVM client
const evmClient = createEvmClient(evmPrivateKey, base);

// Create an Axios instance with payment handling
const api = withPaymentInterceptor(
  axios.create({
    baseURL: "https://api.example.com",
  }),
  { evmClient }
);

// Make a request that may require payment
const response = await api.get("/paid-endpoint");
console.log(response.data);
```

### Solana Example

```typescript
import { withPaymentInterceptor, createSolanaClient } from "h402-axios";
import axios from "axios";

// Create a Solana client
const solanaClient = createSolanaClient("YourPrivateKey");

// Create an Axios instance with payment handling
const api = withPaymentInterceptor(
  axios.create({
    baseURL: "https://api.example.com",
  }),
  { solanaClient }
);

// Make a request that may require payment
const response = await api.get("/paid-endpoint");
console.log(response.data);
```

### Arkade Example

```typescript
import { withPaymentInterceptor, createArkadeClient } from "h402-axios";
import axios from "axios";

// Create a Arkade client
const arkadeClient = createArkadeClient("YourPrivateKey");

// Create an Axios instance with payment handling
const api = withPaymentInterceptor(
  axios.create({
    baseURL: "https://api.example.com",
  }),
  { arkadeClient }
);

// Make a request that may require payment
const response = await api.get("/paid-endpoint");
console.log(response.data);
```

### Multi-Chain Support

```typescript
import { withPaymentInterceptor } from "h402-axios";
import axios from "axios";

// Support both EVM and Solana payments
const api = withPaymentInterceptor(
  axios.create({
    baseURL: "https://api.example.com",
  }),
  { 
    evmClient: yourEvmClient,
    solanaClient: yourSolanaClient,
    arkadeClient: yourArkadeClient
  }
);

// The interceptor will automatically choose the best payment method
// based on available options and stablecoin preferences
const response = await api.get("/paid-endpoint");
```

## Features

- Automatic handling of 402 Payment Required responses
- Support for BSC (Binance Smart Chain), Solana blockchains and Bitcoin Arkade
- Intelligent payment method selection with stablecoin prioritization
- Automatic retry of requests with payment headers
- Payment verification and header generation
- Exposes payment response headers
- Customizable payment requirements selection

## API

### `withPaymentInterceptor(axiosClient, paymentClient, paymentRequirementsSelector?)`

Adds a response interceptor to an Axios instance to handle 402 Payment Required responses automatically.

#### Parameters

- `axiosClient`: The Axios instance to add the interceptor to
- `paymentClient`: An object containing wallet clients for different blockchains:
  - `evmClient?`: EVM wallet client (viem WalletClient) for BSC
  - `solanaClient?`: Solana wallet client
  - `arkadeClient?`: Arkade wallet client
- `paymentRequirementsSelector?`: Optional function to customize payment requirements selection (defaults to `selectPaymentRequirements`)

#### Returns

The modified Axios instance with the payment interceptor that will:
1. Intercept 402 responses
2. Parse the payment requirements
3. Select the best payment option based on available clients and preferences
4. Create a payment header using the appropriate wallet client
5. Retry the original request with the payment header
6. Expose the X-PAYMENT-RESPONSE header in the final response

#### Payment Selection Logic

When multiple payment options are available, the interceptor prioritizes:
1. **Namespace compatibility**: Matches available wallet clients (EVM vs Solana vs Arkade)
2. **Stablecoin preference**: Prioritizes USDT/USDC over native tokens (BNB/SOL)
3. **Network compatibility**: Ensures the payment network matches your wallet configuration (BSC for EVM, Solana and Bitcoin for Arkade)

## Additional Exports

### `decodeXPaymentResponse`

Utility function to decode payment response data from the X-PAYMENT-RESPONSE header.

```typescript
import { decodeXPaymentResponse } from "h402-axios";

// After a successful payment, decode the response
const paymentData = decodeXPaymentResponse(response.headers['x-payment-response']);
