export function convertAmountToSmallestUnit(
  amount: number | string | bigint,
  decimals: number,
  format: "humanReadable" | "smallestUnit" = "smallestUnit"
): bigint {
  if (decimals < 0 || !Number.isInteger(decimals)) {
    throw new Error("Decimals must be a non-negative integer");
  }

  if (typeof amount === "bigint") {
    return format === "smallestUnit" ? amount : amount * BigInt(10 ** decimals);
  }

  if (format === "smallestUnit") {
    const amountStr = String(amount);
    if (!/^-?\d+\.?\d*$/.test(amountStr)) {
      throw new Error("Invalid amount format");
    }
    const [whole] = amountStr.split(".");
    return BigInt(whole);
  }

  const amountStr = String(amount);

  if (!/^-?\d+\.?\d*$/.test(amountStr)) {
    throw new Error("Invalid amount format");
  }

  const [whole = "0", fraction = ""] = amountStr.split(".");

  const paddedFraction = fraction.slice(0, decimals).padEnd(decimals, "0");
  const smallestUnitStr = whole + paddedFraction;

  return BigInt(smallestUnitStr);
}

export function selectVirtualCoins(
  coins: any[],
  targetAmount: number
): {
  inputs: any[];
  changeAmount: bigint;
} {
  const sortedCoins = [...coins].sort((a, b) => {
    const expiryA = a.virtualStatus.batchExpiry || Number.MAX_SAFE_INTEGER;
    const expiryB = b.virtualStatus.batchExpiry || Number.MAX_SAFE_INTEGER;
    if (expiryA !== expiryB) {
      return expiryA - expiryB;
    }
    return b.value - a.value;
  });

  const selectedCoins: any[] = [];
  let selectedAmount = 0;

  for (const coin of sortedCoins) {
    selectedCoins.push(coin);
    selectedAmount += coin.value;
    if (selectedAmount >= targetAmount) {
      break;
    }
  }

  if (selectedAmount < targetAmount) {
    throw new Error("Insufficient funds");
  }

  const changeAmount =
    selectedAmount === targetAmount
      ? 0n
      : BigInt(selectedAmount - targetAmount);

  return { inputs: selectedCoins, changeAmount };
}
