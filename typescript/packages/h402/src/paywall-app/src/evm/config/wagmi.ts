import { type Config, createConfig, http } from "wagmi";
import { base, bsc } from "viem/chains";
import { injected, metaMask,walletConnect } from "wagmi/connectors";

const config = createConfig({
  chains: [bsc, base],
  connectors: [
    metaMask(),
    // coinbaseWallet({ appName: "BitGPT H402" }),
    walletConnect({ projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID ?? "" }),
    injected({ shimDisconnect: true, target: "phantom" })
  ],
  transports: {
    [bsc.id]: http(),
    [base.id]: http(),
  },
}) as Config;

export { config };
