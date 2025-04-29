import { config } from "dotenv";
import express from "express";
import { settle, verify } from "@bit-gpt/h402/facilitator";
import { FacilitatorResponse, Hex, VerifyResponse, SettleResponse } from "@bit-gpt/h402/types";
import swaggerUi from "swagger-ui-express";

config();

const { PRIVATE_KEY, PORT } = process.env;

if (!PRIVATE_KEY || !PORT) {
  console.error("Missing required environment variables");
  process.exit(1);
}

const app = express();
const port = parseInt(PORT);

// Swagger/OpenAPI specification
const swaggerDocument = {
  openapi: "3.0.0",
  info: {
    title: "H402 Facilitator API",
    version: "1.0.0",
    description: "API documentation for the facilitator service",
  },
  paths: {
    "/verify": {
      post: {
        summary: "Verify a payment payload",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["payload", "paymentDetails"],
                properties: {
                  payload: {
                    type: "string",
                    description: "The payment payload to verify",
                  },
                  paymentDetails: {
                    type: "object",
                    description: "Payment details for verification",
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Verification response",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: {
                      type: "object",
                      properties: {
                        isValid: {
                          type: "boolean",
                        },
                      },
                    },
                    error: {
                      type: "string",
                    },
                  },
                },
              },
            },
          },
          "400": {
            description: "Invalid request",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    error: {
                      type: "string",
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/settle": {
      post: {
        summary: "Settle a payment",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["payload", "paymentDetails"],
                properties: {
                  payload: {
                    type: "string",
                    description: "The payment payload to settle",
                  },
                  paymentDetails: {
                    type: "object",
                    description: "Payment details for settlement",
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Settle response",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: {
                      type: "boolean",
                    },
                    txHash: {
                      type: "string",
                    },
                  },
                },
              },
            },
          },
          "400": {
            description: "Invalid request",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    error: {
                      type: "string",
                    },
                    success: {
                      type: "boolean",
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
};

// Configure express to parse JSON bodies
app.use(express.json());

app.post("/verify", async (req: any, res: any) => {
  try {
    const payload = req.body.payload;
    const paymentDetails = req.body.paymentDetails;

    if (!payload || !paymentDetails) {
      return res.status(400).json({ error: "payload and paymentDetails required" });
    }

    const verificationResult = await verify(payload, paymentDetails);
    if (!verificationResult.isValid && "errorMessage" in verificationResult) {
      return res.status(400).json({ verificationResult });
    }

    return res.json({
      data: verificationResult,
      error: undefined,
    } as FacilitatorResponse<VerifyResponse>);
  } catch {
    return res.status(400).json({ error: "Invalid request" });
  }
});

app.post("/settle", async (req: any, res: any) => {
  try {
    const payload = req.body.payload;
    const paymentDetails = req.body.paymentDetails;

    if (!payload || !paymentDetails) {
      return res.status(400).json({ error: "payload and paymentDetails required" });
    }

    if (!process.env.PRIVATE_KEY) {
      return res.status(400).json({ error: "PRIVATE_KEY is not set" });
    }

    const settleResult = await settle(payload, paymentDetails, PRIVATE_KEY as Hex);

    if ("errorMessage" in settleResult) {
      return res
        .status(400)
        .json({ error: settleResult.errorMessage, success: false } as SettleResponse);
    }

    return res.json({ success: true, txHash: settleResult.txHash } as SettleResponse);
  } catch {
    return res.status(400).json({ error: "Invalid request" });
  }
});

// Serve Swagger UI at GET /
app.use("/", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});
