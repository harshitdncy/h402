import {
    verify as verifyExact,
    settle as settleExact,
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
  
  /**
   * Settles a payment payload against the required payment details regardless of the scheme
   * this function wraps all settle functions for each specific scheme
   *
   * @param client - The Arkade client used for blockchain interactions
   * @param payload - The signed payment payload containing transfer parameters and txId
   * @param paymentRequirements - The payment requirements that the payload must satisfy
   * @returns A SettleResponse indicating if the payment is settled and any settlement reason
   */
  export async function settle(
    client: ArkadeClient,
    payload: ArkadePaymentPayload,
    paymentRequirements: PaymentRequirements
  ): Promise<SettleResponse> {
    if (
      paymentRequirements.scheme === "exact" &&
      paymentRequirements.namespace === "arkade"
    ) {
      return settleExact(client, payload, paymentRequirements);
    }
  
    return {
      success: false,
      errorReason: "invalid_scheme",
      transaction: "",
      namespace: paymentRequirements.namespace,
    };
  }
  
  export type Supported = {
    h402Version: number;
    kind: {
      scheme: string;
      networkId: string;
    }[];
  };