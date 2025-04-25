import { Config, createConfig, http } from "@wagmi/core";
import { bsc } from "viem/chains";
import { injected, coinbaseWallet } from "@wagmi/connectors";

const config = createConfig({
  chains: [bsc],
  connectors: [coinbaseWallet({ appName: "BitGPT H402" }), injected()],
  transports: {
    [bsc.id]: http(),
  },
}) as Config;

export { config };
