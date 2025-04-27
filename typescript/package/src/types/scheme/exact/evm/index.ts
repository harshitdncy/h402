import {
  PaymentPayload as ImportedPaymentPayloadType,
  Hex,
} from "../../../index.js";

type NativeTransferParameters = {
  from: Hex;
  to: Hex;
  value: bigint;
  nonce: number;
};

type TokenTransferParameters = {
  from: Hex;
  to: Hex;
  value: bigint;
  data: Hex;
  nonce: number;
};

type AuthorizationParameters = {
  from: Hex;
  to: Hex;
  value: bigint;
  validAfter: bigint;
  validBefore: bigint;
  nonce: Hex;
  version: string;
};

type SignAndSendTransactionParameters = {
  from: Hex;
  to: Hex;
  value: bigint;
  data: Hex;
  nonce: Hex;
};

type NativeTransferPayload = {
  type: "nativeTransfer";
  signature: Hex;
  transaction: NativeTransferParameters;
};

type TokenTransferPayload = {
  type: "tokenTransfer";
  signature: Hex;
  transaction: TokenTransferParameters;
};

type AuthorizationPayload = {
  type: "authorization";
  signature: Hex;
  authorization: AuthorizationParameters;
};

type SignAndSendTransactionPayload = {
  type: "signAndSendTransaction";
  signedMessage: Hex;
  transactionHash: Hex;
};

type Payload =
  | AuthorizationPayload
  | NativeTransferPayload
  | TokenTransferPayload
  | SignAndSendTransactionPayload;

type NativeTransferPaymentPayload =
  ImportedPaymentPayloadType<NativeTransferPayload>;

type TokenTransferPaymentPayload =
  ImportedPaymentPayloadType<TokenTransferPayload>;

type AuthorizationPaymentPayload =
  ImportedPaymentPayloadType<AuthorizationPayload>;

type SignAndSendTransactionPaymentPayload =
  ImportedPaymentPayloadType<SignAndSendTransactionPayload>;

export {
  Payload,
  AuthorizationPayload,
  NativeTransferPayload,
  TokenTransferPayload,
  SignAndSendTransactionPayload,
  NativeTransferPaymentPayload,
  TokenTransferPaymentPayload,
  AuthorizationPaymentPayload,
  SignAndSendTransactionPaymentPayload,
  NativeTransferParameters,
  TokenTransferParameters,
  AuthorizationParameters,
  SignAndSendTransactionParameters,
};
