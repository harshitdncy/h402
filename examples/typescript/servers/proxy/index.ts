import express, { Request, Response } from "express";
import { createProxyMiddleware } from "http-proxy-middleware";
import { readFile } from "fs/promises";
import {
  paymentMiddleware,
  createRouteConfigFromPrice,
  Network,
  Resource,
} from "@bit-gpt/h402-express";
import type * as http from "http";
import type { Socket } from "net";

interface ProxyConfig {
  targetURL: string;
  amount: string;
  payToEvm: string;
  payToSolana: string;
  description?: string;
  facilitatorURL?: string;
  mimeType?: string;
  maxTimeoutSeconds?: number;
  testnet?: boolean;
  headers?: Record<string, string>;
  network?: Network;
}

async function loadConfig(configPath: string): Promise<ProxyConfig> {
  try {
    const data = await readFile(configPath, "utf-8");
    const config: ProxyConfig = JSON.parse(data);

    config.facilitatorURL = config.facilitatorURL || "https://facilitator.bitgpt.xyz";
    config.testnet = config.testnet !== undefined ? config.testnet : true;
    config.maxTimeoutSeconds = config.maxTimeoutSeconds || 60;
    config.network = config.network || "base";

    if (
      !config.targetURL ||
      !config.amount ||
      (!config.payToEvm && !config.payToSolana)
    ) {
      throw new Error("Config is missing required fields: targetURL, amount, or payToEvm or payToSolana");
    }

    return config;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Error loading config file: ${error.message}`);
    }
    throw error;
  }
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);

  if (argv.length === 0) {
    console.error("Please provide a config file path as an argument");
    console.error("Usage: npm run dev <config-file-path>");
    process.exit(1);
  }

  let config: ProxyConfig;
  try {
    config = await loadConfig(argv[0]);
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Unknown error loading config");
    process.exit(1);
  }

  console.log("Running with config:", config);

  const app = express();

  app.use(
    paymentMiddleware(
      {
        "/*": createRouteConfigFromPrice(
          config.amount,
          config.network!,
          config.payToEvm as `0x${string}`,
          config.payToSolana,
        ),
      },
      {
        url: config.facilitatorURL! as Resource,
      },
    ),
  );

  const proxy = createProxyMiddleware({
    target: config.targetURL,
    changeOrigin: true,
    selfHandleResponse: true, 
    on: {
      proxyReq: (proxyReq: http.ClientRequest, req: Request) => {
        proxyReq.removeHeader("X-Payment");
        proxyReq.removeHeader("X-Payment-Response");
        
        proxyReq.removeHeader("x-api-key");
        proxyReq.removeHeader("X-API-Key");
        proxyReq.removeHeader("authorization");
        proxyReq.removeHeader("Authorization");
        // Force set configured headers
        if (config.headers) {
          Object.entries(config.headers).forEach(([key, value]) => {
            proxyReq.setHeader(key, value);
          });
        }
  
        console.log(`Proxying ${req.method} ${req.originalUrl} -> ${config.targetURL}${req.originalUrl}`);
        console.log(`x-api-key value:`, proxyReq.getHeader('x-api-key'));
      },
      proxyRes: (proxyRes: http.IncomingMessage, req: Request, res: Response | http.ServerResponse) => {
        console.log(`Response status: ${proxyRes.statusCode}`);
        
        if ("status" in res && typeof res.status === "function") {
          res.status(proxyRes.statusCode || 200);
        } else {
          res.statusCode = proxyRes.statusCode || 200;
        }
        
        Object.keys(proxyRes.headers).forEach(key => {
          const value = proxyRes.headers[key];
          if (value !== undefined) {
            res.setHeader(key, value);
          }
        });
        
        proxyRes.pipe(res);
      },
      error: (err: Error, _req: Request, res: Response | http.ServerResponse | Socket) => {
        console.error("Proxy error:", err.message);
        if ("status" in res && typeof res.status === "function") {
          res.status(502).json({
            error: "Bad Gateway",
            message: "Failed to proxy request to target server",
          });
        } else if ("writeHead" in res && typeof res.writeHead === "function") {
          res.writeHead(502, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({
              error: "Bad Gateway",
              message: "Failed to proxy request to target server",
            }),
          );
        }
      },
    },
  });

  app.use(proxy);

  const port = 4021;
  app.listen(port, () => {
    console.log(`Proxy server listening at http://localhost:${port}`);
    console.log(`Forwarding requests to: ${config.targetURL}`);
  });
}

main().catch(error => {
  console.error("Fatal error:", error);
  process.exit(1);
});
