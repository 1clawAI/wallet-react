/** Must match vault `domain/treasury_send_digest.rs`. */
export async function treasurySendTxDigest(
  chain: string,
  to: string,
  valueWei: string,
  data?: string,
): Promise<string> {
  const normalizedData = normalizeSendData(data);
  const canonical = `${chain.trim().toLowerCase()}|${to.trim().toLowerCase()}|${valueWei.trim()}|${normalizedData}`;
  const bytes = new TextEncoder().encode(canonical);
  const buf = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function normalizeSendData(data?: string): string {
  if (!data) return "";
  const t = data.trim().toLowerCase();
  if (!t || t === "0x") return "";
  return t;
}
