import { NextFunction, Request, Response } from "express";
import { Address, getAddress } from "viem";
import { utils as evmUtils } from "@bit-gpt/h402/schemes/exact/evm";
import { utils as solanaUtils } from "@bit-gpt/h402/schemes/exact/solana";
import { utils as arkadeUtils } from "@bit-gpt/h402/schemes/exact/arkade";
import {
  computeRoutePatterns,
  findMatchingPaymentRequirements,
  findMatchingRoute,
  paywallHtml,
  toJsonSafe,
} from "@bit-gpt/h402/shared";
import {
  FacilitatorConfig,
  EvmPaymentPayload,
  SolanaPaymentPayload,
  ArkadePaymentPayload,
  Resource,
  settleResponseHeader,
  RoutesConfig,
} from "@bit-gpt/h402/types";
import { useFacilitator } from "@bit-gpt/h402/verify";
import { VerifyResponse, SettleResponse } from "@bit-gpt/h402/types";

/**
 * Creates a payment middleware factory for Express
 *
 * @param routes - Configuration for protected routes and their payment requirements
 * @param facilitator - Optional configuration for the payment facilitator service
 * @returns An Express middleware handler
 *
 * @example
 * ```typescript
 * // Simple configuration - All endpoints protected by $0.01 USDT on BSC
 * app.use(paymentMiddleware(
 *   {
 *     '*': '$0.01' // All routes protected by $0.01 USDT on BSC
 *   }
 * ));
 *
 * // Advanced configuration - Multiple payment options per route
 * app.use(paymentMiddleware(
 *   {
 *     '/weather/*': '$0.001', // Simple price for weather endpoints
 *     '/premium/*': {
 *       paymentRequirements: [
 *         {
 *           scheme: "exact",
 *           namespace: "evm",
 *           tokenAddress: "0x55d398326f99059ff775485246999027b3197955", // USDT on BSC
 *           amountRequired: 0.01,
 *           amountRequiredFormat: "humanReadable",
 *           networkId: "56",
 *           payToAddress: "0x123...",
 *           description: "Premium API access with USDT on BSC"
 *         },
 *         {
 *           scheme: "exact",
 *           namespace: "solana",
 *           tokenAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", // USDC on Solana
 *           amountRequired: 0.01,
 *           amountRequiredFormat: "humanReadable",
 *           networkId: "mainnet",
 *           payToAddress: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
 *           description: "Premium API access with USDC on Solana"
 *         },
 *         {
 *           scheme: "exact",
 *           namespace: "arkade",
 *           tokenAddress: "BTC", // Bitcoin only (no other tokens)
 *           amountRequired: 0.00001, // 1000 sats
 *           amountRequiredFormat: "humanReadable",
 *           networkId: "bitcoin",
 *           payToAddress: "ark1...", // Arkade address
 *           description: "Premium API access with BTC via Arkade"
 *         }
 *       ]
 *     }
 *   }
 * ));
 * ```
 */
export function paymentMiddleware(
  routes: RoutesConfig,
  facilitator?: FacilitatorConfig,
  options?: { asyncSettlement?: boolean }
) {
  const { verify, settle } = useFacilitator(facilitator);
  const h402Version = 1;

  const asyncSettlement = options?.asyncSettlement || false;

  // Pre-compile route patterns to regex and extract verbs
  const routePatterns = computeRoutePatterns(routes);

  return async function paymentMiddleware(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    const matchingRoute = findMatchingRoute(routePatterns, req.path, req.method.toUpperCase());

    if (!matchingRoute) {
      return next();
    }

    // Get payment requirements from the route config
    const paymentRequirements = matchingRoute.config.paymentRequirements;
    if (!paymentRequirements || paymentRequirements.length === 0) {
      return next();
    }

    // Use the first payment requirement as the primary one
    const primaryRequirement = paymentRequirements[0];
    const resourceUrl: Resource = (primaryRequirement.resource || `${req.protocol}://${req.headers.host}${req.path}`) as Resource;

    // Update the resource URL in all payment requirements and validate addresses
    const updatedPaymentRequirements = paymentRequirements.map(requirement => {
      let validatedPayToAddress: string;

      if (requirement.namespace === "evm") {
        // Use viem's getAddress for EVM address validation and checksumming
        validatedPayToAddress = getAddress(requirement.payToAddress);
      } else if (requirement.namespace === "solana") {
        // Basic Solana address validation
        if (typeof requirement.payToAddress !== "string" || requirement.payToAddress.length < 32 || requirement.payToAddress.length > 44) {
          throw new Error("Invalid Solana address format");
        }
        // Additional validation could be added here using @solana/web3.js
        validatedPayToAddress = requirement.payToAddress;
      } else if (requirement.namespace === "arkade") {
        // Validate Arkade address using SDK's validation
        if (!arkadeUtils.isValidArkadeAddress(requirement.payToAddress)) {
          throw new Error("Invalid Arkade address format");
        }
        validatedPayToAddress = requirement.payToAddress;
      } else {
        // TypeScript knows this is exhaustive, so this should never happen
        const exhaustiveCheck: never = requirement;
        throw new Error(`Unsupported namespace: ${(exhaustiveCheck as any).namespace}`);
      }

      return {
        ...requirement,
        resource: resourceUrl,
        payToAddress: validatedPayToAddress,
      };
    });

    // Determine namespace from payment header if available, otherwise use primary requirement
    let detectedNamespace = primaryRequirement.namespace;
    const payment = req.header("X-PAYMENT");

    // If payment is provided, try to detect namespace from the payment structure
    if (payment) {
      try {
        // Try to decode as base64 and check the structure
        const decoded = JSON.parse(atob(payment));
        if (decoded.namespace) {
          detectedNamespace = decoded.namespace;
        }
      } catch {
        // If decoding fails, fall back to primary requirement namespace
      }
    }

    const namespace = detectedNamespace;

    const userAgent = req.header("User-Agent") || "";
    const acceptHeader = req.header("Accept") || "";
    const isWebBrowser = acceptHeader.includes("text/html") && userAgent.includes("Mozilla");

    if (!payment) {
      if (isWebBrowser) {
        // Calculate display amount from the payment requirements
        let displayAmount: number;
        if (primaryRequirement.amountRequiredFormat === "humanReadable") {
          displayAmount = Number(primaryRequirement.amountRequired);
        } else {
          // Convert from atomic units to human readable
          const decimals = primaryRequirement.tokenDecimals || 6; // Default to USDC decimals
          displayAmount = Number(primaryRequirement.amountRequired) / 10 ** decimals;
        }

        // Inject the payment requirements data
        const injectScript = `<script>window.h402 = { paymentRequirements: ${JSON.stringify(updatedPaymentRequirements)} }</script>`;

        // Insert the script right before the closing </head> tag
        const html = paywallHtml.replace("</head>", `${injectScript}</head>`);
        res.status(402).send(html);
        return;
      }
      res.status(402).json({
        h402Version,
        error: "X-PAYMENT header is required",
        accepts: updatedPaymentRequirements,
      });
      return;
    }

    // Verify payment
    let decodedPayment: EvmPaymentPayload | SolanaPaymentPayload | ArkadePaymentPayload;
    try {
      if (namespace === "evm") {
        decodedPayment = evmUtils.decodePaymentPayload(payment);
      } else if (namespace === "solana") {
        decodedPayment = solanaUtils.decodePaymentPayload(payment);
      } else if (namespace === "arkade") {
        decodedPayment = arkadeUtils.decodePaymentPayload(payment);
      } else {
        throw new Error(`Unsupported namespace: ${namespace}`);
      }
      decodedPayment.h402Version = h402Version;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Invalid or malformed payment header";
      console.error(
        `[h402-express] Payment decoding failed for namespace ${namespace}:`,
        errorMessage,
      );

      res.status(402).json({
        h402Version,
        error: errorMessage,
        accepts: updatedPaymentRequirements,
      });
      return;
    }

    const selectedPaymentRequirements = findMatchingPaymentRequirements(
      updatedPaymentRequirements,
      decodedPayment,
    );

    console.log("paymentMiddleware selectedPaymentRequirements", selectedPaymentRequirements);

    if (!selectedPaymentRequirements) {
      console.error(`[h402-express] No matching payment requirements found for:`, {
        scheme: decodedPayment.scheme,
        namespace: decodedPayment.namespace,
        networkId: decodedPayment.networkId,
        availableRequirements: updatedPaymentRequirements.map(req => ({
          scheme: req.scheme,
          namespace: req.namespace,
          networkId: req.networkId,
        })),
      });

      res.status(402).json({
        h402Version,
        error: "Unable to find matching payment requirements",
        accepts: toJsonSafe(updatedPaymentRequirements),
      });
      return;
    }

    const verification: VerifyResponse = await verify(payment, selectedPaymentRequirements);

    console.log("paymentMiddleware verification", verification);

    if (!verification.isValid) {
      res.status(402).json({
        h402Version,
        error: new Error(verification.invalidReason),
        accepts: updatedPaymentRequirements,
        payer: verification.payer,
      });
      return;
    }

    // NEW: If streaming mode, don't intercept res.end()
    if (asyncSettlement) {
      // Store settlement as a promise on res object
      const settlementPromise = (async () => {
        // Proceed to next middleware first
        await next();

        // Only settle if response is successful
        if (res.statusCode >= 400) {
          return;
        }

        // Skip settlement for already-executed transactions
        if (verification.type === "transaction") {
          console.log("Payment already executed, skipping settlement");
          return;
        }

        // Perform settlement
        try {
          console.log("paymentMiddleware attempting settlement");
          const settlement: SettleResponse = await settle(payment, selectedPaymentRequirements);
          console.log("paymentMiddleware settlement", settlement);

          if (settlement.success) {
            const responseHeader = settleResponseHeader(settlement);
            res.setHeader("X-PAYMENT-RESPONSE", responseHeader);
          } else {
            throw new Error(settlement.error || "Settlement failed");
          }
        } catch (error) {
          console.log("paymentMiddleware settlement error:", error);
          throw error;
        }
      })();

      // Store promise so proxy can await it
      (res as any).__h402Settlement = settlementPromise;
      return;
    }

    /* eslint-disable @typescript-eslint/no-explicit-any */
    type EndArgs =
      | [cb?: () => void]
      | [chunk: any, cb?: () => void]
      | [chunk: any, encoding: BufferEncoding, cb?: () => void];
    /* eslint-enable @typescript-eslint/no-explicit-any */

    const originalEnd = res.end.bind(res);
    let endArgs: EndArgs | null = null;

    res.end = function (...args: EndArgs) {
      endArgs = args;
      return res; // maintain correct return type
    };

    // Proceed to the next middleware or route handler
    await next();

    // If the response from the protected route is >= 400, do not settle payment
    if (res.statusCode >= 400) {
      res.end = originalEnd;
      if (endArgs) {
        originalEnd(...(endArgs as Parameters<typeof res.end>));
      }
      return;
    }

    // For signAndSendTransaction payments (type: "transaction"), the payment is already executed
    // Skip settlement and proceed with the response
    if (verification.type === "transaction") {
      console.log("paymentMiddleware: Payment already executed (signAndSendTransaction), skipping settlement");
      res.end = originalEnd;
      if (endArgs) {
        originalEnd(...(endArgs as Parameters<typeof res.end>));
      }
      return;
    }

    // For authorization and signedTransaction payments (type: "payload"), settlement is required
    try {
      console.log(
        "paymentMiddleware attempting settlement with:",
        JSON.stringify({ payment, selectedPaymentRequirements }, null, 2),
      );
      const settlement: SettleResponse = await settle(payment, selectedPaymentRequirements);
      console.log("paymentMiddleware settlement", settlement);

      if (settlement.success) {
        const responseHeader = settleResponseHeader(settlement);
        res.setHeader("X-PAYMENT-RESPONSE", responseHeader);
      } else {
        console.log("paymentMiddleware settlement failed, settlement:", settlement);
        throw new Error(settlement.error || "Settlement failed with undefined data");
      }
    } catch (error) {
      console.log("paymentMiddleware settlement error:", error);
      // If settlement fails and the response hasn't been sent yet, return an error
      if (!res.headersSent) {
        res.status(402).json({
          h402Version,
          error: error instanceof Error ? error : new Error("Failed to settle payment"),
          accepts: updatedPaymentRequirements,
        });
        return;
      }
    } finally {
      res.end = originalEnd;
      if (endArgs) {
        originalEnd(...(endArgs as Parameters<typeof res.end>));
      }
    }
  };
}

export type { Money, Network, MiddlewareConfig, Resource, RouteConfig} from "@bit-gpt/h402/types";
export { createRouteConfigFromPrice } from "@bit-gpt/h402/shared";
export { isEVMNetwork, isSolanaNetwork, isArkadeNetwork } from "@bit-gpt/h402/types";

