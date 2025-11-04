import { sha256 } from "@noble/hashes/sha2.js";
import { hashes } from '@noble/secp256k1'
import {
  ArkadeClient,
  ArkadePaymentPayload,
  PaymentRequirements,
} from "../../../types/index.js";
import * as utils from "./utils.js";

// Needed to sign the message, perhaps to be lifted up int App structure?
hashes.sha256 = sha256

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
    networkId: requirements.networkId || "bitcoin",
    resource: requirements.resource ?? `402 signature`,
  };

  if (typeof client.signAndSendTransaction === "function") {
    try {
      const resourceSignatureHex = await utils.signResourceMessage(
        client,
        requirements.resource ?? `402 signature`
      );

      console.log("[Arkade Payment] Using signAndSendTransaction method");
      const arkTxid = await signAndSendTransaction(client, requirements);

      const payload: ArkadePaymentPayload = {
        ...basePayload,
        payload: {
          type: "signAndSendTransaction",
          txId: arkTxid,
          signedMessage: resourceSignatureHex,
        },
      };

      return utils.encodePaymentPayload(payload);
    } catch (error) {
      console.warn(
        "[Arkade Payment] signAndSendTransaction failed",
        error
      );
    }
  }

  throw new Error("Client must implement signAndSendTransaction");
}

export { createPayment };
