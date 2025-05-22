import {h402NextMiddleware} from "@bit-gpt/h402";
import {imageGenerationPaymentRequirements} from "./config/paymentRequirements";

export const middleware = h402NextMiddleware({
  routes: {
    "/api/generate-image": {
      paymentRequirements: imageGenerationPaymentRequirements
    }
  },
  paywallRoute: "/paywall",
  facilitatorUrl: process.env.FACILITATOR_URL || "https://facilitator.bitgpt.xyz",
});

export const config = {
  matcher: ["/api/generate-image"]
};
