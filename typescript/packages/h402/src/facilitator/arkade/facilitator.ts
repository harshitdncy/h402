import {
    verify as verifyExact,
  } from "../../schemes/exact/arkade/index.js";
  import { ArkadeClient } from "../../types/shared/client.js";
  import {
    ArkadePaymentPayload,
    PaymentRequirements,
    SettleResponse,
    VerifyResponse,
  } from "../../types/index.js";
  
  /**
   * Verifies a payment payload against the required payment details regardless of the scheme
   * this function wraps all verify functions for each specific scheme
   *
   * @param payload - The signed payment payload containing transfer parameters and txId
   * @param paymentRequirements - The payment requirements that the payload must satisfy
   * @returns A VerifyResponse indicating if the payment is valid and any invalidation reason
   */
  export async function verify(
    payload: ArkadePaymentPayload,
    paymentRequirements: PaymentRequirements
  ): Promise<VerifyResponse> {
    if (
      paymentRequirements.scheme === "exact" &&
      paymentRequirements.namespace === "arkade"
    ) {
      const valid = await verifyExact(payload, paymentRequirements);
      return valid;
    }
    return {
      isValid: false,
      invalidReason: "invalid_scheme",
    };
  }
  
  export type Supported = {
    h402Version: number;
    kind: {
      scheme: string;
      networkId: string;
    }[];
  };