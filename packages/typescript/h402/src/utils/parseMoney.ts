import { Money } from "../types/index.js";

/**
 * Parses a money input (string or number) into a validated number.
 *
 * - If the input is a string, it strips out all non-numeric characters
 *   except digits, decimal points, and negative signs (e.g., "$1,234.56" → 1234.56).
 * - If the input is already a number, it is converted to a string and re-parsed.
 * - The resulting number must be between 0.0001 and 999999999 (inclusive).
 *
 * @param {Money} input - A string or number representing a monetary value.
 * @returns {number} The cleaned and validated numeric value.
 *
 * @throws {Error} If the input is not a string or number.
 * @throws {Error} If the cleaned input cannot be parsed into a valid number.
 * @throws {Error} If the number is outside the accepted range.
 */
function parseMoney(input: Money): number {
  let cleaned: string;

  if (typeof input === "string") {
    cleaned = input.replace(/[^0-9.-]+/g, "");
  } else if (typeof input === "number") {
    cleaned = input.toString();
  } else {
    throw new Error("Invalid input type: must be string or number");
  }

  const num = Number(cleaned);

  if (isNaN(num)) {
    throw new Error("Invalid number format");
  }

  if (num < 0.0001 || num > 999999999) {
    throw new Error("Money must be between 0.0001 and 999999999");
  }

  return num;
}

export { parseMoney };