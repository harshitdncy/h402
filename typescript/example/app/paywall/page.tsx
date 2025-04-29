"use client";

import { useState } from "react";
import { createPublicClient, http } from "viem";
import { bsc } from "viem/chains";
import { createPayment } from "@bit-gpt/h402";
import { paymentDetails } from "@/config/paymentDetails";
import metamaskIcon from "./image/wallets/metamask.svg";
import rabbyIcon from "./image/wallets/rabby.svg";
import trustIcon from "./image/wallets/trustwallet.svg";
import walletConnectIcon from "./image/wallets/walletConnect.svg";
import coinbaseIcon from "./image/wallets/coinbase.svg";
import { useWallet } from "../hooks/useWallet";
import WalletButton from "../components/WalletButton";
import { StaticImageData } from "next/image";
import { WalletType } from "../hooks/useWallet";

// Wallet options for selection
const WALLET_OPTIONS: { id: WalletType; label: string; icon: StaticImageData }[] = [
  { id: "trust", icon: trustIcon, label: "Trust Wallet" },
  { id: "walletconnect", icon: walletConnectIcon, label: "WalletConnect" },
  { id: "rabby", icon: rabbyIcon, label: "Rabby Wallet" },
  { id: "metamask", icon: metamaskIcon, label: "MetaMask" },
  { id: "coinbase", icon: coinbaseIcon, label: "Coinbase Wallet" },
];

export default function Paywall() {
  const {
    walletClient,
    connectedAddress,
    statusMessage,
    setStatusMessage,
    connectWallet,
    disconnectWallet,
  } = useWallet();

  const [paymentStatus, setPaymentStatus] = useState<string>("not_paid");
  const [imagePrompt, setImagePrompt] = useState<string>("");
  const [showWalletOptions, setShowWalletOptions] = useState<boolean>(false);

  const handleConnect = () => {
    setShowWalletOptions(true);
  };

  const handleDisconnect = async () => {
    try {
      await disconnectWallet();
      setStatusMessage("Wallet disconnected");
    } catch (error) {
      console.error("Disconnect error:", error);
      setStatusMessage("Failed to disconnect wallet");
    }
  };

  const handlePayment = async () => {
    if (!walletClient) {
      setStatusMessage("Please connect your wallet first");
      return;
    }

    if (!imagePrompt.trim()) {
      setStatusMessage("Please enter an image prompt");
      return;
    }

    try {
      setPaymentStatus("processing");
      setStatusMessage("Processing payment...");

      const publicClient = createPublicClient({
        chain: bsc,
        transport: http(),
      });

      const chainId = await walletClient.chain?.id;
      if (chainId !== bsc.id) {
        throw new Error("Please switch to BSC network");
      }

      const [address] = await walletClient.getAddresses();
      if (!address) {
        throw new Error("Cannot access wallet account");
      }

      const balance = await publicClient.getBalance({ address });
      if (balance === BigInt(0)) {
        throw new Error("Insufficient balance for transaction");
      }

      const paymentHeader = await createPayment(paymentDetails, {
        evmClient: walletClient,
      });

      window.location.href = `/?402base64=${encodeURIComponent(
        paymentHeader
      )}&prompt=${encodeURIComponent(imagePrompt)}`;
    } catch (error) {
      console.error("Payment failed:", error);
      setPaymentStatus("failed");
      let errorMessage = "Payment failed";

      if (error instanceof Error) {
        if (error.message.includes("user rejected")) {
          errorMessage = "Transaction was rejected in wallet";
        } else if (error.message.includes("insufficient")) {
          errorMessage = "Insufficient balance for transaction";
        } else if (error.message.includes("network")) {
          errorMessage = "Please check your network connection";
        } else {
          errorMessage = error.message;
        }
      }

      setStatusMessage(errorMessage);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-full">
      <div className="w-full max-w-[800px] mx-auto p-8">
        <h1 className="text-2xl font-semibold mb-2">
          402 pay Image Generation Example
        </h1>
        <p className="text-gray-500 dark:text-gray-400 text-base mb-8">
          Connect your wallet, enter a prompt, and pay a small fee to generate
          an AI image using the HTTP 402 payment protocol.
        </p>

        {!walletClient ? (
          <div className="w-full bg-white dark:bg-[#27272A] rounded-xl border border-gray-200 dark:border-gray-800">
            <div className="p-6">
              <p className="text-gray-900 dark:text-gray-100 font-medium mb-2">
                Please connect your wallet to continue
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Make sure you are on the BSC network
              </p>

              {showWalletOptions ? (
                <div className="space-y-3">
                  <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                    Select a wallet:
                  </p>
                  {WALLET_OPTIONS.map((option) => (
                    <WalletButton
                      key={option.id}
                      id={option.id}
                      icon={option.icon}
                      label={option.label}
                      onClick={connectWallet}
                    />
                  ))}
                  <button
                    onClick={() => setShowWalletOptions(false)}
                    className="w-full px-4 py-2 mt-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors duration-200 font-medium"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleConnect}
                  className="w-full px-4 py-2.5 bg-[#2E74FF] hover:bg-[#2361DB] text-white rounded-lg transition-colors duration-200 font-medium"
                >
                  Connect Wallet
                </button>
              )}
            </div>
          </div>
        ) : (
          <>
            <div className="w-full bg-white dark:bg-[#27272A] rounded-xl border border-gray-200 dark:border-gray-800 mb-6">
              <div className="p-4 flex items-center justify-between">
                <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                  Connected: {connectedAddress.slice(0, 6)}...
                  {connectedAddress.slice(-4)}
                </span>
                <button
                  onClick={handleDisconnect}
                  className="px-4 py-2 bg-gray-100 dark:bg-[#323234] text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-[#3A3A3C] transition-colors duration-200"
                >
                  Disconnect
                </button>
              </div>
            </div>

            {paymentStatus === "not_paid" && (
              <div className="w-full bg-white dark:bg-[#27272A] rounded-xl border border-gray-200 dark:border-gray-800">
                <div className="p-6">
                  <div className="mb-6">
                    <label
                      htmlFor="prompt"
                      className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                    >
                      Image Prompt
                    </label>
                    <div className="relative">
                      <input
                        id="prompt"
                        type="text"
                        maxLength={30}
                        value={imagePrompt}
                        onChange={(e) => setImagePrompt(e.target.value)}
                        placeholder="Enter your image prompt"
                        className="w-full px-4 py-2.5 bg-white dark:bg-[#323234] border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-[#2E74FF] focus:border-transparent outline-none text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 dark:text-gray-400">
                        {imagePrompt.length}/30
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={handlePayment}
                    disabled={!imagePrompt.trim()}
                    className="w-full px-6 py-2.5 bg-[#2E74FF] text-white rounded-lg hover:bg-[#2361DB] transition-colors duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Create Payment Request
                  </button>
                </div>
              </div>
            )}

            {paymentStatus === "processing" && (
              <div className="w-full bg-white dark:bg-[#27272A] rounded-xl border border-gray-200 dark:border-gray-800 p-6">
                <div className="flex items-center justify-center space-x-3">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-[#2E74FF] border-t-transparent"></div>
                  <p className="text-[#2E74FF]">Processing payment...</p>
                </div>
              </div>
            )}

            {paymentStatus === "failed" && (
              <div className="w-full bg-white dark:bg-[#27272A] rounded-xl border border-red-200 dark:border-red-900 p-6">
                <p className="text-red-600 dark:text-red-400 text-center mb-4">
                  Payment failed. Please try again.
                </p>
                <button
                  onClick={handlePayment}
                  className="w-full px-6 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200 font-medium"
                >
                  Retry Payment
                </button>
              </div>
            )}
          </>
        )}

        {statusMessage && (
          <div className="mt-6 w-full">
            <div
              className={`p-4 rounded-lg text-sm ${
                statusMessage.toLowerCase().includes("error") ||
                statusMessage.toLowerCase().includes("failed")
                  ? "bg-red-50 dark:bg-[#27272A] text-red-700 dark:text-red-400"
                  : statusMessage.toLowerCase().includes("success") ||
                    statusMessage.toLowerCase().includes("connected")
                  ? "bg-green-50 dark:bg-[#27272A] text-green-700 dark:text-green-400"
                  : "bg-blue-50 dark:bg-[#27272A] text-gray-700 dark:text-gray-300"
              }`}
            >
              {statusMessage}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
