import { PaymentDetails } from "../types/index.js";
import { evm } from "./index.js";
import { PublicActions } from "viem";
import { Hex } from "../types/index.js";

const ERC20_ABI = [
  {
    inputs: [],
    name: "decimals",
    outputs: [{ type: "uint8", name: "" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

export async function parsePaymentDetailsForAmount(
  paymentDetails: PaymentDetails,
  client: PublicActions
): Promise<PaymentDetails> {
  if (paymentDetails.amountRequiredFormat === "atomic") {
    return {
      ...paymentDetails,
    };
  }

  if (
    paymentDetails.amountRequiredFormat === "formatted" &&
    paymentDetails.tokenAddress === evm.ZERO_ADDRESS
  ) {
    const decimals = evm.chains[paymentDetails.networkId].nativeTokenDecimals;

    return {
      ...paymentDetails,
      amountRequired: BigInt(Math.floor(Number(paymentDetails.amountRequired) * 10 ** decimals)),
    };
  }

  try {
    const decimals = (await client.readContract({
      address: paymentDetails.tokenAddress as Hex,
      abi: ERC20_ABI,
      functionName: "decimals",
    })) as number;

    return {
      ...paymentDetails,
      amountRequired: BigInt(
      Math.floor(Number(paymentDetails.amountRequired) * 10 ** decimals)
      ),
    };
  } catch (error) {
    throw new Error(
      `Token at address ${paymentDetails.tokenAddress} is not ERC20 compliant: missing decimals function`
    );
  }
}
