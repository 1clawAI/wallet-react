import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from "react";
import { OneclawWalletClient } from "./client";
import type { WalletInfo, WalletBalance, SendTransactionParams, SendTransactionResult, SwapParams, SwapResult, SocialLoginResult, EffectiveAuthPolicyResponse, SpendPolicyResponse, EmbeddedWalletUser } from "./types";

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
  /** Spend limits in force, for showing them before a send. */
  getEffectiveSpendPolicy: () => Promise<SpendPolicyResponse>;
  /**
   * Who is signed in, or null. Populated on login and rehydrated from the
   * server on mount, so it survives a reload and a change of page.
   */
  currentUser: EmbeddedWalletUser | null;
  /** Re-ask the server. Returns null once the session is no longer valid. */
  getCurrentUser: () => Promise<EmbeddedWalletUser | null>;
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
  const [currentUser, setCurrentUser] = useState<EmbeddedWalletUser | null>(null);
  // Read inside getCurrentUser without making it depend on `wallets`, which
  // would rebuild the callback on every balance refresh and re-fire the
  // mount effect that calls it.
  const walletsRef = useRef<WalletInfo[]>([]);
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

  const getEffectiveSpendPolicy = useCallback(
    () => client.getEffectiveSpendPolicy(),
    [client],
  );

  /**
   * Identity for the current session.
   *
   * Login hands back the user once; nothing re-derived it afterwards, so a
   * reload left the provider authenticated but anonymous and every
   * integrator wrote their own cache. Asked of the server rather than
   * stored, so a revoked session resolves to null instead of to a stale
   * name.
   */
  const getCurrentUser = useCallback(async (): Promise<EmbeddedWalletUser | null> => {
    const me = await client.getCurrentUser();
    if (!me) {
      setCurrentUser(null);
      return null;
    }
    // The wallet address is not part of the identity response; take it from
    // whichever wallet is already loaded, and leave it undefined rather than
    // fetching — callers who need it have `wallets`.
    const user: EmbeddedWalletUser = {
      userId: me.id,
      email: me.email,
      walletAddress: walletsRef.current[0]?.address,
      isNewUser: false,
      isPasswordless: false,
    };
    setCurrentUser(user);
    return user;
  }, [client]);

  const loginWithEmailOtp = useCallback(
    async (email: string, code: string, chains?: string[]): Promise<SocialLoginResult> => {
      const result = await client.verifyEmailOtp(email, code, chains);
      if (result.token) persistToken(result.token);
      setCurrentUser({
        userId: result.user_id,
        email: result.email,
        walletAddress: result.wallet_address,
        isNewUser: result.is_new_user,
        isPasswordless: true,
      });
      return result;
    },
    [client, persistToken]
  );

  const loginWithSocial = useCallback(
    async (provider: string, idToken: string, chains?: string[], redirectUri?: string): Promise<SocialLoginResult> => {
      const result = await client.socialLogin(provider, idToken, chains, redirectUri);
      if (result.token) persistToken(result.token);
      setCurrentUser({
        userId: result.user_id,
        email: result.email,
        walletAddress: result.wallet_address,
        isNewUser: result.is_new_user,
        isPasswordless: true,
      });
      return result;
    },
    [client, persistToken]
  );

  const logout = useCallback(() => {
    client.clearToken();
    persistToken(null);
    setWallets([]);
    setBalances({});
    setCurrentUser(null);
  }, [client, persistToken]);

  useEffect(() => {
    walletsRef.current = wallets;
  }, [wallets]);

  useEffect(() => {
    if (client.isAuthenticated) {
      refreshWallets();
      // Rehydrate identity on mount. Without this a reload leaves
      // currentUser null while the session is perfectly valid.
      void getCurrentUser();
    } else {
      setLoading(false);
    }
  }, [refreshWallets, client, getCurrentUser]);

  return (
    <WalletContext.Provider
      value={{ wallets, balances, loading, error, refreshWallets, refreshBalance, generateWallets, send, swap, getEffectiveAuthPolicy, getEffectiveSpendPolicy, currentUser, getCurrentUser, registerPasskey, client, loginWithEmailOtp, loginWithSocial, logout }}
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
