import {
  address,
  appendTransactionMessageInstruction,
  type CompilableTransactionMessage,
  compileTransaction,
  createSolanaRpc,
  createTransactionMessage,
  getBase64EncodedWireTransaction,
  pipe,
  setTransactionMessageFeePayer,
  setTransactionMessageLifetimeUsingBlockhash,
  signature as solanaSignature,
  type TransactionMessageWithBlockhashLifetime,
} from "@solana/kit";

import {
  getCreateAssociatedTokenIdempotentInstruction,
  getTransferCheckedInstruction,
  TOKEN_PROGRAM_ADDRESS,
} from "@solana-program/token";
import {
  getCreateAssociatedTokenIdempotentInstruction as getCreateAssociatedTokenIdempotentInstructionToken2022,
  getTransferCheckedInstruction as getTransferCheckedInstructionToken2022,
  TOKEN_2022_PROGRAM_ADDRESS,
} from "@solana-program/token-2022";
import {
  getTransferSolInstruction,
  SYSTEM_PROGRAM_ADDRESS,
} from "@solana-program/system";
import {
  ExactSolanaPayload,
  Namespace,
  PaymentRequirements,
  SolanaClient,
  SolanaPaymentPayload,
} from "../../../types/index.js";
import {
  createAddressSigner,
  getAssociatedTokenAddress,
} from "../../../shared/solana/index.js";
import bs58 from "bs58";
import { getFacilitator } from "../../../shared/next.js";

async function getTokenProgramForMint(
  mintAddress: string
): Promise<typeof TOKEN_PROGRAM_ADDRESS | typeof TOKEN_2022_PROGRAM_ADDRESS> {
  const rpc = createSolanaRpc(`${getFacilitator()}/solana-rpc`);
  
  try {
    const { value: mintInfo } = await rpc
      .getAccountInfo(address(mintAddress), {
        encoding: "jsonParsed",
      })
      .send();

    if (!mintInfo || !mintInfo.data) {
      throw new Error(`Token mint not found: ${mintAddress}`);
    }

    if (mintInfo.owner === TOKEN_2022_PROGRAM_ADDRESS) {
      console.log(`[Token Detection] ${mintAddress} is Token-2022`);
      return TOKEN_2022_PROGRAM_ADDRESS;
    } else if (mintInfo.owner === TOKEN_PROGRAM_ADDRESS) {
      console.log(`[Token Detection] ${mintAddress} is standard SPL Token`);
      return TOKEN_PROGRAM_ADDRESS;
    } else {
      throw new Error(
        `Token mint ${mintAddress} is not owned by a token program`
      );
    }
  } catch (error) {
    console.error(`[Token Detection] Error detecting token program:`, error);
    return TOKEN_PROGRAM_ADDRESS;
  }
}

async function buildPaymentTransaction(
  requirements: PaymentRequirements,
  payerPublicKey: string
): Promise<
  CompilableTransactionMessage & TransactionMessageWithBlockhashLifetime
> {
  const rpc = createSolanaRpc(`${getFacilitator()}/solana-rpc`);
  const latestBlockhash = (await rpc.getLatestBlockhash().send()).value;
  const payerSigner = createAddressSigner(address(payerPublicKey));
  const payTo = address(requirements.payToAddress);
  const amount = BigInt(requirements.amountRequired.toString());

  const isNative =
    !requirements.tokenAddress ||
    requirements.tokenAddress === SYSTEM_PROGRAM_ADDRESS.toString();

  const tx = pipe(
    createTransactionMessage({ version: 0 }),
    (t) => setTransactionMessageFeePayer(payerSigner.address, t),
    (t) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, t)
  );

  if (isNative) {
    const instruction = getTransferSolInstruction({
      source: payerSigner,
      destination: payTo,
      amount,
    });
    return appendTransactionMessageInstruction(instruction, tx);
  } else {
    // TypeScript narrowing: we know tokenAddress exists here because isNative is false
    const tokenAddress = requirements.tokenAddress!;
    const mint = address(tokenAddress);
    
    const tokenProgram = await getTokenProgramForMint(tokenAddress);
    const isToken2022 = tokenProgram === TOKEN_2022_PROGRAM_ADDRESS;
    
    const { value: mintInfo } = await rpc
      .getAccountInfo(mint, {
        encoding: "jsonParsed",
      })
      .send();

    if (!mintInfo || !mintInfo.data) {
      throw new Error(`Token mint not found: ${tokenAddress}`);
    }

    const parsedData = mintInfo.data as any;
    const decimals = parsedData?.parsed?.info?.decimals;
    
    if (typeof decimals !== "number") {
      throw new Error(`Could not get decimals for token: ${tokenAddress}`);
    }
    
    console.log(`[Token Info] Mint: ${tokenAddress}, Decimals: ${decimals}, Program: ${isToken2022 ? 'Token-2022' : 'Token'}`);
    
    const senderATA = await getAssociatedTokenAddress(
      mint,
      payerSigner.address,
      tokenProgram
    );
    const receiverATA = await getAssociatedTokenAddress(
      mint, 
      payTo,
      tokenProgram
    );

    const createATAIx = isToken2022
      ? getCreateAssociatedTokenIdempotentInstructionToken2022({
          payer: payerSigner,
          mint,
          owner: payTo,
          ata: receiverATA,
        })
      : getCreateAssociatedTokenIdempotentInstruction({
          payer: payerSigner,
          mint,
          owner: payTo,
          ata: receiverATA,
        });

    const transferIx = isToken2022
      ? getTransferCheckedInstructionToken2022({
          source: senderATA,
          destination: receiverATA,
          authority: payerSigner,
          mint,
          amount,
          decimals,
        })
      : getTransferCheckedInstruction({
          source: senderATA,
          destination: receiverATA,
          authority: payerSigner,
          mint,
          amount,
          decimals,
        });

    const withCreateATA = appendTransactionMessageInstruction(createATAIx, tx);
    return appendTransactionMessageInstruction(transferIx, withCreateATA);
  }
}

async function sendAndCreatePayload(
  h402Version: number,
  message: CompilableTransactionMessage &
    TransactionMessageWithBlockhashLifetime,
  client: SolanaClient,
  requirements: PaymentRequirements
): Promise<SolanaPaymentPayload> {
  const transaction = compileTransaction(message);

  // Use facilitator proxy RPC so that requests are made from a server
  const rpc = createSolanaRpc(`${getFacilitator()}/solana-rpc`);

  let txSignature: string;
  let base64WireTx = "";
  let payload: ExactSolanaPayload;
  const waitForConfirmation = async (sig: string) => {
    return rpc
      .getSignatureStatuses([solanaSignature(sig)], {
        searchTransactionHistory: true,
      })
      .send();
  };

  if (typeof client.signTransaction === "function") {
    console.log("SIGN TRANSACTION");
    const [signedTx] = await client.signTransaction([transaction]);
    base64WireTx = getBase64EncodedWireTransaction(signedTx);
    // const response = await rpc.sendTransaction(base64WireTx, {encoding: 'base64'}).send();
    txSignature = solanaSignature(
      bs58.encode(signedTx.signatures[message.feePayer.address] as Uint8Array)
    );
    payload = {
      type: "signTransaction",
      signature: txSignature,
      transaction: base64WireTx,
    };
  } else if (typeof client.signAndSendTransaction === "function") {
    // Fallback
    console.log("SIGN AND SEND TRANSACTION");
    const [sigBytes] = await client.signAndSendTransaction([transaction]);
    const uint8Array = new Uint8Array(sigBytes);
    txSignature = solanaSignature(bs58.encode(uint8Array));
    payload = {
      type: "signAndSendTransaction",
      signature: txSignature,
    };
    console.log("[DEBUG SIGN AND SEND] Encoded signature using bs58");
    await waitForConfirmation(txSignature);
  } else {
    throw new Error(
      "Signer must implement signTransaction or signAndSendTransaction"
    );
  }

  const basePayload = {
    h402Version: h402Version,
    scheme: "exact" as any,
    namespace: "solana" as Namespace,
    networkId: "mainnet",
    resource: requirements.resource ?? `402 signature ${Date.now()}`,
  };

  return { ...basePayload, payload };
}

async function createPayment(
  client: SolanaClient,
  h402Version: number,
  requirements: PaymentRequirements
): Promise<string> {
  if (!client.publicKey) throw new Error("Missing publicKey in client");
  if (!requirements.payToAddress) throw new Error("Missing payToAddress");
  if (requirements.amountRequired === undefined)
    throw new Error("Missing amountRequired");

  const txMessage = await buildPaymentTransaction(
    requirements,
    client.publicKey
  );

  const payload = await sendAndCreatePayload(
    h402Version,
    txMessage,
    client,
    requirements
  );

  // Use browser-compatible approach for base64 encoding
  const jsonString = JSON.stringify(payload);
  console.log("[DEBUG] Encoding payload to base64");
  return btoa(jsonString);
}

export { createPayment };
