"use client";

import {
  WagmiProvider as Wagmi,
} from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { config } from "../config";
import { ReactNode } from "react";

const queryClient = new QueryClient();

function WagmiProvider({ children }: { children: ReactNode }) {
  return (
    <Wagmi config={config}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </Wagmi>
  );
}

export { WagmiProvider };
