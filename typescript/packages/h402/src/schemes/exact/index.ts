import * as evmHandlers from "./evm/index.js";
import * as solanaHandlers from "./solana/index.js";
import * as arkadeHandlers from "./arkade/index.js";

export const handlers = {
  evm: evmHandlers,
  solana: solanaHandlers,
  arkade: arkadeHandlers,
};

export const SCHEME = "exact";
