import { useSolanaWallets } from "@/solana/hooks/useSolanaWallets";
import { UiWallet } from "@wallet-standard/react";

/**
 * Solana Wallet Selector Component
 * Uses the useWallets hook to detect available Solana wallets
 */
export default function SolanaWalletSelector({
  onWalletSelect,
  selectedWallet: propSelectedWallet, 
  disabled = false,
  isDarkMode,
}: {
  onWalletSelect: (wallet: UiWallet) => void;
  selectedWallet: UiWallet | null;
  disabled: boolean;
  isDarkMode?: boolean;
}) {
  const {
    wallets: solanaWallets,
    selectedWallet,
    selectedWalletAccount,
  } = useSolanaWallets();

  const currentSelectedWallet = propSelectedWallet || selectedWallet;

  const handleWalletSelect = (wallet: UiWallet) => {
    if (!disabled) {
      onWalletSelect(wallet);
    }
  };

  if (solanaWallets.length === 0) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-700 text-sm">
          No Solana wallets detected. Please install a Solana wallet like
          Phantom.
        </p>
      </div>
    );
  }

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between">
        <div className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
          Select Solana wallet
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {solanaWallets.map((wallet) => (
          <div
            key={wallet.name}
            className={`
              relative flex items-center p-3 border rounded-lg cursor-pointer transition-all duration-200
              ${
                currentSelectedWallet?.name === wallet.name ||
                (selectedWalletAccount &&
                  wallet.accounts.some(
                    (acc) => acc.address === selectedWalletAccount.address
                  ))
                  ? `border-blue-500 ring-2 ring-blue-500 ${isDarkMode ? 'bg-gray-900' : 'bg-blue-50'}`
                  : `${isDarkMode ? '!border-gray-600 hover:bg-gray-700' : '!border-gray-200 hover:bg-gray-50'}`
              }
              ${disabled ? "opacity-50 cursor-not-allowed" : ""}
            `}
            onClick={() => handleWalletSelect(wallet)}
          >
            <input
              type="radio"
              id={wallet.name}
              name="solana-wallet-selection"
              value={wallet.name || ""}
              checked={Boolean(
                currentSelectedWallet?.name === wallet.name ||
                (selectedWalletAccount &&
                  wallet.accounts.some(
                    (acc) => acc.address === selectedWalletAccount.address
                  ))
              )}
              onChange={() => handleWalletSelect(wallet)}
              disabled={disabled}
              className="sr-only"
            />

            <div className="w-6 h-6 mr-3 flex-shrink-0">
              {wallet.icon ? (
                <img
                  src={wallet.icon}
                  alt={wallet.name}
                  className="w-6 h-6 object-contain"
                />
              ) : (
                <div className={`w-6 h-6 ${isDarkMode ? 'bg-gray-600' : 'bg-gray-300'} rounded flex items-center justify-center`}>
                  <span className={`text-xs font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                    {wallet.name.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
            </div>

            <div className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'} truncate`}>
              {wallet.name}
            </div>

            {(currentSelectedWallet?.name === wallet.name ||
              (selectedWalletAccount &&
                wallet.accounts.some(
                  (acc) => acc.address === selectedWalletAccount.address
                ))) && (
              <div className="absolute -top-2 -right-2 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                <div className="w-2.5 h-2.5 bg-white rounded-full"></div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
