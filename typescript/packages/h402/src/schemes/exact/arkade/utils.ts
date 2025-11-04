import { ArkadeClient, ArkadePaymentPayload, PaymentRequirements } from "../../../types/index.js";
import { safeBase64Decode, safeBase64Encode } from "../../../shared/index.js";
import { convertAmountToSmallestUnit } from "../../../shared/arkade/amount.js";
import { NATIVE_BTC_DECIMALS } from "../../../shared/arkade/index.js";
import { ErrorReasons } from "../../../types/verify/h402Specs.js";
import { ArkAddress, RestArkProvider } from "@arkade-os/sdk";
import { schnorr } from "@noble/secp256k1";
import { sha256 } from "@noble/hashes/sha2.js";
import { base64, bech32m } from "@scure/base";
import { Transaction} from "@arkade-os/sdk";
import { getArkadeServerUrl } from "../../../shared/next.js";


/**
 * Encodes an Arkade payment payload to base64
 */
function encodePaymentPayload(payload: ArkadePaymentPayload): string {
  const safe = {
    ...payload,
    payload: {
      ...payload.payload,
    },
  };

  return safeBase64Encode(JSON.stringify(safe));
}

/**
 * Decodes a base64 Arkade payment payload
 */
function decodePaymentPayload(payment: string): ArkadePaymentPayload {
  const decoded = safeBase64Decode(payment);
  const parsed = JSON.parse(decoded);

  return validatePaymentPayload(parsed);
}

/**
 * Validates an Arkade payment payload structure
 */
function validatePaymentPayload(obj: ArkadePaymentPayload): ArkadePaymentPayload {
  if (!obj || typeof obj !== "object") {
    throw new Error("Invalid payment payload: not an object");
  }

  if (!obj.payload || typeof obj.payload !== "object") {
    throw new Error("Invalid payment payload: missing or invalid payload");
  }

  if (!obj.payload.type || typeof obj.payload.type !== "string") {
    throw new Error("Invalid payment payload: missing or invalid payload type");
  }

  const validTypes = [
    "signAndSendTransaction",
    "signMessage",
  ];
  if (!validTypes.includes(obj.payload.type)) {
    throw new Error(
      `Invalid payment payload: unsupported type ${obj.payload.type}`
    );
  }

  if (obj.payload.type === "signAndSendTransaction") {
    if (!obj.payload.txId || typeof obj.payload.txId !== "string") {
      throw new Error(
        "Invalid payment payload: signAndSendTransaction type requires signature field"
      );
    }

    if (!obj.payload.signedMessage || typeof obj.payload.signedMessage !== "string") {
      throw new Error(
        "Invalid payment payload: signAndSendTransaction type requires signedMessage field"
      );
    }
  }

  if (obj.payload.type === "signMessage") {
    if (!obj.payload.signature || typeof obj.payload.signature !== "string") {
      throw new Error(
        "Invalid payment payload: signMessage type requires signature field"
      );
    }
    if (!obj.payload.message || typeof obj.payload.message !== "object") {
      throw new Error(
        "Invalid payment payload: signMessage type requires message object"
      );
    }
    if (
      !obj.payload.message.message ||
      typeof obj.payload.message.message !== "string"
    ) {
      throw new Error(
        "Invalid payment payload: signMessage requires message.message field"
      );
    }
    if (
      !obj.payload.message.signature ||
      typeof obj.payload.message.signature !== "string"
    ) {
      throw new Error(
        "Invalid payment payload: signMessage requires message.signature field"
      );
    }
  }

  return obj as ArkadePaymentPayload;
}

/**
 * Validates an Arkade address format using the SDK's ArkAddress decoder
 * Arkade addresses are bech32m encoded with format: hrp + version + serverPubKey + vtxoTaprootKey
 */
function isValidArkadeAddress(address: string): boolean {
  try {
    if (typeof address !== "string" || address.length === 0) {
      return false;
    }

    ArkAddress.decode(address);
    return true;
  } catch {
    return false;
  }
}

/**
 * Signs a resource message using the client's identity
 * Creates a Schnorr signature of the SHA256 hash of the resource string
 */
async function signResourceMessage(
  client: ArkadeClient,
  resource: string
): Promise<string> {
  const resourceBytes = new TextEncoder().encode(resource);
  const resourceHash = sha256(resourceBytes);
  
  if (!client.identity?.signMessage) {
    throw new Error("Client identity.signMessage is required for signing resource messages");
  }
  
  const resourceSignature = await client.identity.signMessage(
    resourceHash,
    "schnorr"
  );
  
  return Buffer.from(resourceSignature).toString("hex");
}

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

interface TransactionValidationResult {
  isValid: boolean;
  errorMessage?: string;
  invalidReason?: typeof ErrorReasons[number];
  senderPubkey?: string;
}

/**
 * Validate an Arkade transaction
 */
async function validateArkadeTransaction(
  txBase64: string,
  signedMessage: string,
  paymentRequirements: PaymentRequirements
): Promise<TransactionValidationResult> {
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
    
  const psbtBytes = base64.decode(txBase64);

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

    if (!input) {
      return {
        isValid: false,
        errorMessage: "Invalid input at index " + i,
        invalidReason: "invalid_exact_arkade_payload_tx_input_invalid",
      };
    }

    if (!input.witnessUtxo) {
      return {
        isValid: false,
        errorMessage: "Missing witness UTXO for input " + i,
        invalidReason: "invalid_exact_arkade_payload_tx_input_missing_witness",
      };
    }

    if (!input.tapLeafScript || input.tapLeafScript.length === 0) {
      return {
        isValid: false,
        errorMessage: "Missing tapLeafScript for input " + i,
        invalidReason: "invalid_exact_arkade_payload_tx_input_missing_tapleaf",
      };
    }

    if (!input.tapScriptSig || input.tapScriptSig.length === 0) {
      return {
        isValid: false,
        errorMessage: "Input " + i + " is not signed",
        invalidReason: "invalid_exact_arkade_payload_tx_input_unsigned",
      };
    }


    if (input && input.tapScriptSig && input.tapScriptSig.length > 0) {
      for (let j = 0; j < input.tapScriptSig.length; j++) {
        const [controlBlock] = input.tapScriptSig[j];

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
      invalidReason: "invalid_exact_arkade_payload_tx_sender_pubkey_not_found",
    };
  }

  const isValidSignature = await verifySignedMessage(
    paymentRequirements.resource ?? `402 signature`,
    signedMessage,
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

  let foundPaymentOutput = false;
  let totalAmountToPayer = BigInt(0);

  const requiredAmount = convertAmountToSmallestUnit(
    paymentRequirements.amountRequired,
    paymentRequirements.tokenDecimals || NATIVE_BTC_DECIMALS,
    paymentRequirements.amountRequiredFormat
  );

  for (let i = 0; i < transaction.outputsLength; i++) {
    const output = transaction.getOutput(i);
    
    if (!output || !output.script) {
      continue;
    }

    const outputAmount = BigInt(output.amount || 0);
    const scriptHex = Buffer.from(output.script).toString("hex");

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

        if (arkAddress === paymentRequirements.payToAddress) {
          foundPaymentOutput = true;
          totalAmountToPayer += outputAmount;
        }
      } catch (error) {
        continue;
      }
    }
  }

  if (!foundPaymentOutput) {
    return {
      isValid: false,
      errorMessage: "No output to recipient address found",
      invalidReason: "invalid_exact_arkade_payload_tx_output_not_found",
    };
  }

  if (totalAmountToPayer < requiredAmount) {
    return {
      isValid: false,
      errorMessage: `Insufficient payment: required ${requiredAmount}, got ${totalAmountToPayer}`,
      invalidReason: "invalid_exact_arkade_payload_tx_amount_mismatch",
    };
  }

  const dustAmount = BigInt(info.dust || 330);
  
  if (totalAmountToPayer < dustAmount) {
    return {
      isValid: false,
      errorMessage: `Insufficient payment: required ${requiredAmount}, got ${totalAmountToPayer}`,
      invalidReason: "invalid_exact_arkade_payload_tx_amount_less_than_dust",
    };
  }

  return {
    isValid: true,
    senderPubkey,
  };
}

export {
  encodePaymentPayload,
  decodePaymentPayload,
  validatePaymentPayload,
  isValidArkadeAddress,
  signResourceMessage,
  validateArkadeTransaction,
};