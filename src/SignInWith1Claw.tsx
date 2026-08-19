import React, { useCallback, useMemo } from "react";

const DEFAULT_API_BASE_URL = "https://api.1claw.xyz";
const DEFAULT_AUTHORIZE_BASE_URL = "https://1claw.xyz";
const STORAGE_KEY = "1claw_pkce_verifier";
const STATE_KEY = "1claw_oauth_state";

function isDashboardUrl(url: string): boolean {
  try {
    const { hostname } = new URL(url);
    return hostname === "1claw.xyz" || hostname.endsWith(".1claw.xyz");
  } catch {
    return false;
  }
}

export interface SignInWith1ClawProps {
  clientId: string;
  redirectUri: string;
  /** @deprecated Use `apiBaseUrl` and `authorizeBaseUrl` instead. */
  baseUrl?: string;
  /** Base URL for API token exchange (default: https://api.1claw.xyz) */
  apiBaseUrl?: string;
  /** Base URL for OAuth consent redirect (default: https://1claw.xyz) */
  authorizeBaseUrl?: string;
  scopes?: string[];
  onSuccess?: (tokenResponse: OAuthTokenResponse) => void;
  onError?: (error: Error) => void;
  theme?: "light" | "dark";
  size?: "sm" | "md" | "lg";
  className?: string;
}

export interface OAuthTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  id_token?: string;
}

async function generatePKCE(): Promise<{ codeVerifier: string; codeChallenge: string }> {
  const buf = new Uint8Array(32);
  crypto.getRandomValues(buf);
  const codeVerifier = base64url(buf);

  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(codeVerifier),
  );
  const codeChallenge = base64url(new Uint8Array(digest));

  return { codeVerifier, codeChallenge };
}

function base64url(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function generateState(): string {
  const buf = new Uint8Array(16);
  crypto.getRandomValues(buf);
  return base64url(buf);
}

const sizeStyles = {
  sm: { padding: "6px 12px", fontSize: "13px", iconSize: 14 },
  md: { padding: "10px 20px", fontSize: "15px", iconSize: 18 },
  lg: { padding: "14px 28px", fontSize: "17px", iconSize: 22 },
} as const;

/**
 * Drop-in "Sign in with 1Claw" button.
 *
 * On click it generates a PKCE pair, stores the `code_verifier` in
 * sessionStorage, and redirects to the 1Claw authorize endpoint.
 *
 * After the redirect back, call `handleSignInCallback()` with the
 * authorization code to exchange it for tokens.
 */
export function SignInWith1Claw({
  clientId,
  redirectUri,
  baseUrl,
  apiBaseUrl,
  authorizeBaseUrl,
  scopes = ["openid", "profile", "email"],
  onSuccess,
  onError,
  theme = "dark",
  size = "md",
  className,
}: SignInWith1ClawProps) {
  const resolvedAuthorizeUrl = useMemo(() => {
    if (authorizeBaseUrl) return authorizeBaseUrl.replace(/\/$/, "");
    if (baseUrl && isDashboardUrl(baseUrl)) return baseUrl.replace(/\/$/, "");
    return DEFAULT_AUTHORIZE_BASE_URL;
  }, [authorizeBaseUrl, baseUrl]);

  const resolvedApiUrl = useMemo(() => {
    if (apiBaseUrl) return apiBaseUrl.replace(/\/$/, "");
    if (baseUrl && !isDashboardUrl(baseUrl)) return baseUrl.replace(/\/$/, "");
    return DEFAULT_API_BASE_URL;
  }, [apiBaseUrl, baseUrl]);

  const handleClick = useCallback(async () => {
    try {
      const { codeVerifier, codeChallenge } = await generatePKCE();
      const state = generateState();

      sessionStorage.setItem(STORAGE_KEY, codeVerifier);
      sessionStorage.setItem(STATE_KEY, state);

      const url = new URL("/oauth/authorize", resolvedAuthorizeUrl);
      url.searchParams.set("client_id", clientId);
      url.searchParams.set("redirect_uri", redirectUri);
      url.searchParams.set("response_type", "code");
      url.searchParams.set("scope", scopes.join(" "));
      url.searchParams.set("state", state);
      url.searchParams.set("code_challenge", codeChallenge);
      url.searchParams.set("code_challenge_method", "S256");

      window.location.href = url.toString();
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      onError?.(error);
    }
  }, [clientId, redirectUri, resolvedAuthorizeUrl, scopes, onError]);

  const s = sizeStyles[size];
  const isDark = theme === "dark";

  const style: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    padding: s.padding,
    fontSize: s.fontSize,
    fontWeight: 600,
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    lineHeight: 1,
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    transition: "background-color 0.15s, box-shadow 0.15s",
    backgroundColor: isDark ? "#0f0f0f" : "#ffffff",
    color: isDark ? "#ffffff" : "#0f0f0f",
    boxShadow: isDark
      ? "0 1px 3px rgba(0,0,0,0.3)"
      : "0 1px 3px rgba(0,0,0,0.12), inset 0 0 0 1px rgba(0,0,0,0.12)",
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={className}
      style={style}
      onMouseEnter={(e) => {
        (e.currentTarget.style.backgroundColor = isDark ? "#1a1a1a" : "#f5f5f5");
      }}
      onMouseLeave={(e) => {
        (e.currentTarget.style.backgroundColor = isDark ? "#0f0f0f" : "#ffffff");
      }}
    >
      <OneclawLogo size={s.iconSize} color={isDark ? "#ffffff" : "#0f0f0f"} />
      Sign in with 1Claw
    </button>
  );
}

function OneclawLogo({ size, color }: { size: number; color: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M12 2L4 6v6c0 5.25 3.4 10.15 8 11.35C16.6 22.15 20 17.25 20 12V6l-8-4z"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 8v4m0 0v4m0-4h4m-4 0H8"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * Exchange the authorization code from the OAuth callback for tokens.
 *
 * Reads the stored PKCE `code_verifier` from sessionStorage, validates
 * the `state` parameter, and POSTs to the 1Claw token endpoint.
 *
 * Call this on your redirect URI page after extracting `code` and `state`
 * from the URL query parameters.
 */
export async function handleSignInCallback(params: {
  code: string;
  state?: string;
  clientId: string;
  redirectUri: string;
  /** @deprecated Use `apiBaseUrl` instead. */
  baseUrl?: string;
  /** Base URL for token exchange API (default: https://api.1claw.xyz) */
  apiBaseUrl?: string;
}): Promise<OAuthTokenResponse> {
  let resolvedApiUrl: string;
  if (params.apiBaseUrl) {
    resolvedApiUrl = params.apiBaseUrl.replace(/\/$/, "");
  } else if (params.baseUrl && !isDashboardUrl(params.baseUrl)) {
    resolvedApiUrl = params.baseUrl.replace(/\/$/, "");
  } else {
    resolvedApiUrl = DEFAULT_API_BASE_URL;
  }

  const storedState = sessionStorage.getItem(STATE_KEY);
  if (params.state && storedState && params.state !== storedState) {
    throw new Error("OAuth state mismatch — possible CSRF attack.");
  }

  const codeVerifier = sessionStorage.getItem(STORAGE_KEY);
  if (!codeVerifier) {
    throw new Error(
      "Missing PKCE code_verifier in sessionStorage. Did the sign-in flow start on this page?",
    );
  }

  sessionStorage.removeItem(STORAGE_KEY);
  sessionStorage.removeItem(STATE_KEY);

  const resp = await fetch(`${resolvedApiUrl}/v1/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "authorization_code",
      code: params.code,
      client_id: params.clientId,
      redirect_uri: params.redirectUri,
      code_verifier: codeVerifier,
    }),
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ detail: resp.statusText }));
    throw new Error(err.detail || `Token exchange failed: ${resp.status}`);
  }

  return resp.json();
}
