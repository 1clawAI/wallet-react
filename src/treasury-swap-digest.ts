/** Must match vault `domain/treasury_swap_digest.rs`. */
export async function treasurySwapTxDigest(
  chain: string,
  sellToken: string,
  buyToken: string,
  sellAmount: string,
): Promise<string> {
  const canonical = `${chain.trim().toLowerCase()}|${sellToken.trim().toLowerCase()}|${buyToken.trim().toLowerCase()}|${sellAmount.trim()}`;
  const data = new TextEncoder().encode(canonical);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
