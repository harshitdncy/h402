"use client";

import { useState } from "react";
import {
  createWalletClient,
  custom,
  publicActions,
  createPublicClient,
  http,
  walletActions,
} from "viem";
import { bsc } from "viem/chains";
import { connect, disconnect } from "wagmi/actions";
import { createPaymentHandler } from "@bit-gpt/h402";
import { paymentDetails } from "@/config/paymentDetails";
import { redirect } from "next/navigation";
import { injected } from "wagmi/connectors";
import { config } from "@/providers/wagmi/config";
import { WalletClient } from "@bit-gpt/h402";

export default function Home() {
  const [walletClient, setWalletClient] = useState<WalletClient | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<string>("not_paid");
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [connectedAddress, setConnectedAddress] = useState<string>("");

  const handleConnect = async () => {
    try {
      setStatusMessage("Connecting wallet...");

      const result = await connect(config, {
        connector: injected(),
        chainId: bsc.id,
      });

      if (!result.accounts?.[0]) {
        throw new Error("Please select an account in your wallet");
      }

      // Create wallet client with required methods
      const client = createWalletClient({
        account: result.accounts[0],
        chain: bsc,
        transport: custom(window.ethereum),
      }).extend(publicActions);

      const [address] = await client.getAddresses();
      if (!address) {
        throw new Error("Cannot access wallet account");
      }

      // Add required public methods
      const extendedClient = client.extend(publicActions);

      // Verify chain and account
      const chainId = await extendedClient.getChainId();
      if (chainId !== bsc.id) {
        throw new Error("Please switch to BSC network");
      }

      setWalletClient(extendedClient as unknown as WalletClient);
      setConnectedAddress(result.accounts[0]);
      setStatusMessage("Wallet connected! You can now proceed with payment.");
    } catch (error) {
      console.error("Connection error:", error);
      setStatusMessage(
        error instanceof Error ? error.message : "Failed to connect wallet"
      );
      setWalletClient(null);
      setConnectedAddress("");
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnect(config);
      setWalletClient(null);
      setConnectedAddress("");
      setStatusMessage("Wallet disconnected");
    } catch (error) {
      setStatusMessage("Failed to disconnect wallet");
    }
  };

  const handlePayment = async () => {
    if (!walletClient) {
      setStatusMessage("Please connect your wallet first");
      return;
    }

    try {
      setPaymentStatus("processing");
      setStatusMessage("Processing payment...");

      // Create public client for reading chain data
      const publicClient = createPublicClient({
        chain: bsc,
        transport: http(),
      });

      // Verify chain and account
      const chainId = await walletClient.getChainId();
      if (chainId !== bsc.id) {
        throw new Error("Please switch to BSC network");
      }

      const [address] = await walletClient.getAddresses();
      if (!address) {
        throw new Error("Cannot access wallet account");
      }

      // Get account balance
      const balance = await publicClient.getBalance({ address });
      if (balance === BigInt(0)) {
        throw new Error("Insufficient balance for transaction");
      }

      const paymentHeader = await createPaymentHandler(
        paymentDetails,
        walletClient
      );

      redirect(`/resource?h402=${encodeURIComponent(paymentHeader)}`);
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
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-50 dark:bg-gray-900">
      <h1 className="text-3xl font-bold mb-8 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
        402 Payment Required Example
      </h1>

      {!walletClient ? (
        <div className="bg-white dark:bg-gray-800 shadow-lg rounded-xl p-6 mb-6 w-full max-w-md border border-gray-200 dark:border-gray-700">
          <p className="text-gray-800 dark:text-gray-200 font-medium">
            Please connect your wallet to continue
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            Make sure you are on the BSC network
          </p>
          <button
            onClick={handleConnect}
            className="mt-4 w-full px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 font-medium shadow-sm hover:shadow-md"
          >
            Connect Wallet
          </button>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-4 mb-6 bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
            <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">
              Connected: {connectedAddress.slice(0, 6)}...
              {connectedAddress.slice(-4)}
            </span>
            <button
              onClick={handleDisconnect}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors duration-200"
            >
              Disconnect
            </button>
          </div>

          {paymentStatus === "not_paid" && (
            <div className="bg-white dark:bg-gray-800 p-8 rounded-xl mb-6 text-center w-full max-w-md shadow-lg border border-gray-200 dark:border-gray-700">
              <div className="mb-6">
                <h2 className="text-2xl font-semibold mb-2 text-gray-800 dark:text-gray-200">
                  402 Payment Required
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  You need to pay to access this content
                </p>
              </div>
              <button
                onClick={handlePayment}
                className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200 font-medium shadow-sm hover:shadow-md"
              >
                Pay Now
              </button>
            </div>
          )}

          {paymentStatus === "processing" && (
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl w-full max-w-md shadow-lg border border-blue-200 dark:border-blue-900 bg-opacity-50">
              <div className="flex items-center space-x-3">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-600 border-t-transparent"></div>
                <p className="text-blue-600 dark:text-blue-400">
                  Processing payment...
                </p>
              </div>
            </div>
          )}

          {paymentStatus === "failed" && (
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl w-full max-w-md shadow-lg border border-red-200 dark:border-red-900">
              <p className="text-red-600 dark:text-red-400 mb-4">
                Payment failed. Please try again.
              </p>
              <button
                onClick={handlePayment}
                className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200 font-medium"
              >
                Retry Payment
              </button>
            </div>
          )}
        </>
      )}

      {statusMessage && (
        <div className="mt-6 text-sm text-center max-w-md">
          <div
            className={`p-4 rounded-lg ${
              statusMessage.toLowerCase().includes("error") ||
              statusMessage.toLowerCase().includes("failed")
                ? "bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400"
                : statusMessage.toLowerCase().includes("success") ||
                  statusMessage.toLowerCase().includes("connected")
                ? "bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400"
                : "bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400"
            }`}
          >
            {statusMessage}
          </div>
        </div>
      )}
    </div>
  );
}
