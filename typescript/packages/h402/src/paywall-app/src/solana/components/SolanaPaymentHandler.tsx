import {useCallback, useEffect, useRef, useState} from "react";
import {useWalletAccountTransactionSendingSigner, useWalletAccountTransactionSigner} from "@solana/react";
import {UiWallet, type UiWalletAccount, useConnect} from "@wallet-standard/react";
import {createPaymentHeader, h402Version} from "@bit-gpt/h402";
import type {PaymentButtonProps, PaymentStatus} from "@/types/payment";
import PaymentButtonUI from "@/components/PaymentButton";
import SolanaWalletSelector from "./SolanaWalletSelector";
import { useSolanaWallets } from "../hooks/useSolanaWallets";
import { useTheme } from "@/components/ThemeProvider";

/**
 * Solana-specific payment handler
 * Uses wallet-standard/react hooks for Solana wallet integration
 */
export default function SolanaPaymentHandler({
  amount,
  paymentRequirements,
  onSuccess,
  onError,
  paymentStatus,
  setPaymentStatus,
  className = "",
}: PaymentButtonProps) {
  const { isDarkMode } = useTheme();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedWallet, setSelectedWallet] = useState<UiWallet | null>(null);
  const [selectedAccount, setSelectedAccount] =
    useState<UiWalletAccount | null>(null);

  // Simplified ref to track payment attempts
  const paymentAttemptRef = useRef({attemptInProgress: false});

  const handleWalletSelect = (wallet: UiWallet) => {
    setPaymentStatus("idle");
    setSelectedWallet(wallet);
    if (selectedAccount) {
      setSelectedAccount(null);
    }
  };

  // Handle button click for unified experience
  // If no account, connect first
  // If already connected, start processing payment
  const handleButtonClick = async () => {
    if (selectedWallet && !selectedAccount) {
      setPaymentStatus("connecting");
      return;
    }

    setPaymentStatus("approving");
  };

  const handleConnectionError = (err: Error) => {
    console.error(
      "[DEBUG] Connection error from WalletConnectionManager:",
      err
    );
    const errorMessage = err instanceof Error ? err.message : String(err);
    
    const finalErrorMessage = errorMessage.includes("Unexpected error") 
      ? `Please switch your ${selectedWallet?.name} wallet to correct network`
      : errorMessage;
    
    setPaymentStatus('error');
    setErrorMessage(finalErrorMessage);
  };

  // Update payment status callbacks
  const handlePaymentSuccess = useCallback(
    (paymentHeader: string) => {
      console.log("[DEBUG] Payment signed and maybe sent");
      console.log("[DEBUG] Payment header:", paymentHeader);

      // Keep the processing state - we'll let the parent component set success
      // after facilitator verifies the transaction

      // Call onSuccess immediately - the parent will handle facilitator verification
      // Pass setStatus so the parent can update our status after facilitator verification
      if (onSuccess) onSuccess(paymentHeader);
    },
    [onSuccess]
  );

  const handlePaymentError = useCallback(
    (err: Error) => {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.log("[DEBUG] Payment error", {errMsg});

      // Check if this is a user cancellation
      const isUserCancellation =
        errMsg.includes("cancelled by user") ||
        errMsg.includes("User rejected");

      // Check if this is a facilitator error using the custom property
      const isFacilitatorError = (err as any).isFacilitatorError === true;

      if (isUserCancellation) {
        console.log("[DEBUG] User cancelled payment");
        // Set status to error so the error message is displayed
        setPaymentStatus("error");
        setErrorMessage("Transaction cancelled by user");
      } else if (isFacilitatorError) {
        console.log("[DEBUG] Facilitator service unavailable");
        // Use the specific facilitator_error status
        setPaymentStatus("facilitator_error");
        setErrorMessage(
          "Payment verification service is currently unavailable. Please try again later."
        );
      } else {
        setPaymentStatus("error");
        setErrorMessage(errMsg);
      }

      // Always reset payment tracking
      paymentAttemptRef.current.attemptInProgress = false;

      if (onError) onError(err instanceof Error ? err : new Error(errMsg));
    },
    [onError]
  );

  const handlePaymentProcessing = useCallback(() => {
    console.log("[DEBUG] Payment processing started");
    setPaymentStatus("processing");
    paymentAttemptRef.current.attemptInProgress = true;
  }, []);

  const isDisabled =
  ["processing", "success"].includes(paymentStatus) ||
  (!selectedAccount && !selectedWallet);

  return (
    <div className="flex flex-col w-full space-y-4">
      <SolanaWalletSelector
        onWalletSelect={handleWalletSelect}
        selectedWallet={selectedWallet}
        disabled={["approving", "connecting", "processing"].includes(paymentStatus)}
        isDarkMode={isDarkMode}
      />
      {selectedWallet && paymentStatus === "connecting" && (
        <WalletConnectionManager
          wallet={selectedWallet}
          onConnectionError={handleConnectionError}
          setSelectedAccount={setSelectedAccount}
          setPaymentStatus={setPaymentStatus}
        />
      )}
      {/* Payment processor component that watches for account and status */}
      {selectedAccount &&
        paymentStatus === "approving" &&
        !paymentAttemptRef.current.attemptInProgress && (
          <SolanaPaymentProcessor
            account={selectedAccount}
            paymentRequirements={paymentRequirements}
            onSuccess={handlePaymentSuccess}
            onError={handlePaymentError}
            onProcessing={handlePaymentProcessing}
            paymentAttemptRef={paymentAttemptRef}
          />
        )}

      <PaymentButtonUI
        paymentStatus={paymentStatus}
        amount={amount}
        errorMessage={errorMessage}
        onClick={handleButtonClick}
        disabled={isDisabled}
        className={className}
      />
    </div>
  );
}

// Payment processor component that can use the hook with a valid account
function SolanaPaymentProcessor({
  account,
  paymentRequirements,
  onSuccess,
  onError,
  onProcessing,
  paymentAttemptRef,
}: {
  account: UiWalletAccount;
  paymentRequirements?: any;
  onSuccess: (paymentHeader: string) => void;
  onError: (error: Error) => void;
  onProcessing: () => void;
  paymentAttemptRef: React.RefObject<{ attemptInProgress: boolean }>;
}) {
  const transactionSendingSigner = useWalletAccountTransactionSendingSigner(
    account,
    "solana:mainnet"
  );
  const transactionSigner = useWalletAccountTransactionSigner(account, "solana:mainnet")

  // Debug - Track if this component has already attempted a payment
  const hasAttemptedRef = useRef(false);

  // Process payment on mount
  useEffect(() => {
    // Guard against multiple attempts
    if (
      hasAttemptedRef.current ||
      (paymentAttemptRef.current && paymentAttemptRef.current.attemptInProgress)
    ) {
      console.log(
        "[DEBUG-PAYMENT-FLOW] Payment already in progress or attempted, skipping"
      );
      return;
    }

    // Mark as attempted at the component level
    hasAttemptedRef.current = true;

    const processPayment = async () => {
      try {
        if (!transactionSendingSigner) {
          console.error(
            "[SolanaPaymentHandler] Transaction signer not available"
          );
          throw new Error("Solana transaction signer not available");
        }

        const signAndSendTransactionFn =
          transactionSendingSigner?.signAndSendTransactions;

        const signTransactionFn =
          transactionSigner?.modifyAndSignTransactions;

        const paymentClients = {
          solanaClient: {
            publicKey: account.address,
            signAndSendTransaction: signAndSendTransactionFn,
            signTransaction: signTransactionFn,
          },
        };

        // Create payment using the h402 payment library
        // At this point the user will be prompted to approve the transaction
        console.log("[DEBUG Solana Payment Handler] Calling createPayment now...");
        const paymentHeader = await createPaymentHeader(
          paymentClients,
          h402Version,
          paymentRequirements,
        );
        console.log("[DEBUG Solana Payment Handler] createPayment completed successfully");
        // If we get here, it means the user has approved the transaction
        // Now we can set the processing state as we wait for confirmation
        onProcessing();
        onSuccess(paymentHeader);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        // Check for facilitator unavailability
        const isFacilitatorUnavailable =
          errorMessage.includes("Facilitator service unavailable") ||
          errorMessage.includes(
            "Payment verification service is currently unavailable"
          ) ||
          errorMessage.includes("fetch failed");

        const isUserRejection = errorMessage.includes(
          "User rejected the request"
        );

        if (isUserRejection) {
          onError(new Error("Transaction cancelled by user"));
        } else if (isFacilitatorUnavailable) {
          // Create a custom error with a special type property for the parent component to identify
          const facilitatorError = new Error(
            "Payment verification service is currently unavailable. Please try again later."
          );
          // Add a custom property to identify this as a facilitator error
          Object.defineProperty(facilitatorError, "isFacilitatorError", {
            value: true,
            enumerable: true,
          });
          onError(facilitatorError);
        } else {
          onError(err instanceof Error ? err : new Error(String(err)));
        }
      }
    };

    processPayment();

    // Clean up function
    return () => {
      paymentAttemptRef.current.attemptInProgress = false;
    };
  }, [account, paymentRequirements, transactionSendingSigner, onSuccess, onError, onProcessing, paymentAttemptRef, transactionSigner?.modifyAndSignTransactions]);

  // This component doesn't render anything
  return null;
}

function WalletConnectionManager({
  wallet,
  onConnectionError,
  setSelectedAccount,
  setPaymentStatus,
}: {
  wallet: UiWallet;
  onConnectionError: (err: Error) => void;
  setSelectedAccount: (account: UiWalletAccount) => void;
  setPaymentStatus: (status: PaymentStatus) => void;
}) {
  const [isConnecting, connect] = useConnect(wallet);
  const connectionAttemptedRef = useRef(false);
  const walletAccountSelectionRef = useRef(false);
  const { wallets } = useSolanaWallets();
  const [connectionSuccess, setConnectionSuccess] = useState(false);

  useEffect(() => {
    if (!isConnecting && !connectionAttemptedRef.current) {
      connectionAttemptedRef.current = true;

      const handleConnection = async () => {
        try {
          await connect();
          setConnectionSuccess(true);
        } catch (err) {
          setConnectionSuccess(false);
          if (onConnectionError) {
            onConnectionError(err instanceof Error ? err : new Error(String(err)));
          }
        }
      };

      handleConnection();
    }
  }, [isConnecting, connect, onConnectionError, setConnectionSuccess]);

  useEffect(() => {
    if (
      wallets.length > 0 &&
      connectionAttemptedRef.current &&
      connectionSuccess &&
      !walletAccountSelectionRef.current
    ) {
      walletAccountSelectionRef.current = true;
      const updatedWallet = wallets.find((w) => w.name === wallet.name);

      if (updatedWallet?.accounts?.length && updatedWallet.accounts.length > 0) {
        setSelectedAccount(updatedWallet.accounts[0]);
        setPaymentStatus("approving");
      } else {
        throw new Error("No accounts available after connection");
      }
    }
  }, [
    wallet,
    wallets,
    setSelectedAccount,
    setPaymentStatus,
    walletAccountSelectionRef,
    connectionSuccess,
  ]);

  return null;
}