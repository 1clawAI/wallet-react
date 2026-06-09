import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { OneclawWalletClient } from "./client";
import type { WalletInfo, WalletBalance, SendTransactionParams, SendTransactionResult, SwapParams, SwapResult } from "./types";

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
}

const WalletContext = createContext<WalletContextValue | null>(null);

interface ProviderProps {
  apiKey: string;
  baseUrl?: string;
  children: React.ReactNode;
}

export function OneclawWalletProvider({ apiKey, baseUrl, children }: ProviderProps) {
  // SEC-013: Warn if human/platform keys are used in client-side code
  if (apiKey.startsWith("1ck_") || apiKey.startsWith("plt_")) {
    console.error(
      "[1claw/wallet-react] SECURITY: Do not embed human (1ck_) or platform (plt_) API keys in client-side code. Use a session token or embedded wallet flow instead.",
    );
  }

  const client = useMemo(() => new OneclawWalletClient(apiKey, baseUrl), [apiKey, baseUrl]);
  const [wallets, setWallets] = useState<WalletInfo[]>([]);
  const [balances, setBalances] = useState<Record<string, WalletBalance>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

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

  useEffect(() => {
    refreshWallets();
  }, [refreshWallets]);

  return (
    <WalletContext.Provider
      value={{ wallets, balances, loading, error, refreshWallets, refreshBalance, generateWallets, send, swap }}
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
