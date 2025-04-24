// TODO: Add JSDoc
function safeBase64Encode(data: string): string {
  if (!data) {
    throw new Error("Data is required for base64 encoding");
  }

  try {
    if (typeof window !== "undefined") {
      return window.btoa(data);
    }
    return Buffer.from(data).toString("base64");
  } catch (error) {
    throw new Error(
      `Failed to encode data to base64: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

// TODO: Add JSDoc
function safeBase64Decode(data: string): string {
  if (!data) {
    throw new Error("Data is required for base64 decoding");
  }

  try {
    if (typeof window !== "undefined") {
      return window.atob(data);
    }
    return Buffer.from(data, "base64").toString("utf-8");
  } catch (error) {
    throw new Error(
      `Failed to decode base64 data: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

export { safeBase64Encode, safeBase64Decode };
