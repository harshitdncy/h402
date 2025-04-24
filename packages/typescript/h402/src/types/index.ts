/** Payment details */

export type PaymentDetails = {
  // Scheme of the payment protocol to use
  scheme: string;
  // Namespace for the receiving blockchain network
  namespace: string;
  // Chain of the blockchain to send payment on
  chainId: string;
  // Amount required to access the resource as token x decimals
  amountRequired: bigint;
  // Token contract
  tokenAddress: string;
  // Token decimals
  tokenDecimals: number;
  // Identifier of what the user pays for
  resource: string;
  // Description of the resource
  description: string;
  // Mime type of the rescource response
  mimeType: string;
  // Output schema of the resource response
  outputSchema: object | null;
  // Address to pay for accessing the resource
  toAddress: string;
  // Time in seconds it may be before the payment can be settaled
  estimatedProcessingTime: number;
  // Extra informations about the payment for the scheme
  extra: Record<string, any> | null;
};

/** Payment Required Response */

export type PaymentRequired = {
  // Version of the 402 payment protocol
  "402Version": number;
  // List of payment details that the resource server accepts (A resource server may accept multiple tokens/chains)
  accepts: PaymentDetails[];
  // Message for error(s) that occured while processing payment
  error: string | null;
};

/** Payment Payload */

export type PaymentPayload<T> = {
  // Version of the 402 payment protocol
  version: number;
  // Scheme of the payment protocol to use
  scheme: string;
  // Namespace for the receiving blockchain network
  namespace: string;
  // Chain of the blockchain to send payment on
  chainId: string;
  // Payload of the payment protocol
  payload: T;
  // Identifier of what the user pays for
  resource: string;
};

/** Facilitator types */

type FacilitatorRequest = {
  paymentHeader: string;
  paymentDetails: PaymentDetails;
};

// TODO: Check this + decode and encode utils
export type SettleResponse = {
  success: boolean;
  error?: string | undefined;
  txHash?: string | undefined;
  chainId?: string | undefined;
};

export type VerifyResponse = {
  isValid: boolean;
  errorMessage?: string | undefined;
};

/** Utilites */

export type Money = string | number;

export type Hex = `0x${string}`;
