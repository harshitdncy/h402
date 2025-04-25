import { PaymentDetails } from "./payment";

type FacilitatorRequest = {
  paymentHeader: string;
  paymentDetails: PaymentDetails;
};

// TODO: Check this + decode and encode utils
type SettleResponse = {
  success: boolean;
  error?: string | undefined;
  txHash?: string | undefined;
  chainId?: string | undefined;
};

type VerifyResponse = {
  isValid: boolean;
  errorMessage?: string | undefined;
};

export { FacilitatorRequest, SettleResponse, VerifyResponse };
