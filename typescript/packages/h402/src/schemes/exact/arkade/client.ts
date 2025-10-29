import {
  ArkadeClient,
  ArkadePaymentPayload,
  PaymentRequirements,
} from "../../../types/index.js";
import * as utils from "./utils.js";

async function signTransaction(
  client: ArkadeClient,
  requirements: PaymentRequirements
): Promise<{
  signedTx: string;
  checkpoints?: string[];
  txid: string;
}> {
  if (!client.signTransaction) {
    throw new Error("Client does not support signTransaction");
  }

  const amountSats = Number(requirements.amountRequired.toString());

  console.log("[Arkade Payment] Signing transaction (not broadcasting)", {
    address: requirements.payToAddress,
    amount: amountSats,
  });

  const result = await client.signTransaction({
    address: requirements.payToAddress,
    amount: amountSats,
  });

  console.log("[Arkade Payment] Transaction signed:", result.txid);
  return result;
}

async function signAndSendTransaction(
  client: ArkadeClient,
  requirements: PaymentRequirements
): Promise<string> {
  if (!client.signAndSendTransaction) {
    throw new Error("Client does not support signAndSendTransaction");
  }

  const amountSats = Number(requirements.amountRequired.toString());

  console.log("[Arkade Payment] Signing and sending transaction", {
    address: requirements.payToAddress,
    amount: amountSats,
  });

  const arkTxid = await client.signAndSendTransaction({
    address: requirements.payToAddress,
    amount: amountSats,
  });

  console.log("[Arkade Payment] Transaction broadcast:", arkTxid);
  return arkTxid;
}

async function createPayment(
  client: ArkadeClient,
  h402Version: number,
  requirements: PaymentRequirements
): Promise<string> {
  if (!requirements.payToAddress) throw new Error("Missing payToAddress");
  if (requirements.amountRequired === undefined)
    throw new Error("Missing amountRequired");

  const basePayload = {
    h402Version: h402Version,
    scheme: "exact" as const,
    namespace: "arkade" as const,
    networkId: requirements.networkId || "mainnet",
    resource: requirements.resource ?? `402 signature ${Date.now()}`,
  };

  // Try signTransaction first (preferred - gives facilitator control)
  if (typeof client.signTransaction === "function") {
    try {
      console.log("[Arkade Payment] Using signTransaction method");
      const result = await signTransaction(client, requirements);

      const payload: ArkadePaymentPayload = {
        ...basePayload,
        payload: {
          type: "signTransaction",
          txId: result.txid,
          transaction: result.signedTx,
          checkpoints: result.checkpoints,
        },
      };

      return utils.encodePaymentPayload(payload);
    } catch (error) {
      console.warn(
        "[Arkade Payment] signTransaction failed, trying signAndSendTransaction:",
        error
      );
    }
  }

  if (typeof client.signAndSendTransaction === "function") {
    console.log("[Arkade Payment] Using signAndSendTransaction method");
    const arkTxid = await signAndSendTransaction(client, requirements);

    const payload: ArkadePaymentPayload = {
      ...basePayload,
      payload: {
        type: "signAndSendTransaction",
        txId: arkTxid,
      },
    };

    return utils.encodePaymentPayload(payload);
  }

  throw new Error(
    "Client must implement either signTransaction or signAndSendTransaction"
  );
}

export { createPayment };
