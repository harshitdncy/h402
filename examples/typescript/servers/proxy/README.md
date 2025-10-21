# H402 Demo Proxy Server Example

This is a universal proxy for demo purposes. It is not meant for production It makes any website or API payable via h402.

A reverse proxy server that adds payment requirements to any HTTP service using the H402 payment protocol.

## Installation

```bash
pnpm install
```

## Usage

Create a anthropic_config.json configuration file with the following structure:

```json
{
  "targetURL": "https://api.anthropic.com",
  "amount": 0.1,
  "evmAddress": "0x1BA55bD3e48e978A58506c3D66525cBAb5609d53",
  "solanaAddress": "9ynSUeUSVSbgTQ3Xcz7XLXueMrUrQEQjBKEwhEP87NfD",
  "network": "solana",
  "facilitator": {
    "url": "https://facilitator.bitgpt.xyz"
  },
  "headers": {
    "x-api-key": "AnthropicApiKey",
    "anthropic-version": "2023-06-01",
    "content-type": "application/json"
  }
}
```

Run the proxy server with a configuration file:

```bash
pnpm dev anthropic_config.json 
```

The server will start on port 4021 and proxy all requests to the target URL after payment verification.

