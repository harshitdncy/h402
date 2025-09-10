import { useContext, useMemo } from "react";
import { useWallets } from "@wallet-standard/react";
import { SelectedWalletAccountContext } from "../context/SelectedWalletAccountContext";

/**
 * Custom hook that provides Solana wallet functionality
 * Centralizes wallet logic and reduces redundant useWallets() calls
 */
export function useSolanaWallets() {
  const wallets = useWallets();
  const [selectedWalletAccount, setSelectedWalletAccount] = useContext(SelectedWalletAccountContext);
  const solanaWallets = useMemo(() => {
    return wallets.filter((wallet) => {
      try {
        if (!wallet || !wallet.name) {
          return false;
        }
        
        return wallet.chains?.some((chain) => chain.includes("solana"));
      } catch (error) {
        console.warn("Error filtering wallet:", wallet?.name, error);
        return false;
      }
    });
  }, [wallets]);

  const selectedWallet = useMemo(() => {
    return selectedWalletAccount ? 
      solanaWallets.find(w => w.accounts.some(acc => acc.address === selectedWalletAccount.address)) : 
      null;
  }, [selectedWalletAccount, solanaWallets]);

  return {
    wallets: solanaWallets,
    selectedWallet,
    selectedWalletAccount,
    setSelectedWalletAccount,
  };
}
