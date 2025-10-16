# H402 Demo Proxy Server Example

This is a universal proxy for demo purposes. It is not meant for production It makes any website or API payable via h402.

A reverse proxy server that adds payment requirements to any HTTP service using the H402 payment protocol.

## Installation

```bash
pnpm install
```

## Configuration

Create a JSON configuration file with the following structure:

```json
{
  "targetURL": "https://api.example.com",
  "amount": "$0.001",
  "payTo": "0x1234567890123456789012345678901234567890",
  "description": "API access",
  "facilitatorURL": "https://facilitator.bitgpt.xyz",
  "testnet": true,
  "network": "base-testnet",
  "maxTimeoutSeconds": 60,
  "headers": {
    "X-Custom-Header": "value"
  }
}
```

## Usage

Run the proxy server with a configuration file:

```bash
pnpm dev example-config.json
```

The server will start on port 4021 and proxy all requests to the target URL after payment verification.

## Example

1. Create a config file `my-config.json`:

```json
{
  "targetURL": "https://api.openai.com",
  "amount": "$0.01",
  "payTo": "0xYourWalletAddress",
  "description": "OpenAI API access via H402",
  "network": "base",
  "testnet": false,
  "headers": {
    "Authorization": "Bearer YOUR_OPENAI_API_KEY"
  }
}
```

2. Start the proxy:

```bash
npm run dev my-config.json
```

3. Make requests to `http://localhost:4021/*` with the required payment headers.

## How It Works

1. Client sends a request to the proxy server
2. Payment middleware intercepts and validates the H402 payment
3. If payment is valid, the request is forwarded to the target URL
4. Response is returned to the client
5. Payment is settled with the facilitator

