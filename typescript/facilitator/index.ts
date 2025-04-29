import { config } from "dotenv";
import express from "express";
import { settle, verify } from "@bit-gpt/h402/facilitator";
import { FacilitatorResponse, Hex, VerifyResponse, SettleResponse } from "@bit-gpt/h402/types";

config();

const { PRIVATE_KEY, PORT } = process.env;

if (!PRIVATE_KEY || !PORT) {
  console.error("Missing required environment variables");
  process.exit(1);
}

const app = express();
const port = parseInt(PORT);

// Configure express to parse JSON bodies
app.use(express.json());

app.post("/verify", async (req: any, res: any) => {
  try {
    const payload = req.body.payload;
    const paymentDetails = req.body.paymentDetails;

    if (!payload || !paymentDetails) {
      res.status(400).json({ error: "payload and paymentDetails required" });
    }

    const verificationResult = await verify(payload, paymentDetails);
    if (!verificationResult.isValid && "errorMessage" in verificationResult) {
      res.status(400).json({ verificationResult });
    }

    res.json({ data: verificationResult, error: undefined } as FacilitatorResponse<VerifyResponse>);
  } catch {
    res.status(400).json({ error: "Invalid request" });
  }
});

app.post("/settle", async (req, res) => {
  try {
    const payload = req.body.payload;
    const paymentDetails = req.body.paymentDetails;

    if (!payload || !paymentDetails) {
      res.status(400).json({ error: "payload and paymentDetails required" });
    }

    if (!process.env.PRIVATE_KEY) {
      res.status(400).json({ error: "PRIVATE_KEY is not set" });
    }

    const settleResult = await settle(payload, paymentDetails, PRIVATE_KEY as Hex);

    if ("errorMessage" in settleResult) {
      res.status(400).json({ error: settleResult.errorMessage, success: false } as SettleResponse);
    }

    // @ts-ignore
    res.json({ success: true, txHash: settleResult.txHash } as SettleResponse);
  } catch {
    res.status(400).json({ error: "Invalid request" });
  }
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});
