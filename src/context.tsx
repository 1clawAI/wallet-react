import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { OneclawWalletClient } from "./client";
import type { WalletInfo, WalletBalance, SendTransactionParams, SendTransactionResult, SwapParams, SwapResult, SocialLoginResult } from "./types";

interface WalletContextValue {
  wallets: WalletInfo[];
  balances: Record<string, WalletBalance>;
  loading: boolean;
  error: Error | null;
  refreshWallets: () => Promise<void>;
  refreshBalance: (chain: string) => Promise<WalletBalance | null>;
  generateWallets: (chains?: string[]) => Promise<WalletInfo[]>;
  send: (params: SendTransactionParams) => Promise<SendTransactionResult>;
  swap: (params: SwapParams) => Promise<SwapResult>;
  getEffectiveAuthPolicy: () => Promise<EffectiveAuthPolicyResponse>;
  registerPasskey: (name?: string) => Promise<void>;
  client: OneclawWalletClient;
  loginWithEmailOtp: (email: string, code: string, chains?: string[]) => Promise<SocialLoginResult>;
  loginWithSocial: (provider: string, idToken: string, chains?: string[], redirectUri?: string) => Promise<SocialLoginResult>;
  logout: () => void;
}

const WalletContext = createContext<WalletContextValue | null>(null);

interface ProviderProps {
  apiKey: string;
  baseUrl?: string;
  appId?: string;
  persistSession?: "session" | "local" | false;
  children: React.ReactNode;
}

const SESSION_STORAGE_KEY = "1claw_wallet_token";

export function OneclawWalletProvider({ apiKey, baseUrl, appId, persistSession = "session", children }: ProviderProps) {
  if (apiKey.startsWith("1ck_") || apiKey.startsWith("ocv_")) {
    console.error(
      "[1claw/wallet-react] SECURITY: Do not embed human (1ck_) or agent (ocv_) API keys in client-side code. Use a session token or the embedded wallet flow instead.",
    );
  }

  const client = useMemo(() => {
    const c = new OneclawWalletClient("", baseUrl, appId);
    if (apiKey && !apiKey.startsWith("plt_")) {
      c.setToken(apiKey);
    } else if (typeof window !== "undefined" && persistSession) {
      const storage = persistSession === "local" ? localStorage : sessionStorage;
      const stored = storage.getItem(SESSION_STORAGE_KEY);
      if (stored) c.setToken(stored);
    }
    if (apiKey.startsWith("plt_")) {
      c.setToken(apiKey);
    }
    return c;
  }, [apiKey, baseUrl, appId, persistSession]);

  const [wallets, setWallets] = useState<WalletInfo[]>([]);
  const [balances, setBalances] = useState<Record<string, WalletBalance>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const persistToken = useCallback((token: string | null) => {
    if (typeof window === "undefined" || !persistSession) return;
    const storage = persistSession === "local" ? localStorage : sessionStorage;
    if (token) {
      storage.setItem(SESSION_STORAGE_KEY, token);
    } else {
      storage.removeItem(SESSION_STORAGE_KEY);
    }
  }, [persistSession]);

  const refreshWallets = useCallback(async () => {
    try {
      setLoading(true);
      const w = await client.listWallets();
      setWallets(w);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setLoading(false);
    }
  }, [client]);

  const refreshBalance = useCallback(
    async (chain: string): Promise<WalletBalance | null> => {
      try {
        const bal = await client.getBalance(chain);
        setBalances((prev) => ({ ...prev, [chain]: bal }));
        return bal;
      } catch (e) {
        setError(e instanceof Error ? e : new Error(String(e)));
        return null;
      }
    },
    [client]
  );

  const generateWallets = useCallback(
    async (chains?: string[]): Promise<WalletInfo[]> => {
      const w = await client.generateWallets(chains);
      setWallets((prev) => [...prev, ...w]);
      return w;
    },
    [client]
  );

  const send = useCallback(
    async (params: SendTransactionParams): Promise<SendTransactionResult> => {
      return client.send(params);
    },
    [client]
  );

  const swap = useCallback(
    async (params: SwapParams): Promise<SwapResult> => {
      return client.swap(params);
    },
    [client]
  );

  const getEffectiveAuthPolicy = useCallback(async () => {
    return client.getEffectiveAuthPolicy();
  }, [client]);

  const registerPasskey = useCallback(
    async (name?: string) => client.registerPasskey(name),
    [client],
  );

  const loginWithEmailOtp = useCallback(
    async (email: string, code: string, chains?: string[]): Promise<SocialLoginResult> => {
      const result = await client.verifyEmailOtp(email, code, chains);
      if (result.token) persistToken(result.token);
      return result;
    },
    [client, persistToken]
  );

  const loginWithSocial = useCallback(
    async (provider: string, idToken: string, chains?: string[], redirectUri?: string): Promise<SocialLoginResult> => {
      const result = await client.socialLogin(provider, idToken, chains, redirectUri);
      if (result.token) persistToken(result.token);
      return result;
    },
    [client, persistToken]
  );

  const logout = useCallback(() => {
    client.clearToken();
    persistToken(null);
    setWallets([]);
    setBalances({});
  }, [client, persistToken]);

  useEffect(() => {
    if (client.isAuthenticated) {
      refreshWallets();
    } else {
      setLoading(false);
    }
  }, [refreshWallets, client]);

  return (
    <WalletContext.Provider
      value={{ wallets, balances, loading, error, refreshWallets, refreshBalance, generateWallets, send, swap, getEffectiveAuthPolicy, registerPasskey, client, loginWithEmailOtp, loginWithSocial, logout }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useOneclawWallet(): WalletContextValue {
  const ctx = useContext(WalletContext);
  if (!ctx) {
    throw new Error("useOneclawWallet must be used within <OneclawWalletProvider>");
  }
  return ctx;
}
