/**
 * Converts data to a JSON-safe format by handling special cases like BigInt
 * @param data - The data to convert to JSON-safe format
 * @returns The JSON-safe version of the data
 * @throws {Error} If the input is not a valid object or array
 */
function toJsonSafe<T extends object>(data: T): Record<string, unknown> {
  if (!data || typeof data !== "object") {
    throw new Error("Input must be a valid object or array");
  }

  try {
    return Object.entries(data).reduce((acc, [key, value]) => {
      if (value === undefined || value === null) {
        return acc;
      }

      if (typeof value === "bigint") {
        acc[key] = value.toString();
      } else if (Array.isArray(value)) {
        acc[key] = value.map((item) =>
          typeof item === "object" && item !== null ? toJsonSafe(item) : item
        );
      } else if (typeof value === "object") {
        acc[key] = toJsonSafe(value);
      } else {
        acc[key] = value;
      }

      return acc;
    }, {} as Record<string, unknown>);
  } catch (error) {
    throw new Error(
      `Failed to convert to JSON-safe format: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

export { toJsonSafe };