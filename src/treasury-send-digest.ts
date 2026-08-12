/**
 * Computes the SHA-256 hex digest used for passkey transaction authorization.
 * Format: `chain|to|value_wei|data` (data defaults to empty string).
 */
export async function treasurySendTxDigest(
  chain: string,
  to: string,
  valueWei: string,
  data?: string,
): Promise<string> {
  const input = `${chain}|${to}|${valueWei}|${data || ""}`;
  const encoded = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoded);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
