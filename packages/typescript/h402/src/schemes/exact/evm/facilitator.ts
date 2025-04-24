import { evm } from "../../../shared/index.js";
import { SCHEME } from "../index.js";
import type {
  VerifyResponse,
  PaymentDetails,
  PaymentPayload,
  Hex,
} from "../../../types/index.js";
import type {
  Payload,
  AuthorizationPayload,
  NativeTransferPayload,
  TokenTransferPayload,
} from "./index.js";
import { config } from "../../../index.js";
import { encodeFunctionData, createPublicClient, http } from "viem";

const MAX_GAS_AMOUNT = BigInt(300000); // Maximum gas we're willing to pay for
const BLOCK_TIME = 2; // Average block time in seconds
const SAFETY_BLOCKS = 3; // Number of blocks for safety margin

async function verify(
  client: evm.PublicClient,
  payload: PaymentPayload<Payload>,
  paymentDetails: PaymentDetails
): Promise<VerifyResponse> {
  try {
    if (!validateBasePayload(payload, paymentDetails)) {
      return {
        isValid: false,
        errorMessage: "Invalid payload structure or version mismatch",
      };
    }

    if (!validateChain(payload, paymentDetails)) {
      return {
        isValid: false,
        errorMessage: "Invalid chain configuration",
      };
    }

    switch (payload.payload.type) {
      case "authorization":
        return await verifyAuthorizationPayload(
          client,
          payload.payload,
          paymentDetails
        );
      case "nativeTransfer":
        return await verifyNativeTransferPayload(
          client,
          payload.payload,
          paymentDetails
        );
      case "tokenTransfer":
        return await verifyTokenTransferPayload(
          client,
          payload.payload,
          paymentDetails
        );
      default:
        return {
          isValid: false,
          errorMessage: "Unsupported payload type",
        };
    }
  } catch (error) {
    return {
      isValid: false,
      errorMessage: error instanceof Error ? error.message : String(error),
    };
  }
}

function validateBasePayload(
  payload: PaymentPayload<Payload>,
  paymentDetails: PaymentDetails
): boolean {
  return (
    payload.version === config["h402Version"] &&
    payload.scheme === SCHEME &&
    payload.namespace === paymentDetails.namespace &&
    payload.chainId === paymentDetails.chainId &&
    payload.resource === paymentDetails.resource
  );
}

function validateChain(
  payload: PaymentPayload<Payload>,
  paymentDetails: PaymentDetails
): boolean {
  return (
    payload.chainId === paymentDetails.chainId && payload.namespace === "eip155"
  );
}

async function verifyAuthorizationPayload(
  client: evm.PublicClient,
  payload: AuthorizationPayload,
  paymentDetails: PaymentDetails
): Promise<VerifyResponse> {
  const currentTime = Math.floor(Date.now() / 1000);
  const safetyMargin = BLOCK_TIME * SAFETY_BLOCKS;

  if (payload.authorization.validBefore < BigInt(currentTime + safetyMargin)) {
    return {
      isValid: false,
      errorMessage: "Authorization deadline too close to current time",
    };
  }

  if (payload.authorization.validAfter > BigInt(currentTime)) {
    return {
      isValid: false,
      errorMessage: "Authorization not yet valid",
    };
  }

  if (payload.authorization.value < paymentDetails.amountRequired) {
    return {
      isValid: false,
      errorMessage: "Insufficient authorized amount",
    };
  }

  if (payload.authorization.to !== paymentDetails.toAddress) {
    return {
      isValid: false,
      errorMessage: "Invalid recipient address",
    };
  }

  const balance = await client.readContract({
    address: paymentDetails.tokenAddress as `0x${string}`,
    abi: [
      {
        name: "balanceOf",
        type: "function",
        inputs: [{ name: "account", type: "address" }],
        outputs: [{ name: "balance", type: "uint256" }],
        stateMutability: "view",
      },
    ],
    functionName: "balanceOf",
    args: [payload.authorization.from],
  });

  if (balance < payload.authorization.value) {
    return {
      isValid: false,
      errorMessage: "Insufficient token balance",
    };
  }

  try {
    const data = encodeFunctionData({
      abi: [
        {
          name: "transferWithAuthorization",
          type: "function",
          inputs: [
            { name: "from", type: "address" },
            { name: "to", type: "address" },
            { name: "value", type: "uint256" },
            { name: "validAfter", type: "uint256" },
            { name: "validBefore", type: "uint256" },
            { name: "nonce", type: "bytes32" },
            { name: "signature", type: "bytes" },
          ],
          outputs: [],
          stateMutability: "nonpayable",
        },
      ],
      functionName: "transferWithAuthorization",
      args: [
        payload.authorization.from,
        payload.authorization.to,
        payload.authorization.value,
        payload.authorization.validAfter,
        payload.authorization.validBefore,
        payload.authorization.nonce,
        payload.signature,
      ],
    });

    const gasEstimate = await client.estimateGas({
      account: payload.authorization.from,
      to: paymentDetails.tokenAddress as `0x${string}`,
      data,
    });

    if (gasEstimate > MAX_GAS_AMOUNT) {
      return {
        isValid: false,
        errorMessage: "Authorization would require too much gas",
      };
    }
  } catch (error) {
    return {
      isValid: false,
      errorMessage:
        "Failed to estimate gas: " +
        (error instanceof Error ? error.message : String(error)),
    };
  }

  const isValidSignature = await client.readContract({
    address: paymentDetails.tokenAddress as `0x${string}`,
    abi: [
      {
        name: "verifyTransferAuthorization",
        type: "function",
        inputs: [
          { name: "from", type: "address" },
          { name: "to", type: "address" },
          { name: "value", type: "uint256" },
          { name: "validAfter", type: "uint256" },
          { name: "validBefore", type: "uint256" },
          { name: "nonce", type: "bytes32" },
          { name: "signature", type: "bytes" },
        ],
        outputs: [{ name: "valid", type: "bool" }],
        stateMutability: "view",
      },
    ],
    functionName: "verifyTransferAuthorization",
    args: [
      payload.authorization.from,
      payload.authorization.to,
      payload.authorization.value,
      payload.authorization.validAfter,
      payload.authorization.validBefore,
      payload.authorization.nonce,
      payload.signature,
    ],
  });

  if (!isValidSignature) {
    return {
      isValid: false,
      errorMessage: "Invalid signature",
    };
  }

  return { isValid: true };
}

async function verifyNativeTransferPayload(
  client: evm.PublicClient,
  payload: NativeTransferPayload,
  paymentDetails: PaymentDetails
): Promise<VerifyResponse> {
  if (payload.transaction.value < paymentDetails.amountRequired) {
    return {
      isValid: false,
      errorMessage: "Insufficient transfer amount",
    };
  }

  if (payload.transaction.to !== paymentDetails.toAddress) {
    return {
      isValid: false,
      errorMessage: "Invalid recipient address",
    };
  }

  try {
    const gasEstimate = await client.estimateGas({
      account: payload.transaction.from,
      to: payload.transaction.to,
      value: payload.transaction.value,
    });

    if (gasEstimate > MAX_GAS_AMOUNT) {
      return {
        isValid: false,
        errorMessage: "Transaction would require too much gas",
      };
    }

    const balance = await client.getBalance({
      address: payload.transaction.from,
    });
    if (balance < payload.transaction.value) {
      return {
        isValid: false,
        errorMessage: "Insufficient balance including maximum gas cost",
      };
    }
  } catch (error) {
    return {
      isValid: false,
      errorMessage:
        "Failed to estimate gas: " +
        (error instanceof Error ? error.message : String(error)),
    };
  }

  const hash = await client.getTransaction({ hash: payload.signature });
  const recoveredAddress = await client.verifyMessage({
    address: payload.transaction.from,
    message: { raw: hash?.input || "0x" },
    signature: payload.signature,
  });

  if (!recoveredAddress) {
    return {
      isValid: false,
      errorMessage: "Invalid signature",
    };
  }

  return { isValid: true };
}

async function verifyTokenTransferPayload(
  client: evm.PublicClient,
  payload: TokenTransferPayload,
  paymentDetails: PaymentDetails
): Promise<VerifyResponse> {
  if (payload.transaction.value < paymentDetails.amountRequired) {
    return {
      isValid: false,
      errorMessage: "Insufficient transfer amount",
    };
  }

  if (payload.transaction.to !== paymentDetails.toAddress) {
    return {
      isValid: false,
      errorMessage: "Invalid recipient address",
    };
  }

  const balance = await client.readContract({
    address: paymentDetails.tokenAddress as `0x${string}`,
    abi: [
      {
        name: "balanceOf",
        type: "function",
        inputs: [{ name: "account", type: "address" }],
        outputs: [{ name: "balance", type: "uint256" }],
        stateMutability: "view",
      },
    ],
    functionName: "balanceOf",
    args: [payload.transaction.from],
  });

  if (balance < payload.transaction.value) {
    return {
      isValid: false,
      errorMessage: "Insufficient token balance",
    };
  }

  try {
    const gasEstimate = await client.estimateGas({
      account: payload.transaction.from,
      to: paymentDetails.tokenAddress as `0x${string}`,
      data: payload.transaction.data,
    });

    if (gasEstimate > MAX_GAS_AMOUNT) {
      return {
        isValid: false,
        errorMessage: "Transaction would require too much gas",
      };
    }
  } catch (error) {
    return {
      isValid: false,
      errorMessage:
        "Failed to estimate gas: " +
        (error instanceof Error ? error.message : String(error)),
    };
  }

  const hash = await client.getTransaction({ hash: payload.signature });
  const recoveredAddress = await client.verifyMessage({
    address: payload.transaction.from,
    message: { raw: hash?.input || "0x" },
    signature: payload.signature,
  });

  if (!recoveredAddress) {
    return {
      isValid: false,
      errorMessage: "Invalid signature",
    };
  }

  return { isValid: true };
}

async function settle(
  client: evm.WalletClient,
  payload: PaymentPayload<Payload>,
  paymentDetails: PaymentDetails
): Promise<{ txHash: string } | { errorMessage: string }> {
  try {
    if (!validateBasePayload(payload, paymentDetails)) {
      return { errorMessage: "Invalid payload structure or version mismatch" };
    }

    if (!validateChain(payload, paymentDetails)) {
      return { errorMessage: "Invalid chain configuration" };
    }

    const txHash = await client.sendRawTransaction({
      serializedTransaction: payload.payload.signature as Hex,
    });

    const publicClient = createPublicClient({
      chain: evm.getChain(paymentDetails.chainId),
      transport: http(),
    });

    const receipt = await publicClient.waitForTransactionReceipt({
      hash: txHash as `0x${string}`,
    });

    if (receipt.status === "success") {
      return { txHash };
    }

    return { errorMessage: "Transaction failed" };
  } catch (error) {
    return {
      errorMessage: `Failed to settle payment: ${
        error instanceof Error ? error.message : String(error)
      }`,
    };
  }
}

export { verify, settle };
