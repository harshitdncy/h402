import {
  signAuthorization,
  signNativeTransfer,
  encodePayment,
  signTokenTransfer,
} from ".";
import type { Payload } from ".";
import type { WalletClient } from "@/shared/evm";
import type { PaymentDetails, PaymentPayload, Hex } from "@/types";
import { config } from "@/.";
import { evm } from "@/shared";

const TRANSFER_WITH_AUTHORIZATION_ABI = [
  {
    type: "function",
    name: "transferWithAuthorization",
    inputs: [...evm.authorizationTypes.TransferWithAuthorization],
    outputs: [],
    stateMutability: "nonpayable",
  },
] as const;

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

// TODO: Add JSDoc
export async function createPayment(
  client: WalletClient,
  paymentDetails: PaymentDetails
): Promise<PaymentPayload<Payload>> {
  if (!client?.account?.address) {
    throw new Error("Client account is required");
  }

  const from = client.account.address as Hex;
  const to = paymentDetails.toAddress as Hex;
  const value = paymentDetails.amountRequired;

  const basePayment = {
    version: config["402Version"],
    scheme: paymentDetails.scheme,
    namespace: paymentDetails.namespace,
    chainId: paymentDetails.chainId,
    resource: paymentDetails.resource,
  };

  if (paymentDetails.tokenAddress === ZERO_ADDRESS) {
    const { signature, nonce } = await signNativeTransfer(
      client,
      { from, to, value },
      paymentDetails
    );

    return {
      ...basePayment,
      payload: {
        type: "nativeTransfer",
        signature,
        transaction: { from, to, value, nonce },
      },
    };
  }

  const hasTransferWithAuthorization = await client
    .readContract({
      address: paymentDetails.tokenAddress as Hex,
      abi: TRANSFER_WITH_AUTHORIZATION_ABI,
      functionName: "transferWithAuthorization",
    })
    .then(() => true)
    .catch(() => false);

  if (hasTransferWithAuthorization) {
    const { signature, nonce, version, validAfter, validBefore } =
      await signAuthorization(client, { from, to, value }, paymentDetails);

    return {
      ...basePayment,
      payload: {
        type: "authorization",
        signature,
        authorization: {
          from,
          to,
          value,
          validAfter,
          validBefore,
          nonce,
          version,
        },
      },
    };
  }

  const { signature, nonce, data } = await signTokenTransfer(
    client,
    { from, to, value },
    paymentDetails
  );

  return {
    ...basePayment,
    payload: {
      type: "tokenTransfer",
      signature,
      transaction: {
        from,
        to,
        value,
        nonce,
        data,
      },
    },
  };
}

// TODO: Add JSDoc
export async function createPaymentHeader(
  client: WalletClient,
  paymentDetails: PaymentDetails
): Promise<string> {
  const payment = await createPayment(client, paymentDetails);
  return encodePayment(payment);
}
