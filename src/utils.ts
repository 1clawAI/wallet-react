/**
 * Shorten an address to `0x1234...abcd` format.
 * @param address Full hex address
 * @param chars Number of characters to show on each side (default 4)
 */
export function shortenAddress(address: string, chars = 4): string {
  if (!address) return "";
  if (address.length <= chars * 2 + 2) return address;
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}

/**
 * Format a raw wei/lamports string into a human-readable balance.
 * @param balanceRaw Raw balance string (in smallest unit)
 * @param decimals Number of decimals for the token (default 18)
 * @param maxDecimals Max decimal places to display (default 6)
 */
export function formatBalance(
  balanceRaw: string,
  decimals = 18,
  maxDecimals = 6,
): string {
  if (!balanceRaw || balanceRaw === "0") return "0";

  const padded = balanceRaw.padStart(decimals + 1, "0");
  const intPart = padded.slice(0, padded.length - decimals) || "0";
  const fracPart = padded.slice(padded.length - decimals).slice(0, maxDecimals);

  const trimmed = fracPart.replace(/0+$/, "");
  return trimmed ? `${intPart}.${trimmed}` : intPart;
}

/** Classify an API/network error into a user-friendly category. */
export function classifyError(
  err: unknown,
): { code: string; message: string; detail?: string } {
  if (err instanceof TypeError && err.message === "Failed to fetch") {
    return {
      code: "network_error",
      message: "Connection failed. Please check your internet and try again.",
    };
  }

  const msg =
    err instanceof Error ? err.message : typeof err === "string" ? err : "";
  const lower = msg.toLowerCase();

  if (lower.includes("session expired") || lower.includes("401") || lower.includes("unauthorized") || lower.includes("not authenticated")) {
    return {
      code: "auth_error",
      message: "Session expired. Please sign in again.",
      detail: msg,
    };
  }

  if (lower.includes("insufficient") || lower.includes("not enough")) {
    return {
      code: "insufficient_balance",
      message: "Insufficient balance for this transaction.",
      detail: msg,
    };
  }

  if (lower.includes("429") || lower.includes("rate limit") || lower.includes("too many requests")) {
    return {
      code: "rate_limited",
      message: "Too many requests. Please wait a moment.",
      detail: msg,
    };
  }

  if (lower.includes("400") || lower.includes("validation") || lower.includes("invalid")) {
    return {
      code: "validation_error",
      message: msg || "Invalid request. Please check your input.",
      detail: msg,
    };
  }

  return {
    code: "unknown_error",
    message: msg || "Something went wrong. Please try again.",
    detail: msg,
  };
}

const DEFAULT_REDIRECT_ORIGINS = [
  "https://1claw.xyz",
  "https://www.1claw.xyz",
  "https://1claw.co",
  "https://www.1claw.co",
];

function isAllowedRedirectOrigin(origin: string, extra: string[]): boolean {
  if (DEFAULT_REDIRECT_ORIGINS.includes(origin) || extra.includes(origin)) {
    return true;
  }
  try {
    const { hostname } = new URL(origin);
    return (
      hostname === "1claw.xyz" ||
      hostname.endsWith(".1claw.xyz") ||
      hostname === "1claw.co" ||
      hostname.endsWith(".1claw.co") ||
      hostname === "localhost" ||
      hostname === "127.0.0.1"
    );
  } catch {
    return false;
  }
}

/** Assign `window.location` only after origin allowlisting (open-redirect defense). */
export function safeRedirect(url: string, allowedOrigins: string[] = []): void {
  const parsed = new URL(url);
  if (
    parsed.protocol !== "https:" &&
    !(parsed.protocol === "http:" && (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1"))
  ) {
    throw new Error("Redirect blocked: HTTPS required");
  }
  if (!isAllowedRedirectOrigin(parsed.origin, allowedOrigins)) {
    throw new Error("Redirect blocked: origin is not allowlisted");
  }
  window.location.href = parsed.href;
}
