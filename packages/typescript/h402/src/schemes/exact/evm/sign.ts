import type { Hex, PaymentDetails, WalletClient } from "../../../types/index.js";
import {
  AuthorizationParameters,
  NativeTransferParameters,
  TokenTransferParameters,
} from "./index.js";
import { evm } from "../../../shared/index.js";
import { createNonce } from "../../../utils/index.js";
import { encodeFunctionData } from "viem";

const ERC20_ABI = [
  {
    name: "transfer",
    type: "function",
    inputs: [
      { name: "to", type: "address" },
      { name: "value", type: "uint256" },
    ],
    outputs: [{ name: "success", type: "bool" }],
    stateMutability: "nonpayable",
  },
] as const;

// TODO: Add JSDoc
async function signNativeTransfer(
  client: WalletClient,
  { from, to, value }: Pick<NativeTransferParameters, "from" | "to" | "value">,
  { chainId }: PaymentDetails
): Promise<{ signature: Hex; nonce: number }> {
  try {
    const request = await client.prepareTransactionRequest({
      account: from,
      to,
      value: value as bigint,
      chain: evm.getChain(chainId),
    });

    const signature = await client.signTransaction(request);

    return { signature, nonce: request.nonce };
  } catch (error) {
    throw new Error(
      `Failed to sign native transfer: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

// TODO: Add JSDoc
async function signTokenTransfer(
  client: WalletClient,
  { from, to, value }: Pick<TokenTransferParameters, "from" | "to" | "value">,
  { tokenAddress, chainId }: PaymentDetails
): Promise<{ signature: Hex; nonce: number; data: Hex }> {
  try {
    const data = encodeFunctionData({
      abi: ERC20_ABI,
      functionName: "transfer",
      args: [to, value],
    });

    const request = await client.prepareTransactionRequest({
      account: from,
      to: tokenAddress as Hex,
      data,
      chain: evm.getChain(chainId),
    });

    const signature = await client.signTransaction(request);

    return { signature, nonce: request.nonce, data };
  } catch (error) {
    throw new Error(
      `Failed to sign token transfer: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

// TODO: Add JSDoc
async function signAuthorization(
  client: WalletClient,
  { from, to, value }: Pick<AuthorizationParameters, "from" | "to" | "value">,
  { tokenAddress, chainId, estimatedProcessingTime }: PaymentDetails
): Promise<{
  signature: Hex;
  nonce: Hex;
  version: string;
  validAfter: bigint;
  validBefore: bigint;
}> {
  try {
    const nonce = createNonce();
    const validAfter = BigInt(
      Math.floor(Date.now() / 1000) - 5 // 1 block (2s) before to account for block timestamping
    );
    const validBefore = BigInt(
      Math.floor(Date.now() / 1000 + estimatedProcessingTime)
    );
    const { domain } = await client.getEip712Domain({
      address: tokenAddress as Hex,
    });

    const data = {
      types: {
        TransferWithAuthorization: [
          { name: "from", type: "address" },
          { name: "to", type: "address" },
          { name: "value", type: "uint256" },
          { name: "validAfter", type: "uint256" },
          { name: "validBefore", type: "uint256" },
          { name: "nonce", type: "bytes32" },
        ],
      },
      domain: {
        name: domain.name,
        version: domain.version,
        chainId: parseInt(chainId),
        verifyingContract: tokenAddress as Hex,
      },
      primaryType: "TransferWithAuthorization" as const,
      message: {
        from,
        to,
        value,
        validAfter,
        validBefore,
        nonce,
      },
    };

    const signature = await client.signTypedData(data);

    return {
      signature,
      nonce,
      version: domain.version,
      validAfter,
      validBefore,
    };
  } catch (error) {
    throw new Error(
      `Failed to sign authorization: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

export { signNativeTransfer, signTokenTransfer, signAuthorization };
