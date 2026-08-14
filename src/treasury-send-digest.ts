/**
 * Computes the SHA-256 hex digest used for passkey transaction authorization.
 * Must match vault `domain/treasury_send_digest.rs`.
 *
 * Format: chain|to|value|data|token_mint|token_decimals|destination_tag|memo|xrpl_tx_json|fee_extra
 */

export interface NonEvmDigestFields {
  tokenMint?: string;
  tokenDecimals?: number;
  destinationTag?: number;
  memo?: string;
  xrplTxJson?: Record<string, unknown>;
  feeRateSatPerVbyte?: number;
  feeLimitSun?: number;
  ttl?: number;
}

export async function treasurySendTxDigest(
  chain: string,
  to: string,
  valueWei: string,
  data?: string,
  extra?: NonEvmDigestFields,
): Promise<string> {
  const tokenMint = (extra?.tokenMint ?? "").trim().toLowerCase();
  const tokenDecimals =
    extra?.tokenDecimals != null ? String(extra.tokenDecimals) : "";
  const destinationTag =
    extra?.destinationTag != null ? String(extra.destinationTag) : "";
  const memo = (extra?.memo ?? "").trim();
  const xrplJson = extra?.xrplTxJson
    ? canonicalJson(extra.xrplTxJson)
    : "";
  const feeExtra = [
    extra?.feeRateSatPerVbyte != null
      ? String(extra.feeRateSatPerVbyte)
      : "",
    extra?.feeLimitSun != null ? String(extra.feeLimitSun) : "",
    extra?.ttl != null ? String(extra.ttl) : "",
  ].join(",");

  const normalizedData = normalizeSendData(data);
  const canonical = [
    chain.trim().toLowerCase(),
    to.trim().toLowerCase(),
    valueWei.trim(),
    normalizedData,
    tokenMint,
    tokenDecimals,
    destinationTag,
    memo,
    xrplJson,
    feeExtra,
  ].join("|");

  const encoded = new TextEncoder().encode(canonical);
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoded);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

function canonicalJson(v: unknown): string {
  if (v === null || v === undefined) return "null";
  if (typeof v === "number" || typeof v === "boolean") return JSON.stringify(v);
  if (typeof v === "string") return JSON.stringify(v);
  if (Array.isArray(v)) return `[${v.map(canonicalJson).join(",")}]`;
  if (typeof v === "object") {
    const obj = v as Record<string, unknown>;
    const keys = Object.keys(obj).sort();
    const pairs = keys.map((k) => `"${k}":${canonicalJson(obj[k])}`);
    return `{${pairs.join(",")}}`;
  }
  return JSON.stringify(v);
}

function normalizeSendData(data?: string): string {
  if (!data) return "";
  const t = data.trim().toLowerCase();
  if (!t || t === "0x") return "";
  return t;
}
