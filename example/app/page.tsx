"use client";

import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { useAppKit } from "@reown/appkit/react";
import { createClient, http } from "viem";
import { createPaymentHandler } from "@bit-gpt/h402/dist/src";
import { paymentDetails } from "@/config/paymentDetails";
import { redirect } from "next/navigation";

export default function Home() {
  const { isConnected } = useAccount();
  const { open } = useAppKit();
  const [paymentStatus, setPaymentStatus] = useState<string>("not_paid");

  useEffect(() => {
    // Check if user is connected
    if (!isConnected) {
      open();
    }
  }, [isConnected, open]);

  const handlePayment = async () => {
    try {
      setPaymentStatus("processing");

      const client = createClient({
        transport: http(window.ethereum as any),
      });

      const paymentHeader = await createPaymentHandler(paymentDetails, client);

      // Redirect to resource with payment header as parameter
      window.location.href = `/resource?h402=${encodeURIComponent(
        paymentHeader
      )}`;
    } catch (error) {
      console.error("Payment failed:", error);
      setPaymentStatus("failed");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <h1 className="text-2xl font-bold mb-6">402 Payment Required Example</h1>

      {!isConnected ? (
        <div className="bg-yellow-100 p-4 rounded-md mb-6">
          <p>Please connect your wallet to continue</p>
          <button
            onClick={() => open()}
            className="mt-2 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
          >
            Connect Wallet
          </button>
        </div>
      ) : (
        <>
          {paymentStatus === "not_paid" && (
            <div className="bg-red-100 p-6 rounded-md mb-6 text-center text-black">
              <h2 className="text-xl font-semibold mb-2">
                402 Payment Required
              </h2>
              <p className="mb-4">You need to pay to access this content</p>
              <button
                onClick={handlePayment}
                className="px-6 py-2 bg-green-500 text-white rounded-md hover:bg-green-600"
              >
                Pay Now
              </button>
            </div>
          )}

          {paymentStatus === "processing" && (
            <div className="bg-blue-100 p-6 rounded-md">
              <p>Processing payment...</p>
            </div>
          )}

          {paymentStatus === "paid" && (
            <div className="bg-green-100 p-6 rounded-md">
              <h2 className="text-xl font-semibold mb-2">
                Payment Successful!
              </h2>
              <p>You now have access to the content</p>
              <div className="mt-4 p-4 bg-white rounded-md border border-gray-200">
                <p>This is the premium content you paid for!</p>
              </div>
            </div>
          )}

          {paymentStatus === "failed" && (
            <div className="bg-red-100 p-6 rounded-md">
              <p>Payment failed. Please try again.</p>
              <button
                onClick={handlePayment}
                className="mt-2 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
              >
                Retry Payment
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
