import { type Config, createConfig, http } from "wagmi";
import { base, bsc, polygon, sei } from "viem/chains";
import { injected, metaMask,walletConnect } from "wagmi/connectors";

const config = createConfig({
  chains: [bsc, base, polygon, sei],
  connectors: [
    metaMask(),
    // coinbaseWallet({ appName: "BitGPT H402" }),
    walletConnect({ projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID ?? "" }),
    injected({ shimDisconnect: true, target: "phantom" })
  ],
  transports: {
    [bsc.id]: http(),
    [base.id]: http(),
    [polygon.id]: http(),
    [sei.id]: http(),
  },
}) as Config;

export { config };
