import { Config, createConfig, http } from "@wagmi/core";
import { base } from "viem/chains";
import { injected, coinbaseWallet } from "@wagmi/connectors";

const config = createConfig({
  chains: [base],
  connectors: [coinbaseWallet({ appName: "BitGPT H402" }), injected()],
  transports: {
    [base.id]: http(),
  },
}) as Config;

export { config };
