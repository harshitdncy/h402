import {
  ArkadeClient,
  ArkadePaymentPayload,
  ArkadeSignTransactionPayload,
  ArkadeSignAndSendTransactionPayload,
  ArkadeSignMessagePayload,
  PaymentRequirements,
  SettleResponse,
  VerifyResponse,
} from "../../../types/index.js";
import {
  RestArkProvider,
  RestIndexerProvider,
  Transaction,
} from "@arkade-os/sdk";
import { schnorr } from "@noble/secp256k1";
import { base64, bech32m } from "@scure/base";
import { sha256 } from "@noble/hashes/sha2.js";
import { getArkadeServerUrl } from "../../../shared/next.js";
import { convertAmountToSmallestUnit } from "../../../shared/arkade/amount.js";
import { NATIVE_BTC_DECIMALS } from "../../../shared/arkade/index.js";

/**
 * Verify a Schnorr signature using the sender's x-only public key
 */
async function verifySignedMessage(
  message: string,
  signatureHex: string,
  publicKeyHex: string
) {
  try {
    const messageBytes = new TextEncoder().encode(message);
    const messageHash = sha256(messageBytes);

    const signature = Buffer.from(signatureHex, "hex");
    const publicKey = Buffer.from(publicKeyHex, "hex");

    const isValid = await schnorr.verifyAsync(
      signature,
      messageHash,
      publicKey
    );

    return isValid;
  } catch (error) {
    return false;
  }
}

/**
 * Transaction is already broadcast, so we verify it exists off-chain
 */
async function verifySignAndSendTransactionPayload(
  payload: ArkadeSignAndSendTransactionPayload,
  paymentRequirements: PaymentRequirements
): Promise<VerifyResponse> {
  console.log("[Arkade Verify] Verifying signAndSendTransaction", {
    arkTxid: payload.txId,
    payToAddress: paymentRequirements.payToAddress,
    amountRequired: paymentRequirements.amountRequired,
    signedMessage: payload.signedMessage,
  });

  if (!payload.txId) {
    return {
      isValid: false,
      errorMessage:
        "Missing required arkTxid in signAndSendTransaction payload",
      invalidReason: "invalid_exact_arkade_payload_txId",
    };
  }

  if (!payload.signedMessage) {
    return {
      isValid: false,
      errorMessage:
        "Missing required signedMessage in signAndSendTransaction payload",
      invalidReason: "invalid_exact_arkade_payload_signedMessage",
    };
  }

  try {
    const arkadeProvider = new RestArkProvider(getArkadeServerUrl());
    const info = await arkadeProvider.getInfo();
    const signerPubkey = info.signerPubkey;
    if (!signerPubkey) {
      return {
        isValid: false,
        errorMessage: "Signer pubkey not found",
        invalidReason: "invalid_exact_arkade_payload_signer_pubkey",
      };
    }

    const indexer = new RestIndexerProvider(getArkadeServerUrl());
    const virtualTxs = await indexer.getVirtualTxs([payload.txId]);

    if (!virtualTxs || (virtualTxs?.txs && virtualTxs.txs.length === 0)) {
      return {
        isValid: false,
        errorMessage: "Transaction not found",
        invalidReason: "invalid_exact_arkade_payload_txId_not_found",
      };
    }

    const tx = virtualTxs.txs[0];

    const psbtBytes = base64.decode(tx);

    if (psbtBytes.length === 0) {
      return {
        isValid: false,
        errorMessage: "Invalid transaction: empty PSBT",
        invalidReason: "invalid_exact_arkade_payload_psbt_empty",
      };
    }

    const transaction = Transaction.fromPSBT(psbtBytes);
    const SERVER_PUBKEY = signerPubkey.slice(2);

    let senderPubkey: string | undefined;

    for (let i = 0; i < transaction.inputsLength; i++) {
      const input = transaction.getInput(i);

      if (input && input.tapScriptSig && input.tapScriptSig.length > 0) {
        for (let j = 0; j < input.tapScriptSig.length; j++) {
          const [controlBlock, signature] = input.tapScriptSig[j];

          if (controlBlock && controlBlock.pubKey) {
            const pubkeyHex = Buffer.from(controlBlock.pubKey).toString("hex");

            if (pubkeyHex !== SERVER_PUBKEY) {
              senderPubkey = pubkeyHex;
              break;
            }
          }
        }
      }
    }

    if (!senderPubkey) {
      return {
        isValid: false,
        errorMessage: "Sender pubkey not found",
        invalidReason: "invalid_exact_arkade_payload_sender_pubkey_not_found",
      };
    }

    const isValidSignature = await verifySignedMessage(
      paymentRequirements.resource ?? `402 signature`,
      payload.signedMessage,
      senderPubkey
    );
    if (!isValidSignature) {
      return {
        isValid: false,
        errorMessage: "Invalid signature",
        invalidReason:
          "invalid_exact_arkade_payload_signed_message_signature_mismatch",
      };
    }

    const output = transaction.getOutput(0);

    if (!output || !output.script) {
      return {
        isValid: false,
        errorMessage: "No matching output found",
        invalidReason: "invalid_exact_arkade_payload_output_not_found",
      };
    }

    const outputAmount = BigInt(output.amount || 0);
    const scriptHex = Buffer.from(output.script || []).toString("hex");

    const requiredAmount = convertAmountToSmallestUnit(
      paymentRequirements.amountRequired,
      paymentRequirements.tokenDecimals || NATIVE_BTC_DECIMALS,
      paymentRequirements.amountRequiredFormat
    );

    if (scriptHex.startsWith("5120") && scriptHex.length === 68) {
      const vtxoTaprootKeyHex = scriptHex.slice(4);
      try {
        const addressData = new Uint8Array(65);
        addressData[0] = 0;
        addressData.set(Buffer.from(SERVER_PUBKEY, "hex"), 1);
        addressData.set(Buffer.from(vtxoTaprootKeyHex, "hex"), 33);

        const arkAddress = bech32m.encode(
          "ark",
          bech32m.toWords(addressData),
          1023
        );

        if (arkAddress !== paymentRequirements.payToAddress) {
          return {
            isValid: false,
            errorMessage: "Recipient address mismatch",
            invalidReason: "invalid_exact_arkade_payload_recipient_mismatch",
          };
        } else if (outputAmount < requiredAmount) {
          return {
            isValid: false,
            errorMessage: "Amount mismatch",
            invalidReason: "invalid_exact_arkade_payload_amount_mismatch",
          };
        }
      } catch (error) {
        return {
          isValid: false,
          errorMessage: "Failed to generate Arkade address",
          invalidReason: "invalid_exact_arkade_payload_recipient_mismatch",
        };
      }
    } else {
      return {
        isValid: false,
        errorMessage: "Invalid transaction: not a taproot output",
        invalidReason: "invalid_exact_arkade_payload_output_not_found",
      };
    }

    return {
      isValid: true,
      txHash: payload.txId,
      type: "transaction",
    };
  } catch (error) {
    console.error("[Arkade Verify] Error verifying transaction:", error);
    return {
      isValid: false,
      errorMessage: `Failed to verify transaction: ${
        error instanceof Error ? error.message : String(error)
      }`,
      invalidReason: "invalid_payload",
    };
  }
}

/**
 * Verifies a signTransaction payload
 * Transaction is signed but not broadcast, facilitator will broadcast it
 */
async function verifySignTransactionPayload(
  payload: ArkadeSignTransactionPayload,
  paymentRequirements: PaymentRequirements
): Promise<VerifyResponse> {
  console.log("[Arkade Verify] Verifying signTransaction", {
    hasTransaction: !!payload.transaction,
    hasCheckpoints: !!payload.checkpoints,
  });

  if (!payload.transaction) {
    return {
      isValid: false,
      errorMessage: "Missing signed transaction (PSBT) in payload",
      invalidReason: "invalid_payload",
    };
  }

  try {
    const psbtBytes = base64.decode(payload.transaction);

    if (psbtBytes.length === 0) {
      return {
        isValid: false,
        errorMessage: "Invalid transaction: empty PSBT",
        invalidReason: "invalid_payload",
      };
    }

    const transaction = Transaction.fromPSBT(psbtBytes);

    console.log("[Arkade Verify] Parsed PSBT", {
      outputsCount: transaction.outputsLength,
      inputsCount: transaction.inputsLength,
    });

    if (transaction.outputsLength === 0) {
      return {
        isValid: false,
        errorMessage: "Invalid transaction: no outputs",
        invalidReason: "invalid_payload",
      };
    }

    const requiredAddress = paymentRequirements.payToAddress;
    const requiredAmount = BigInt(paymentRequirements.amountRequired);

    const networkId = paymentRequirements.networkId;
    const network = networkId === "bitcoin" ? undefined : networkId; // undefined = mainnet in @scure/btc-signer

    console.log("[Arkade Verify] Checking outputs against requirements", {
      requiredAddress,
      requiredAmount: requiredAmount.toString(),
      networkId,
    });

    let foundMatchingOutput = false;
    let matchedOutputIndex = -1;
    let matchedAmount = BigInt(0);

    for (let i = 0; i < transaction.outputsLength; i++) {
      const output = transaction.getOutput(i);

      if (!output || !output.script) {
        continue;
      }

      const outputAmount = BigInt(output.amount || 0);

      let outputAddress: string | undefined;
      try {
        outputAddress = transaction.getOutputAddress(i, network as any);
      } catch (error) {
        console.warn(
          `[Arkade Verify] Could not decode address for output ${i}:`,
          error
        );
        continue;
      }

      console.log(`[Arkade Verify] Output ${i}:`, {
        address: outputAddress,
        amount: outputAmount.toString(),
      });

      if (outputAddress === requiredAddress && outputAmount >= requiredAmount) {
        foundMatchingOutput = true;
        matchedOutputIndex = i;
        matchedAmount = outputAmount;
        console.log("[Arkade Verify] Found matching output!", {
          outputIndex: i,
          address: outputAddress,
          amount: outputAmount.toString(),
          required: requiredAmount.toString(),
        });
        break;
      }
    }

    if (!foundMatchingOutput) {
      return {
        isValid: false,
        errorMessage: `No output found matching recipient address (${requiredAddress}) with sufficient amount (${requiredAmount} sats)`,
        invalidReason: "invalid_exact_arkade_payload_output_not_found",
      };
    }

    console.log("[Arkade Verify] Address and amount verification successful", {
      outputIndex: matchedOutputIndex,
      amount: matchedAmount.toString(),
    });

    // TODO: Verify signatures are valid
    // transaction.finalize() or check if inputs are properly signed
    // This may require access to the public keys

    console.log("[Arkade Verify] PSBT validation successful");

    return {
      isValid: true,
      type: "payload",
    };
  } catch (error) {
    console.error("[Arkade Verify] PSBT parsing error:", error);
    return {
      isValid: false,
      errorMessage: `Invalid transaction format: ${
        error instanceof Error ? error.message : String(error)
      }`,
      invalidReason: "invalid_payload",
    };
  }
}

/**
 * Verifies a signMessage payload
 * Message signatures are not transactions and cannot be used for payment
 */
async function verifySignMessagePayload(
  payload: ArkadeSignMessagePayload,
  paymentRequirements: PaymentRequirements
): Promise<VerifyResponse> {
  console.log("[Arkade Verify] Rejecting signMessage payload");

  return {
    isValid: false,
    errorMessage: "SignMessage payloads cannot be verified as transactions",
    invalidReason: "invalid_payload",
  };
}

/**
 * Main verification function that routes to specific validators
 */
export async function verify(
  payload: ArkadePaymentPayload,
  paymentRequirements: PaymentRequirements
): Promise<VerifyResponse> {
  console.log("[Arkade Verify] Starting verification", {
    payloadType: payload.payload.type,
    networkId: paymentRequirements.networkId,
    amountRequired: paymentRequirements.amountRequired,
  });

  if (paymentRequirements.namespace !== "arkade") {
    return {
      isValid: false,
      errorMessage: 'Payment details must use the "arkade" namespace',
      invalidReason: "invalid_payment_requirements",
    };
  }

  try {
    switch (payload.payload.type) {
      case "signAndSendTransaction":
        return await verifySignAndSendTransactionPayload(
          payload.payload,
          paymentRequirements
        );

      case "signTransaction":
        return await verifySignTransactionPayload(
          payload.payload,
          paymentRequirements
        );

      case "signMessage":
        return await verifySignMessagePayload(
          payload.payload,
          paymentRequirements
        );

      default:
        return {
          isValid: false,
          errorMessage: `Unsupported payload type: ${
            (payload.payload as any).type
          }`,
          invalidReason: "invalid_payload",
        };
    }
  } catch (error) {
    return {
      isValid: false,
      errorMessage: `Error verifying transaction: ${
        error instanceof Error ? error.message : String(error)
      }`,
      invalidReason: "unexpected_verify_error",
    };
  }
}

/**
 * Settles an Arkade payment
 * For signTransaction payloads, this broadcasts the signed transaction and handles checkpoints
 */
export async function settle(
  client: ArkadeClient,
  payload: ArkadePaymentPayload,
  paymentRequirements: PaymentRequirements
): Promise<SettleResponse> {
  console.log("[Arkade Settle] Starting settlement", {
    payloadType: payload.payload.type,
  });

  const valid = await verify(payload, paymentRequirements);

  if (!valid.isValid) {
    return {
      success: false,
      transaction: "",
      errorReason: valid.invalidReason ?? "invalid_scheme",
      error: valid.errorMessage,
      namespace: "arkade",
    };
  }

  if (payload.payload.type === "signAndSendTransaction") {
    return {
      success: false,
      transaction: "",
      namespace: "arkade",
      errorReason: "invalid_scheme",
      error:
        "SignAndSendTransaction payloads cannot be settled (already executed)",
    };
  }

  if (!client.arkProvider) {
    return {
      success: false,
      transaction: "",
      namespace: "arkade",
      errorReason: "invalid_scheme",
      error: "ArkProvider is required for settlement",
    };
  }

  try {
    const signedTxPayload = payload.payload as ArkadeSignTransactionPayload;

    console.log("[Arkade Settle] Submitting transaction to Ark server");
    const result = await client.arkProvider.submitTx(
      signedTxPayload.transaction,
      signedTxPayload.checkpoints || []
    );

    const arkTxid = result.arkTxid;
    const signedCheckpointTxs = result.signedCheckpointTxs || [];

    // If there are checkpoint transactions, we need to finalize them with facilitator signature
    if (signedCheckpointTxs && signedCheckpointTxs.length > 0) {
      console.log(
        "[Arkade Settle] Processing checkpoint transactions:",
        signedCheckpointTxs.length
      );

      if (client.identity) {
        try {
          const identity = client.identity;
          const finalCheckpoints = await Promise.all(
            signedCheckpointTxs.map(async (checkpointPsbt: string) => {
              const tx = Transaction.fromPSBT(base64.decode(checkpointPsbt));
              const fullySignedTx = await identity.sign(tx);
              return base64.encode(fullySignedTx.toPSBT());
            })
          );

          await client.arkProvider.finalizeTx(arkTxid, finalCheckpoints);
          console.log("[Arkade Settle] Checkpoints finalized successfully");
        } catch (error) {
          console.error(
            "[Arkade Settle] Failed to finalize checkpoints:",
            error
          );
          return {
            success: false,
            transaction: arkTxid,
            namespace: "arkade",
            errorReason: "unexpected_settle_error",
            error: `Failed to finalize checkpoints: ${
              error instanceof Error ? error.message : String(error)
            }`,
          };
        }
      } else {
        console.warn(
          "[Arkade Settle] Checkpoints received but no Identity provided - transaction may not be fully settled"
        );
      }
    }

    console.log("[Arkade Settle] Transaction settled:", arkTxid);

    return {
      success: true,
      transaction: arkTxid,
      namespace: "arkade",
    };
  } catch (error) {
    return {
      success: false,
      transaction: "",
      namespace: "arkade",
      errorReason: "unexpected_settle_error",
      error: `Failed to settle Arkade payment: ${
        error instanceof Error ? error.message : String(error)
      }`,
    };
  }
}
