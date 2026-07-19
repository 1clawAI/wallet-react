"use client";

import React, { useState, useCallback, useEffect } from "react";
import type {
  OneclawEmbeddedWalletProps,
  EmbeddedWalletUser,
  WalletInfo,
  WalletBalance,
  SendTransactionResult,
  SwapResult,
  FiatOnrampSession,
} from "./types";
import { OneclawWalletClient, LinkRequiredError } from "./client";

type View = "login" | "wallet" | "send" | "swap" | "buy" | "receive" | "history";

export function OneclawEmbeddedWallet(props: OneclawEmbeddedWalletProps) {
  const {
    appId,
    baseUrl,
    theme = "auto",
    chains = ["ethereum"],
    features = { send: true, swap: true, buy: true, receive: true, history: true },
    socialProviders = ["google", "apple"],
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
  const [token, setToken] = useState<string | null>(null);
  const [client, setClient] = useState<OneclawWalletClient | null>(null);
  const [wallets, setWallets] = useState<WalletInfo[]>([]);
  const [balances, setBalances] = useState<WalletBalance[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (token) {
      const c = new OneclawWalletClient({ apiKey: token, baseUrl });
      setClient(c);
      setView("wallet");
      loadWallets(c);
    }
  }, [token, baseUrl]);

  const loadWallets = async (c: OneclawWalletClient) => {
    try {
      const w = await c.listWallets();
      setWallets(w);
      const b = await Promise.all(w.map((wallet) => c.getBalance(wallet.chain)));
      setBalances(b);
    } catch (err) {
      handleError(err as Error);
    }
  };

  const handleError = useCallback(
    (err: Error) => {
      setError(err.message);
      onError?.(err);
      setTimeout(() => setError(null), 5000);
    },
    [onError]
  );

  const handleSocialLogin = useCallback(
    async (provider: "google" | "apple" | "discord", idToken: string) => {
      setLoading(true);
      setError(null);
      try {
        const apiBase = baseUrl || "https://api.1claw.xyz";
        const res = await fetch(`${apiBase}/v1/auth/social-login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            provider,
            id_token: idToken,
            auto_provision_chains: chains,
          }),
        });
        if (res.status === 409) {
          const data = await res.json();
          if (data.link_required?.authorize_url) {
            if (onLinkRequired) {
              onLinkRequired(data.link_required.authorize_url, data.link_required.app_slug);
            } else {
              window.location.href = data.link_required.authorize_url;
            }
            return;
          }
        }
        if (!res.ok) {
          const err = await res.json().catch(() => ({ detail: "Login failed" }));
          throw new Error(err.detail || "Login failed");
        }
        const data = await res.json();
        setToken(data.token);
        const walletUser: EmbeddedWalletUser = {
          userId: data.user_id,
          email: data.email,
          walletAddress: data.wallet_address,
          isNewUser: data.is_new_user,
        };
        setUser(walletUser);
        onLogin?.(walletUser);
      } catch (err) {
        if (err instanceof LinkRequiredError) {
          if (onLinkRequired) {
            onLinkRequired(err.authorizeUrl, err.appSlug);
          } else {
            window.location.href = err.authorizeUrl;
          }
          return;
        }
        handleError(err as Error);
      } finally {
        setLoading(false);
      }
    },
    [baseUrl, chains, onLogin, handleError]
  );

  const handleLogout = useCallback(() => {
    setToken(null);
    setUser(null);
    setClient(null);
    setWallets([]);
    setBalances([]);
    setView("login");
    onLogout?.();
  }, [onLogout]);

  const handleSend = useCallback(
    async (params: { chain: string; to: string; valueWei: string; password: string; gasless?: boolean }) => {
      if (!client) return;
      setLoading(true);
      try {
        const result = await client.send(params);
        onTransactionSent?.(result);
        setView("wallet");
        if (client) await loadWallets(client);
      } catch (err) {
        handleError(err as Error);
      } finally {
        setLoading(false);
      }
    },
    [client, onTransactionSent, handleError]
  );

  const handleSwap = useCallback(
    async (params: { chain: string; sellToken: string; buyToken: string; sellAmount: string; password: string }) => {
      if (!client) return;
      setLoading(true);
      try {
        const result = await client.swap(params);
        onSwapCompleted?.(result);
        setView("wallet");
        if (client) await loadWallets(client);
      } catch (err) {
        handleError(err as Error);
      } finally {
        setLoading(false);
      }
    },
    [client, onSwapCompleted, handleError]
  );

  const themeClass =
    theme === "dark"
      ? "ocw-dark"
      : theme === "light"
        ? "ocw-light"
        : "ocw-auto";

  return (
    <div className={`ocw-embedded-wallet ${themeClass} ${className || ""}`}>
      {error && (
        <div className="ocw-error-banner">{error}</div>
      )}

      {view === "login" && (
        <LoginView
          providers={socialProviders}
          loading={loading}
          onLogin={handleSocialLogin}
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
          loading={loading}
        />
      )}

      {view === "send" && features.send && (
        <SendView
          wallets={wallets}
          loading={loading}
          onSend={handleSend}
          onBack={() => setView("wallet")}
        />
      )}

      {view === "swap" && features.swap && (
        <SwapView
          wallets={wallets}
          loading={loading}
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
          baseUrl={baseUrl}
          token={token}
          wallets={wallets}
          onBack={() => setView("wallet")}
        />
      )}
    </div>
  );
}

function LoginView({
  providers,
  loading,
  onLogin,
  appId,
}: {
  providers: ("google" | "apple" | "discord")[];
  loading: boolean;
  onLogin: (provider: "google" | "apple" | "discord", token: string) => void;
  appId: string;
}) {
  return (
    <div className="ocw-login">
      <h2 className="ocw-login-title">Welcome</h2>
      <p className="ocw-login-subtitle">Sign in to access your wallet</p>
      <div className="ocw-login-buttons">
        {providers.includes("google") && (
          <button
            className="ocw-btn ocw-btn-google"
            disabled={loading}
            onClick={() => {
              // In production, this would trigger Google OAuth flow
              // and call onLogin with the resulting id_token
            }}
          >
            Continue with Google
          </button>
        )}
        {providers.includes("apple") && (
          <button
            className="ocw-btn ocw-btn-apple"
            disabled={loading}
            onClick={() => {}}
          >
            Continue with Apple
          </button>
        )}
        {providers.includes("discord") && (
          <button
            className="ocw-btn ocw-btn-discord"
            disabled={loading}
            onClick={() => {}}
          >
            Continue with Discord
          </button>
        )}
      </div>
      <p className="ocw-login-footer">Powered by 1Claw</p>
    </div>
  );
}

function WalletDashboardView({
  user,
  wallets,
  balances,
  features,
  onNavigate,
  onLogout,
  loading,
}: {
  user: EmbeddedWalletUser;
  wallets: WalletInfo[];
  balances: WalletBalance[];
  features: OneclawEmbeddedWalletProps["features"];
  onNavigate: (view: View) => void;
  onLogout: () => void;
  loading: boolean;
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
        {balances.map((b) => (
          <div key={b.chain} className="ocw-balance-row">
            <span className="ocw-chain-name">{b.chain}</span>
            <span className="ocw-balance-value">
              {b.native.balanceDisplay} {b.native.symbol}
            </span>
          </div>
        ))}
        {balances.length === 0 && (
          <p className="ocw-empty">No wallets yet</p>
        )}
      </div>

      <div className="ocw-actions">
        {features?.send && (
          <button className="ocw-action-btn" onClick={() => onNavigate("send")} disabled={loading}>
            Send
          </button>
        )}
        {features?.receive && (
          <button className="ocw-action-btn" onClick={() => onNavigate("receive")} disabled={loading}>
            Receive
          </button>
        )}
        {features?.swap && (
          <button className="ocw-action-btn" onClick={() => onNavigate("swap")} disabled={loading}>
            Swap
          </button>
        )}
        {features?.buy && (
          <button className="ocw-action-btn" onClick={() => onNavigate("buy")} disabled={loading}>
            Buy
          </button>
        )}
      </div>
    </div>
  );
}

function SendView({
  wallets,
  loading,
  onSend,
  onBack,
}: {
  wallets: WalletInfo[];
  loading: boolean;
  onSend: (params: { chain: string; to: string; valueWei: string; password: string; gasless?: boolean }) => void;
  onBack: () => void;
}) {
  const [chain, setChain] = useState(wallets[0]?.chain || "ethereum");
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");
  const [password, setPassword] = useState("");
  const [gasless, setGasless] = useState(false);

  return (
    <div className="ocw-send">
      <button className="ocw-back-btn" onClick={onBack}>&larr; Back</button>
      <h3>Send</h3>
      <select value={chain} onChange={(e) => setChain(e.target.value)} className="ocw-input">
        {wallets.map((w) => <option key={w.chain} value={w.chain}>{w.chain}</option>)}
      </select>
      <input className="ocw-input" placeholder="Recipient address" value={to} onChange={(e) => setTo(e.target.value)} />
      <input className="ocw-input" placeholder="Amount (ETH)" value={amount} onChange={(e) => setAmount(e.target.value)} />
      <input className="ocw-input" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
      <label className="ocw-checkbox">
        <input type="checkbox" checked={gasless} onChange={(e) => setGasless(e.target.checked)} />
        Gasless (sponsored)
      </label>
      <button
        className="ocw-btn ocw-btn-primary"
        disabled={loading || !to || !amount || !password}
        onClick={() => {
          const valueWei = (parseFloat(amount) * 1e18).toFixed(0);
          onSend({ chain, to, valueWei, password, gasless });
        }}
      >
        {loading ? "Sending..." : "Send"}
      </button>
    </div>
  );
}

function SwapView({
  wallets,
  loading,
  onSwap,
  onBack,
}: {
  wallets: WalletInfo[];
  loading: boolean;
  onSwap: (params: { chain: string; sellToken: string; buyToken: string; sellAmount: string; password: string }) => void;
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
      <select value={chain} onChange={(e) => setChain(e.target.value)} className="ocw-input">
        {wallets.map((w) => <option key={w.chain} value={w.chain}>{w.chain}</option>)}
      </select>
      <input className="ocw-input" placeholder="Sell token" value={sellToken} onChange={(e) => setSellToken(e.target.value)} />
      <input className="ocw-input" placeholder="Buy token" value={buyToken} onChange={(e) => setBuyToken(e.target.value)} />
      <input className="ocw-input" placeholder="Amount to sell" value={sellAmount} onChange={(e) => setSellAmount(e.target.value)} />
      <input className="ocw-input" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
      <button
        className="ocw-btn ocw-btn-primary"
        disabled={loading || !sellAmount || !password}
        onClick={() => onSwap({ chain, sellToken, buyToken, sellAmount, password })}
      >
        {loading ? "Swapping..." : "Swap"}
      </button>
    </div>
  );
}

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
      <select value={selected} onChange={(e) => setSelected(e.target.value)} className="ocw-input">
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

function BuyCryptoView({
  baseUrl,
  token,
  wallets,
  onBack,
}: {
  baseUrl?: string;
  token: string | null;
  wallets: WalletInfo[];
  onBack: () => void;
}) {
  const [iframeUrl, setIframeUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleBuy = async (chain: string) => {
    if (!token) return;
    setLoading(true);
    try {
      const apiBase = baseUrl || "https://api.1claw.xyz";
      const res = await fetch(`${apiBase}/v1/fiat/onramp/session`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ chain }),
      });
      if (!res.ok) throw new Error("Failed to create onramp session");
      const data: FiatOnrampSession = await res.json();
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
