import BscNetwork from "../assets/networks/bsc.svg";
import SolanaNetwork from "../assets/networks/solana.svg";
import BaseNetwork from "../assets/networks/base.svg";
import SolCoin from "../assets/coins/sol.svg";
import BnbCoin from "../assets/coins/bnb.svg";
import UsdcCoin from "../assets/coins/usdc.svg";
import UsdtCoin from "../assets/coins/usdt.svg";
import EthCoin from "../assets/coins/eth.svg";
import MetamaskIcon from "../assets/wallets/metamask.svg";
import PhantomIcon from "../assets/wallets/phantom.svg";
import WalletConnectIcon from "../assets/wallets/walletConnect.svg";
import { EnrichedPaymentRequirements } from "@bit-gpt/h402/types";
import { WalletType } from "@/evm/context/EvmWalletContext";
import { getChainId } from "@/evm/components/EvmPaymentHandler";

/**
 * Get the appropriate coin icon based on token symbol
 */
function getCoinIcon(tokenSymbol: string) {
  switch (tokenSymbol) {
    case "BNB":
      return BnbCoin;
    case "SOL":
      return SolCoin;
    case "USDC":
      return UsdcCoin;
    case "USDT":
      return UsdtCoin;
    case "ETH":
      return EthCoin;
    default:
      return "";
  }
}

export function getWalletIcon(walletId: WalletType) {
  switch (walletId) {
    case "metamask":
      return MetamaskIcon;
    case "phantom":
      return PhantomIcon;
    case "walletconnect":
      return WalletConnectIcon;
    default:
      return "";
  }
}

/**
 * Create a coin object from a payment requirement
 */
function createCoinFromRequirement(requirement: EnrichedPaymentRequirements) {
  const tokenSymbol = requirement.tokenSymbol || "Missing token metadata";
  
  return {
    id: requirement.tokenAddress || "",
    name: tokenSymbol,
    icon: getCoinIcon(tokenSymbol),
    paymentMethod: requirement,
  };
}

/**
 * Converts payment details to array if needed
 */
export function normalizePaymentMethods(paymentRequirements: EnrichedPaymentRequirements | EnrichedPaymentRequirements[] | undefined) {
  if (!paymentRequirements) return [];

  return Array.isArray(paymentRequirements)
    ? paymentRequirements
    : [paymentRequirements];
}

/**
 * Get compatible payment methods for the selected network
 */
export function getCompatiblePaymentRequirements(
  paymentRequirements: EnrichedPaymentRequirements[],
  networkId: string
) {
  if (!paymentRequirements.length) {
    return [];
  }

  const compatibleMethods = paymentRequirements.filter((requirement) => {
    const bscChainId = getChainId("bsc");
    const baseChainId = getChainId("base");
    
    if (networkId === "solana") {
      return requirement.namespace === "solana";
    } else if (networkId === "bsc") {
      return requirement.networkId === bscChainId; 
    } else if (networkId === "base") {
      return requirement.networkId === baseChainId; 
    }
    return false;
  });
  return compatibleMethods;
}

/**
 * Generate network and coin options from payment requirements
 */
export function generateAvailableNetworks(paymentRequirements: EnrichedPaymentRequirements[]) {
  const networkGroups: Record<string, EnrichedPaymentRequirements[]> = {};

  paymentRequirements.forEach((requirement: EnrichedPaymentRequirements) => {
    const networkId = requirement.namespace || "";
    if (!networkGroups[networkId]) {
      networkGroups[networkId] = [];
    }
    networkGroups[networkId].push(requirement);
  });

  const networks = [];
  let containsBSC = false;
  let containsBASE = false;

  const bscChainId = getChainId("bsc");
  const baseChainId = getChainId("base");

  if (networkGroups["evm"] && networkGroups["evm"].length > 0) {
    networkGroups["evm"].forEach((requirement: EnrichedPaymentRequirements) => {
      if (
        containsBSC === false &&
        (requirement.networkId === bscChainId)
      ) {
        containsBSC = true;
      }

      if (
        containsBASE === false &&
        (requirement.networkId === baseChainId)
      ) {
        containsBASE = true;
      }
    });

    if (containsBSC) {
      const bscCoins = networkGroups["evm"]
        .filter((requirement: EnrichedPaymentRequirements) => 
          requirement.networkId === bscChainId
        )
        .map(createCoinFromRequirement);

      networks.push({
        id: "bsc",
        name: "Binance Smart Chain",
        icon: BscNetwork,
        coins: bscCoins,
      });
    }

    if (containsBASE) {
      const baseCoins = networkGroups["evm"]
        .filter((requirement: EnrichedPaymentRequirements) => 
          requirement.networkId === baseChainId
        )
        .map(createCoinFromRequirement);

      networks.push({
        id: "base",
        name: "Base",
        icon: BaseNetwork,
        coins: baseCoins,
      });
    }
  }

  if (networkGroups["solana"] && networkGroups["solana"].length > 0) {
    const solanaCoins = networkGroups["solana"].map((requirement: EnrichedPaymentRequirements) => {
      const isNative = requirement.tokenAddress === "11111111111111111111111111111111";
      const tokenSymbol = requirement.tokenSymbol || (isNative ? "SOL" : "Missing token metadata");
      
      const modifiedRequirement = {
        ...requirement,
        tokenSymbol: tokenSymbol
      };
      
      return createCoinFromRequirement(modifiedRequirement);
    });

    networks.push({
      id: "solana",
      name: "Solana",
      icon: SolanaNetwork,
      coins: solanaCoins,
    });
  }

  return networks;
}
