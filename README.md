# HTTP 402 protocol

HTTP 402 is the web-native standard for payments. Our mission is to design a frictionless machine-to-machine protocol that allows agents to pay for APIs, compute resources, and data using simple HTTP requests and native blockchain transactions scaling to billions of sub-cent microtransactions.

This unlocks a previously unattainable economic layer for AI-native commerce, while simultaneously delivering a best-in-class user experience for humans.

```js
app.use(
  "/generate-image",
  monetize({
    schema: "exact",
    amount: 0.001,
    token: "USDT",
    chainId: 56, // BSC mainnet
    namespace: "eip155",
  })
);
```

This protocol builds on top of [x402](https://github.com/coinbase/x402), with minimal deviations from its schema to ensure the continuation and adoption of a true open standard.

![playground sequence diagram explanations](./images/playground/explanation.png)

## Playground

To detail and showcase our idea of the 402 protocol, we've built a public playground available at [play.bitgpt.xyz](https://play.bitgpt.xyz). It demonstrates how the 402 payment flow works in comparison to traditional human checkouts.

In a typical crypto checkout, users go through multiple steps: connecting a wallet, signing a transaction, and broadcasting it.

![human checkout](./images/playground/human-checkout.png)

While this flow mirrors traditional credit card payments, it’s unsuitable for machine-based transactions. Agents require a native protocol built for programmatic interaction, not one retrofitted from human-centric experiences.

Our playground illustrates the 402 flow from the agent's perspective: initiating payments on the user's behalf, negotiating terms, and requesting final confirmation from the user.

This interface is demo-only; in real-world use, these interactions occur purely via HTTP between the agent (acting for the user) and the server (BitGPT or any service provider).

![playground sequence diagram](./images/playground/agent-sequence-diagram.png)

The 402 flow can vary based on the payment schema and user-agent configuration. For instance, in the absence of a default payment method, the user must manually select one.

- `exact`: Simple flow with known amount.
- `upto`, `prepaid`, `streamed`, `subscription`, `postpaid`: More dynamic, require negotiation or ongoing interaction.

The playground is still under active development. While it currently mocks the protocol and checkout interface, more examples and features will be added soon, both here and in the soon-to-be-open-sourced repository.

![playground sequence diagram explanations](./images/playground/examples.png)

## Protocol

We decided to create `h402`, which simply stands for `HTTP 402` (since names starting with a number aren’t very computer-friendly, just `402` was not possible), based on the primitives provided by [x402](https://github.com/coinbase/x402).

The reason for spinning off into a separate project comes down to a few key points
- First, we needed to move fast; this protocol is and will be critical for our payment platform, and building independently allows us to iterate quickly
- Second, maintaining a separate implementation gives us the freedom to make protocol decisions that aren’t influenced by the priorities of BASE (and by extension, USDC), whose development may naturally lean toward optimizing for their internal use cases or preferred chains, rather than creating a broadly compatible solution for other blockchains.

Another major factor is the need to support features not currently handled by x402:
- For example, x402 assumes the presence of permit-based tokens (EIP-2612), which USDC supports, but USDT doesn't
- We also needed to implement post-broadcast validations for cryptocurrencies like Bitcoin
- And most importantly, we required polling-based systems, which are essential both as fallback mechanisms for payment providers and for any setup that relies on standalone address verification, rather than a one-size-fits-all signed payload + broadcast approach

> We're a fairly small team, so this repo is evolving rapidly we'll be updating it weekly (or even daily) with new details, schemas, and examples.
> In the meantime, if anything's missing or underspecified, you can check out the original x402 repository for reference.
> Eventually, this message will disappear because we genuinely believe this will become the leading implementation of the 402 protocol, or we will find a way to merge with x402.

## Example Next application

In the `example/` folder we've provided a simple demo of a Next webapp integrating both the facilitator (server) and the client to restrict access to a specific page under a 402 payment required response.

It works utilizing this package and its functionalities and provides a quick example of how such an integration can be made, including the UI for the wallet connection & send.

## Current schemas and types

The only available schema for now is `exact`, the types are the following.

We're currently working to update them up to a newer spec and improve, where needed, certain fields.

```typescript

/** Payment details */

export type PaymentDetails = {
  // Scheme of the payment protocol to use
  scheme: string;
  // Namespace for the receiving blockchain network
  namespace: string;
  // Chain of the blockchain to send payment on
  chainId: string;
  // Amount required to access the resource as token x decimals
  amountRequired: bigint;
  // Token contract
  tokenAddress: string;
  // Token decimals
  tokenDecimals: number;
  // Identifier of what the user pays for
  resource: string;
  // Description of the resource
  description: string;
  // Mime type of the rescource response
  mimeType: string;
  // Output schema of the resource response
  outputSchema: object | null;
  // Address to pay for accessing the resource
  toAddress: string;
  // Time in seconds it may be before the payment can be settaled
  estimatedProcessingTime: number;
  // Extra informations about the payment for the scheme
  extra: Record<string, any> | null;
};

/** Payment Required Response */

export type PaymentRequired = {
  // Version of the 402 payment protocol
  "402Version": number;
  // List of payment details that the resource server accepts (A resource server may accept multiple tokens/chains)
  accepts: PaymentDetails[];
  // Message for error(s) that occured while processing payment
  error: string | null;
};

/** Payment Payload */

export type PaymentPayload<T> = {
  // Version of the 402 payment protocol
  version: number;
  // Scheme of the payment protocol to use
  scheme: string;
  // Namespace for the receiving blockchain network
  namespace: string;
  // Chain of the blockchain to send payment on
  chainId: string;
  // Payload of the payment protocol
  payload: T;
  // Identifier of what the user pays for
  resource: string;
};

/** Facilitator types */

export type FacilitatorRequest = {
  paymentHeader: string;
  paymentDetails: PaymentDetails;
};

export type SettleResponse = {
  success: boolean;
  error?: string | undefined;
  txHash?: string | undefined;
  chainId?: string | undefined;
};

```

## FAQs

See [FAQs.md](./FAQs.md)

## Roadmap

Our vision for h402 is to establish a robust, open-source protocol for blockchain-native payments, not just as a solution for the ecosystem, but to fulfill a real need we face ourselves in standardizing agent-based blockchain transactions.

We're actively building a [payment platform](https://dash.bitgpt.xyz) to support both traditional merchants and autonomous agents. This platform will be based on the open protocol for seamless payment acceptance, remittance, and automation.

Upcoming releases in Q2 2025 will include new protocol schemas:

- `upto`
- `prepaid`
- `streamed`
- `subscription`
- `postpaid`

## Community

Join our [Discord community](https://bitgpt.xyz/discord) to stay up to date, contribute to feature development, and connect directly with our team.

## TODO

- [] V1 release
- [] Expand this README with detailed schema documentation, code examples, and functionality breakdowns
- [] Add real-world examples
- [] Provide a one-liner for frontend integration
- [] Add SDKs for languages beyond TypeScript
- [] Release public facilitator APIs for open use
- [] Support additional schemas
- [] Support Solana, Bitcoin, Tron, and Ripple
- [] Add unit tests
- [] Add vulnerability protocol inside SECURITY.md
- [] Add security best practices (be detailed about what goes with what), examples below:
  - [] payload comes from the client and paymentDetails are from the server
  - [] have verify and settle in a signle route as payload may be tampered with on the client
- [] Document functions with JSDoc
- [] Say somewhere the supported networks
- [] Say that this is the v1 documentation
- [] Add shceme specific docs and explain them seperatly and only put a link here
- [] Probably change namespaces name to be more friendly ie "evm", "bitcoin", etc.
- [] Review the first example in the README to be congruent with the required types
- [] IMPORTANT: Change the imports in the package
- [] IMPORTANT: Be sure that the package is accesible as @bit-gpt/h402 and not @bit-gpt/h402/dist/src
- [] Improve structure.. Improve types.. Improve everything

## License

The h402 protocol is licensed under the [Apache-2.0](https://github.com/coinbase/x402/blob/main/LICENSE.md) license.
