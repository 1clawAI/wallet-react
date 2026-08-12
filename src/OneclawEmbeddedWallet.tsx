"use client";

import React, { useState, useCallback, useEffect, useMemo, useRef } from "react";
import type {
  OneclawEmbeddedWalletProps,
  EmbeddedWalletUser,
  WalletInfo,
  WalletBalance,
  SendTransactionResult,
  SwapResult,
  SocialProviderConfig,
} from "./types";
import { OneclawWalletClient, LinkRequiredError } from "./client";
import { classifyError } from "./utils";
import { injectThemeStyles } from "./theme";

type View = "login" | "wallet" | "send" | "swap" | "buy" | "receive" | "history";

// ─── Toast system ──────────────────────────────────────────────────

interface Toast {
  id: number;
  type: "error" | "success";
  message: string;
}

let toastIdCounter = 0;

function ToastContainer({
  toasts,
  onDismiss,
}: {
  toasts: Toast[];
  onDismiss: (id: number) => void;
}) {
  if (toasts.length === 0) return null;
  return (
    <div className="ocw-toast-container" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`ocw-toast ocw-toast-${t.type}`}>
          <span>{t.message}</span>
          <button
            className="ocw-toast-dismiss"
            onClick={() => onDismiss(t.id)}
            aria-label="Dismiss"
          >
            &times;
          </button>
        </div>
      ))}
    </div>
  );
}

// ─── Skeleton / Spinner helpers ────────────────────────────────────

function BalanceSkeleton() {
  return (
    <>
      {[0, 1].map((i) => (
        <div key={i} className="ocw-skeleton-row">
          <div className="ocw-skeleton-block" style={{ width: "70px" }} />
          <div className="ocw-skeleton-block" style={{ width: "100px" }} />
        </div>
      ))}
    </>
  );
}

function Spinner() {
  return (
    <div className="ocw-spinner-overlay">
      <div className="ocw-spinner" />
    </div>
  );
}

// ─── Social login provider icons (inline SVG) ─────────────────────

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
    </svg>
  );
}

function DiscordIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="#5865F2" aria-hidden="true">
      <path d="M20.32 4.37A19.8 19.8 0 0 0 15.43 3c-.22.4-.42.82-.58 1.23a18.42 18.42 0 0 0-5.7 0A12.8 12.8 0 0 0 8.57 3 19.74 19.74 0 0 0 3.68 4.37 20.26 20.26 0 0 0 .1 16.44a19.93 19.93 0 0 0 6.07 3.06 14.8 14.8 0 0 0 1.27-2.06c-.7-.26-1.37-.58-2-.95.17-.12.33-.25.49-.37a14.22 14.22 0 0 0 12.14 0c.16.13.32.26.49.37-.64.37-1.3.7-2 .95.37.71.79 1.4 1.27 2.06a19.87 19.87 0 0 0 6.07-3.06A20.2 20.2 0 0 0 20.32 4.37zM8.02 13.97c-1.18 0-2.15-1.08-2.15-2.42s.95-2.42 2.15-2.42 2.17 1.09 2.15 2.42c0 1.34-.95 2.42-2.15 2.42zm7.96 0c-1.18 0-2.15-1.08-2.15-2.42s.95-2.42 2.15-2.42 2.17 1.09 2.15 2.42c0 1.34-.96 2.42-2.15 2.42z" />
    </svg>
  );
}

// ─── Google Sign-In via OAuth popup ────────────────────────────────

function openOAuthPopup(url: string, name: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const w = 500;
    const h = 600;
    const left = (window.screen.width - w) / 2;
    const top = (window.screen.height - h) / 2;
    const popup = window.open(
      url,
      name,
      `width=${w},height=${h},left=${left},top=${top},toolbar=no,menubar=no`,
    );
    if (!popup) {
      reject(new Error("Popup was blocked. Please allow popups for this site."));
      return;
    }

    const interval = setInterval(() => {
      try {
        if (popup.closed) {
          clearInterval(interval);
          reject(new Error("Sign-in popup was closed."));
          return;
        }
        const params = new URLSearchParams(popup.location.search);
        const code = params.get("code");
        const idToken = params.get("id_token") || params.get("credential");
        if (code || idToken) {
          clearInterval(interval);
          popup.close();
          resolve(code || idToken || "");
        }
      } catch {
        // cross-origin until the redirect back
      }
    }, 300);

    setTimeout(() => {
      clearInterval(interval);
      if (!popup.closed) popup.close();
      reject(new Error("Sign-in timed out. Please try again."));
    }, 120_000);
  });
}

function buildGoogleAuthUrl(clientId: string, redirectUri?: string): string {
  const redirect = redirectUri || window.location.origin + "/auth/callback";
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirect,
    response_type: "id_token",
    scope: "openid email profile",
    nonce: Math.random().toString(36).slice(2),
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

function buildAppleAuthUrl(clientId: string, redirectUri: string): string {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code id_token",
    scope: "name email",
    response_mode: "fragment",
  });
  return `https://appleid.apple.com/auth/authorize?${params}`;
}

function buildDiscordAuthUrl(clientId: string, redirectUri: string): string {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "identify email",
  });
  return `https://discord.com/api/oauth2/authorize?${params}`;
}

// ─── Main component ────────────────────────────────────────────────

export function OneclawEmbeddedWallet(props: OneclawEmbeddedWalletProps) {
  const {
    appId,
    baseUrl,
    theme = "auto",
    brandColor,
    chains = ["ethereum"],
    features = { send: true, swap: true, buy: true, receive: true, history: true },
    socialProviders = ["google", "apple"],
    socialProviderConfig,
    onLogin,
    onLogout,
    onLinkRequired,
    onTransactionSent,
    onSwapCompleted,
    onError,
    className,
  } = props;

  const [view, setView] = useState<View>("login");
  const [user, setUser] = useState<EmbeddedWalletUser | null>(null);
  const [wallets, setWallets] = useState<WalletInfo[]>([]);
  const [balances, setBalances] = useState<WalletBalance[]>([]);
  const [loading, setLoading] = useState(false);
  const [walletsLoading, setWalletsLoading] = useState(false);
  const [operationLoading, setOperationLoading] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    injectThemeStyles(theme === "auto" ? "auto" : theme, brandColor);
  }, [theme, brandColor]);

  const client = useMemo(
    () => new OneclawWalletClient("", baseUrl, appId),
    [appId, baseUrl],
  );

  const showToast = useCallback((type: "error" | "success", message: string) => {
    const id = ++toastIdCounter;
    setToasts((prev) => [...prev.slice(-4), { id, type, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 5000);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const handleError = useCallback(
    (err: unknown) => {
      const classified = classifyError(err);
      showToast("error", classified.message);
      onError?.(err instanceof Error ? err : new Error(classified.message));
    },
    [onError, showToast],
  );

  const loadWallets = useCallback(
    async (c: OneclawWalletClient) => {
      setWalletsLoading(true);
      try {
        const w = await c.listWallets();
        setWallets(w);
        const b = await Promise.all(w.map((wallet) => c.getBalance(wallet.chain)));
        setBalances(b);
      } catch (err) {
        handleError(err);
      } finally {
        setWalletsLoading(false);
      }
    },
    [handleError],
  );

  const completeLogin = useCallback(
    (data: { token: string; user_id: string; email: string; wallet_address?: string; is_new_user: boolean }) => {
      const walletUser: EmbeddedWalletUser = {
        userId: data.user_id,
        email: data.email,
        walletAddress: data.wallet_address,
        isNewUser: data.is_new_user,
        isPasswordless: true,
      };
      setUser(walletUser);
      setView("wallet");
      onLogin?.(walletUser);
      loadWallets(client);
    },
    [client, onLogin, loadWallets],
  );

  const handleLinkRequired = useCallback(
    (err: LinkRequiredError) => {
      if (onLinkRequired) {
        onLinkRequired(err.authorizeUrl, err.appSlug);
      } else {
        window.location.href = err.authorizeUrl;
      }
    },
    [onLinkRequired],
  );

  const handleSocialLogin = useCallback(
    async (provider: "google" | "apple" | "discord", idToken: string, redirectUri?: string) => {
      setLoading(true);
      try {
        const body: Record<string, unknown> = {
          provider,
          id_token: idToken,
          auto_provision_chains: chains,
          platform_app_id: appId,
        };
        if (provider === "discord" && redirectUri) {
          body.oauth_redirect_uri = redirectUri;
        }
        const data = await client.socialLogin(provider, idToken, chains, redirectUri);
        completeLogin(data);
      } catch (err) {
        if (err instanceof LinkRequiredError) {
          handleLinkRequired(err);
          return;
        }
        handleError(err);
      } finally {
        setLoading(false);
      }
    },
    [client, chains, appId, completeLogin, handleLinkRequired, handleError],
  );

  const handleGoogleLogin = useCallback(async () => {
    const cfg = socialProviderConfig?.google;
    if (!cfg?.clientId) {
      handleError(new Error("Google sign-in is not configured. Provide socialProviderConfig.google.clientId."));
      return;
    }
    try {
      const url = buildGoogleAuthUrl(cfg.clientId);
      const credential = await openOAuthPopup(url, "google-signin");
      await handleSocialLogin("google", credential);
    } catch (err) {
      handleError(err);
    }
  }, [socialProviderConfig, handleSocialLogin, handleError]);

  const handleAppleLogin = useCallback(async () => {
    const cfg = socialProviderConfig?.apple;
    if (!cfg?.clientId || !cfg?.redirectUri) {
      handleError(new Error("Apple sign-in is not configured. Provide socialProviderConfig.apple.clientId and redirectUri."));
      return;
    }
    try {
      const url = buildAppleAuthUrl(cfg.clientId, cfg.redirectUri);
      const credential = await openOAuthPopup(url, "apple-signin");
      await handleSocialLogin("apple", credential);
    } catch (err) {
      handleError(err);
    }
  }, [socialProviderConfig, handleSocialLogin, handleError]);

  const handleDiscordLogin = useCallback(async () => {
    const cfg = socialProviderConfig?.discord;
    if (!cfg?.clientId || !cfg?.redirectUri) {
      handleError(new Error("Discord sign-in is not configured. Provide socialProviderConfig.discord.clientId and redirectUri."));
      return;
    }
    try {
      const url = buildDiscordAuthUrl(cfg.clientId, cfg.redirectUri);
      const code = await openOAuthPopup(url, "discord-signin");
      await handleSocialLogin("discord", code, cfg.redirectUri);
    } catch (err) {
      handleError(err);
    }
  }, [socialProviderConfig, handleSocialLogin, handleError]);

  const handleSendOtp = useCallback(
    async (email: string) => {
      setLoading(true);
      try {
        await client.sendEmailOtp(email);
      } catch (err) {
        handleError(err);
      } finally {
        setLoading(false);
      }
    },
    [client, handleError],
  );

  const handleVerifyOtp = useCallback(
    async (email: string, code: string) => {
      setLoading(true);
      try {
        const data = await client.verifyEmailOtp(email, code, chains);
        completeLogin(data);
      } catch (err) {
        if (err instanceof LinkRequiredError) {
          handleLinkRequired(err);
          return;
        }
        handleError(err);
      } finally {
        setLoading(false);
      }
    },
    [client, chains, completeLogin, handleLinkRequired, handleError],
  );

  const handleLogout = useCallback(() => {
    client.clearToken();
    setUser(null);
    setWallets([]);
    setBalances([]);
    setView("login");
    onLogout?.();
  }, [client, onLogout]);

  const handleSend = useCallback(
    async (params: { chain: string; to: string; valueWei: string; password?: string; passkeyToken?: string; gasless?: boolean }) => {
      if (!client) return;
      setOperationLoading(true);
      try {
        const result = await client.send(params);
        showToast("success", "Transaction sent successfully!");
        onTransactionSent?.(result);
        setView("wallet");
        if (client) await loadWallets(client);
      } catch (err) {
        handleError(err);
      } finally {
        setOperationLoading(false);
      }
    },
    [client, onTransactionSent, handleError, showToast, loadWallets],
  );

  const handleSwap = useCallback(
    async (params: { chain: string; sellToken: string; buyToken: string; sellAmount: string; password?: string; passkeyToken?: string }) => {
      if (!client) return;
      setOperationLoading(true);
      try {
        const result = await client.swap(params);
        showToast("success", "Swap completed successfully!");
        onSwapCompleted?.(result);
        setView("wallet");
        if (client) await loadWallets(client);
      } catch (err) {
        handleError(err);
      } finally {
        setOperationLoading(false);
      }
    },
    [client, onSwapCompleted, handleError, showToast, loadWallets],
  );

  const themeClass =
    theme === "dark"
      ? "ocw-dark"
      : theme === "light"
        ? "ocw-light"
        : "ocw-auto";

  return (
    <div className={`ocw-embedded-wallet ${themeClass} ${className || ""}`}>
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {operationLoading && <Spinner />}

      {view === "login" && (
        <LoginView
          providers={socialProviders}
          providerConfig={socialProviderConfig}
          loading={loading}
          onGoogleLogin={handleGoogleLogin}
          onAppleLogin={handleAppleLogin}
          onDiscordLogin={handleDiscordLogin}
          onSendOtp={handleSendOtp}
          onVerifyOtp={handleVerifyOtp}
          appId={appId}
        />
      )}

      {view === "wallet" && user && (
        <WalletDashboardView
          user={user}
          wallets={wallets}
          balances={balances}
          features={features}
          onNavigate={setView}
          onLogout={handleLogout}
          walletsLoading={walletsLoading}
        />
      )}

      {view === "send" && features.send && (
        <SendView
          wallets={wallets}
          loading={operationLoading}
          isPasswordless={user?.isPasswordless ?? false}
          client={client}
          onSend={handleSend}
          onBack={() => setView("wallet")}
        />
      )}

      {view === "swap" && features.swap && (
        <SwapView
          wallets={wallets}
          loading={operationLoading}
          isPasswordless={user?.isPasswordless ?? false}
          onSwap={handleSwap}
          onBack={() => setView("wallet")}
        />
      )}

      {view === "receive" && features.receive && (
        <ReceiveView
          wallets={wallets}
          onBack={() => setView("wallet")}
        />
      )}

      {view === "buy" && features.buy && (
        <BuyCryptoView
          client={client}
          wallets={wallets}
          onBack={() => setView("wallet")}
        />
      )}
    </div>
  );
}

// ─── LoginView ─────────────────────────────────────────────────────

function LoginView({
  providers,
  providerConfig,
  loading,
  onGoogleLogin,
  onAppleLogin,
  onDiscordLogin,
  onSendOtp,
  onVerifyOtp,
  appId,
}: {
  providers: ("google" | "apple" | "discord")[];
  providerConfig?: SocialProviderConfig;
  loading: boolean;
  onGoogleLogin: () => void;
  onAppleLogin: () => void;
  onDiscordLogin: () => void;
  onSendOtp: (email: string) => void;
  onVerifyOtp: (email: string, code: string) => void;
  appId: string;
}) {
  const [email, setEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);

  const enabledProviders = providers.filter((p) => {
    if (p === "google") return !!providerConfig?.google?.clientId;
    if (p === "apple") return !!providerConfig?.apple?.clientId;
    if (p === "discord") return !!providerConfig?.discord?.clientId;
    return false;
  });

  const handleProviderClick = (provider: "google" | "apple" | "discord") => {
    if (provider === "google") onGoogleLogin();
    else if (provider === "apple") onAppleLogin();
    else if (provider === "discord") onDiscordLogin();
  };

  return (
    <div className="ocw-login">
      <h2 className="ocw-login-title">Welcome</h2>
      <p className="ocw-login-subtitle">Sign in to access your wallet</p>

      <div className="ocw-email-login">
        {!otpSent ? (
          <>
            <input
              className="ocw-input"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              aria-label="Email address"
            />
            <button
              className="ocw-btn ocw-btn-primary"
              disabled={loading || !email}
              onClick={() => {
                onSendOtp(email);
                setOtpSent(true);
              }}
            >
              {loading ? "Sending..." : "Continue with Email"}
            </button>
          </>
        ) : (
          <>
            <p className="ocw-otp-hint">Enter the code sent to {email}</p>
            <input
              className="ocw-input"
              type="text"
              inputMode="numeric"
              placeholder="6-digit code"
              maxLength={6}
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
              disabled={loading}
              aria-label="Verification code"
            />
            <button
              className="ocw-btn ocw-btn-primary"
              disabled={loading || otpCode.length !== 6}
              onClick={() => onVerifyOtp(email, otpCode)}
            >
              {loading ? "Verifying..." : "Verify"}
            </button>
            <button
              className="ocw-btn-text"
              onClick={() => { setOtpSent(false); setOtpCode(""); }}
              disabled={loading}
            >
              Use a different email
            </button>
          </>
        )}
      </div>

      {enabledProviders.length > 0 && (
        <>
          <div className="ocw-divider"><span>or</span></div>
          <div className="ocw-login-buttons">
            {enabledProviders.includes("google") && (
              <button
                className="ocw-btn-social"
                disabled={loading}
                onClick={() => handleProviderClick("google")}
              >
                <GoogleIcon />
                Continue with Google
              </button>
            )}
            {enabledProviders.includes("apple") && (
              <button
                className="ocw-btn-social"
                disabled={loading}
                onClick={() => handleProviderClick("apple")}
              >
                <AppleIcon />
                Continue with Apple
              </button>
            )}
            {enabledProviders.includes("discord") && (
              <button
                className="ocw-btn-social"
                disabled={loading}
                onClick={() => handleProviderClick("discord")}
              >
                <DiscordIcon />
                Continue with Discord
              </button>
            )}
          </div>
        </>
      )}

      <p className="ocw-login-footer">Powered by 1Claw</p>
    </div>
  );
}

// ─── WalletDashboardView ───────────────────────────────────────────

function WalletDashboardView({
  user,
  wallets,
  balances,
  features,
  onNavigate,
  onLogout,
  walletsLoading,
}: {
  user: EmbeddedWalletUser;
  wallets: WalletInfo[];
  balances: WalletBalance[];
  features: OneclawEmbeddedWalletProps["features"];
  onNavigate: (view: View) => void;
  onLogout: () => void;
  walletsLoading: boolean;
}) {
  return (
    <div className="ocw-dashboard">
      <div className="ocw-dashboard-header">
        <span className="ocw-user-email">{user.email}</span>
        <button className="ocw-btn-text" onClick={onLogout}>
          Sign Out
        </button>
      </div>

      <div className="ocw-balances">
        {walletsLoading ? (
          <BalanceSkeleton />
        ) : balances.length > 0 ? (
          balances.map((b) => (
            <div key={b.chain} className="ocw-balance-row">
              <span className="ocw-chain-name">{b.chain}</span>
              <span className="ocw-balance-value">
                {b.native.balanceDisplay} {b.native.symbol}
              </span>
            </div>
          ))
        ) : (
          <p className="ocw-empty">No wallets yet</p>
        )}
      </div>

      <div className="ocw-actions">
        {features?.send && (
          <button className="ocw-action-btn" onClick={() => onNavigate("send")} disabled={walletsLoading}>
            Send
          </button>
        )}
        {features?.receive && (
          <button className="ocw-action-btn" onClick={() => onNavigate("receive")} disabled={walletsLoading}>
            Receive
          </button>
        )}
        {features?.swap && (
          <button className="ocw-action-btn" onClick={() => onNavigate("swap")} disabled={walletsLoading}>
            Swap
          </button>
        )}
        {features?.buy && (
          <button className="ocw-action-btn" onClick={() => onNavigate("buy")} disabled={walletsLoading}>
            Buy
          </button>
        )}
      </div>
    </div>
  );
}

// ─── SendView ──────────────────────────────────────────────────────

function SendView({
  wallets,
  loading,
  isPasswordless,
  client,
  onSend,
  onBack,
}: {
  wallets: WalletInfo[];
  loading: boolean;
  isPasswordless: boolean;
  client: OneclawWalletClient;
  onSend: (params: { chain: string; to: string; valueWei: string; password?: string; passkeyToken?: string; gasless?: boolean }) => void;
  onBack: () => void;
}) {
  const [chain, setChain] = useState(wallets[0]?.chain || "ethereum");
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");
  const [password, setPassword] = useState("");
  const [gasless, setGasless] = useState(false);
  const [passkeyLoading, setPasskeyLoading] = useState(false);
  const [passkeyError, setPasskeyError] = useState<string | null>(null);

  const handlePasskeySend = async () => {
    if (!client || !to || !amount) return;
    setPasskeyLoading(true);
    setPasskeyError(null);
    try {
      const valueWei = (parseFloat(amount) * 1e18).toFixed(0);
      const txDigest = await client.treasurySendTxDigest(chain, to, valueWei);
      const beginResp = await client.beginPasskeyTxAuth(txDigest);

      const credential = await navigator.credentials.get({
        publicKey: {
          challenge: Uint8Array.from(atob(beginResp.challenge.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0)),
          rpId: beginResp.rp_id,
          allowCredentials: (beginResp.allow_credentials || []).map((cred) => {
            const c = cred as { id: string; type?: string };
            return {
              id: Uint8Array.from(atob(c.id.replace(/-/g, "+").replace(/_/g, "/")), (ch) => ch.charCodeAt(0)),
              type: "public-key" as const,
            };
          }),
          timeout: 60000,
          userVerification: "required",
        },
      }) as PublicKeyCredential | null;

      if (!credential) {
        setPasskeyError("Passkey authentication was cancelled");
        return;
      }

      const response = credential.response as AuthenticatorAssertionResponse;
      const toBase64Url = (buffer: ArrayBuffer) => {
        const bytes = new Uint8Array(buffer);
        let binary = "";
        bytes.forEach((b) => (binary += String.fromCharCode(b)));
        return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
      };

      const authResult = await client.completePasskeyTxAuth({
        credential_id: toBase64Url(credential.rawId),
        authenticator_data: toBase64Url(response.authenticatorData),
        client_data_json: toBase64Url(response.clientDataJSON),
        signature: toBase64Url(response.signature),
      });

      onSend({ chain, to, valueWei, passkeyToken: authResult.passkey_token, gasless });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Passkey authentication failed";
      setPasskeyError(message);
    } finally {
      setPasskeyLoading(false);
    }
  };

  const isSubmitting = loading || passkeyLoading;

  return (
    <div className="ocw-send">
      <button className="ocw-back-btn" onClick={onBack}>&larr; Back</button>
      <h3>Send</h3>
      <select value={chain} onChange={(e) => setChain(e.target.value)} className="ocw-input" aria-label="Chain">
        {wallets.map((w) => <option key={w.chain} value={w.chain}>{w.chain}</option>)}
      </select>
      <input className="ocw-input" placeholder="Recipient address" value={to} onChange={(e) => setTo(e.target.value)} aria-label="Recipient address" />
      <input className="ocw-input" placeholder="Amount (ETH)" value={amount} onChange={(e) => setAmount(e.target.value)} aria-label="Amount" />

      {!isPasswordless && (
        <input className="ocw-input" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} aria-label="Password" />
      )}

      <label className="ocw-checkbox">
        <input type="checkbox" checked={gasless} onChange={(e) => setGasless(e.target.checked)} />
        Gasless (sponsored)
      </label>

      {passkeyError && (
        <p className="ocw-passkey-error">{passkeyError}</p>
      )}

      {isPasswordless ? (
        <button
          className="ocw-btn ocw-btn-primary"
          disabled={isSubmitting || !to || !amount}
          onClick={handlePasskeySend}
        >
          {passkeyLoading ? "Confirming..." : "Confirm with Passkey"}
        </button>
      ) : (
        <button
          className="ocw-btn ocw-btn-primary"
          disabled={isSubmitting || !to || !amount || !password}
          onClick={() => {
            const valueWei = (parseFloat(amount) * 1e18).toFixed(0);
            onSend({ chain, to, valueWei, password, gasless });
          }}
        >
          {loading ? "Sending..." : "Send"}
        </button>
      )}
    </div>
  );
}

// ─── SwapView ──────────────────────────────────────────────────────

function SwapView({
  wallets,
  loading,
  isPasswordless,
  onSwap,
  onBack,
}: {
  wallets: WalletInfo[];
  loading: boolean;
  isPasswordless: boolean;
  onSwap: (params: { chain: string; sellToken: string; buyToken: string; sellAmount: string; password?: string; passkeyToken?: string }) => void;
  onBack: () => void;
}) {
  const [chain, setChain] = useState(wallets[0]?.chain || "ethereum");
  const [sellToken, setSellToken] = useState("ETH");
  const [buyToken, setBuyToken] = useState("USDC");
  const [sellAmount, setSellAmount] = useState("");
  const [password, setPassword] = useState("");

  return (
    <div className="ocw-swap">
      <button className="ocw-back-btn" onClick={onBack}>&larr; Back</button>
      <h3>Swap</h3>
      <select value={chain} onChange={(e) => setChain(e.target.value)} className="ocw-input" aria-label="Chain">
        {wallets.map((w) => <option key={w.chain} value={w.chain}>{w.chain}</option>)}
      </select>
      <input className="ocw-input" placeholder="Sell token" value={sellToken} onChange={(e) => setSellToken(e.target.value)} aria-label="Sell token" />
      <input className="ocw-input" placeholder="Buy token" value={buyToken} onChange={(e) => setBuyToken(e.target.value)} aria-label="Buy token" />
      <input className="ocw-input" placeholder="Amount to sell" value={sellAmount} onChange={(e) => setSellAmount(e.target.value)} aria-label="Sell amount" />
      {!isPasswordless && (
        <input className="ocw-input" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} aria-label="Password" />
      )}
      <button
        className="ocw-btn ocw-btn-primary"
        disabled={loading || !sellAmount || (!isPasswordless && !password)}
        onClick={() => onSwap({ chain, sellToken, buyToken, sellAmount, password: isPasswordless ? undefined : password })}
      >
        {loading ? "Swapping..." : isPasswordless ? "Confirm Swap with Passkey" : "Swap"}
      </button>
      {isPasswordless && (
        <p className="ocw-passkey-hint">You'll be asked to confirm with your passkey</p>
      )}
    </div>
  );
}

// ─── ReceiveView ───────────────────────────────────────────────────

function ReceiveView({
  wallets,
  onBack,
}: {
  wallets: WalletInfo[];
  onBack: () => void;
}) {
  const [selected, setSelected] = useState(wallets[0]?.chain || "ethereum");
  const wallet = wallets.find((w) => w.chain === selected);

  return (
    <div className="ocw-receive">
      <button className="ocw-back-btn" onClick={onBack}>&larr; Back</button>
      <h3>Receive</h3>
      <select value={selected} onChange={(e) => setSelected(e.target.value)} className="ocw-input" aria-label="Chain">
        {wallets.map((w) => <option key={w.chain} value={w.chain}>{w.chain}</option>)}
      </select>
      {wallet && (
        <div className="ocw-address-display">
          <p className="ocw-address-label">Your {wallet.chain} address:</p>
          <code className="ocw-address">{wallet.address}</code>
          <button
            className="ocw-btn ocw-btn-secondary"
            onClick={() => navigator.clipboard.writeText(wallet.address)}
          >
            Copy
          </button>
        </div>
      )}
    </div>
  );
}

// ─── BuyCryptoView ─────────────────────────────────────────────────

function BuyCryptoView({
  client,
  wallets,
  onBack,
}: {
  client: OneclawWalletClient;
  wallets: WalletInfo[];
  onBack: () => void;
}) {
  const [iframeUrl, setIframeUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleBuy = async (chain: string) => {
    if (!client.isAuthenticated) return;
    setLoading(true);
    try {
      const data = await client.createOnrampSession(chain);
      setIframeUrl(data.session_url);
    } catch {
      setIframeUrl(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ocw-buy">
      <button className="ocw-back-btn" onClick={onBack}>&larr; Back</button>
      <h3>Buy Crypto</h3>
      {!iframeUrl ? (
        <div className="ocw-buy-options">
          {wallets.map((w) => (
            <button
              key={w.chain}
              className="ocw-btn ocw-btn-secondary"
              onClick={() => handleBuy(w.chain)}
              disabled={loading}
            >
              Buy on {w.chain}
            </button>
          ))}
        </div>
      ) : (
        <iframe
          src={iframeUrl}
          className="ocw-onramp-iframe"
          title="Buy Crypto"
          allow="payment"
        />
      )}
    </div>
  );
}
