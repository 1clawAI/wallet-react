import React, { useState, useEffect } from "react";
import { OneclawWalletProvider, useOneclawWallet } from "./context";
import type { OneclawTreasuryWidgetProps } from "./types";

function WalletContent({
  chains,
  onError,
  onTransactionSent,
  className,
}: Pick<OneclawTreasuryWidgetProps, "chains" | "onError" | "onTransactionSent" | "className">) {
  const { wallets, balances, loading, error, refreshBalance, generateWallets } = useOneclawWallet();
  const [selectedChain, setSelectedChain] = useState<string | null>(null);

  useEffect(() => {
    if (error && onError) onError(error);
  }, [error, onError]);

  useEffect(() => {
    if (wallets.length === 0 && !loading && chains) {
      generateWallets(chains).catch(() => {});
    }
  }, [wallets.length, loading, chains, generateWallets]);

  useEffect(() => {
    for (const w of wallets) {
      if (!balances[w.chain]) {
        refreshBalance(w.chain);
      }
    }
  }, [wallets, balances, refreshBalance]);

  if (loading) {
    return (
      <div className={className} style={styles.container}>
        <div style={styles.loading}>Loading wallets...</div>
      </div>
    );
  }

  if (wallets.length === 0) {
    return (
      <div className={className} style={styles.container}>
        <div style={styles.empty}>
          <p>No wallets found.</p>
          <button
            style={styles.button}
            onClick={() => generateWallets(chains)}
          >
            Generate Wallets
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={className} style={styles.container}>
      <div style={styles.header}>
        <h3 style={styles.title}>Treasury Wallets</h3>
      </div>
      <div style={styles.walletList}>
        {wallets.map((w) => {
          const bal = balances[w.chain];
          return (
            <div
              key={w.id}
              style={{
                ...styles.walletCard,
                ...(selectedChain === w.chain ? styles.walletCardSelected : {}),
              }}
              onClick={() => setSelectedChain(w.chain === selectedChain ? null : w.chain)}
            >
              <div style={styles.chainBadge}>{w.chain}</div>
              <div style={styles.address} title={w.address}>
                {w.address.slice(0, 6)}...{w.address.slice(-4)}
              </div>
              {bal && (
                <div style={styles.balance}>
                  {bal.native.balanceDisplay} {bal.native.symbol}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function OneclawTreasuryWidget({
  apiKey,
  baseUrl,
  chains,
  theme = "light",
  onError,
  onTransactionSent,
  className,
}: OneclawTreasuryWidgetProps) {
  return (
    <OneclawWalletProvider apiKey={apiKey} baseUrl={baseUrl}>
      <WalletContent
        chains={chains}
        onError={onError}
        onTransactionSent={onTransactionSent}
        className={className}
      />
    </OneclawWalletProvider>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    borderRadius: 12,
    border: "1px solid #e2e8f0",
    padding: 16,
    maxWidth: 400,
  },
  header: { marginBottom: 12 },
  title: { margin: 0, fontSize: 16, fontWeight: 600 },
  loading: { textAlign: "center" as const, padding: 24, color: "#64748b" },
  empty: { textAlign: "center" as const, padding: 24 },
  button: {
    marginTop: 8,
    padding: "8px 16px",
    borderRadius: 8,
    border: "none",
    background: "#0f172a",
    color: "#fff",
    cursor: "pointer",
    fontSize: 14,
  },
  walletList: { display: "flex", flexDirection: "column" as const, gap: 8 },
  walletCard: {
    padding: 12,
    borderRadius: 8,
    border: "1px solid #e2e8f0",
    cursor: "pointer",
    transition: "border-color 0.15s",
  },
  walletCardSelected: { borderColor: "#3b82f6" },
  chainBadge: {
    display: "inline-block",
    padding: "2px 8px",
    borderRadius: 4,
    background: "#f1f5f9",
    fontSize: 12,
    fontWeight: 600,
    textTransform: "uppercase" as const,
    marginBottom: 4,
  },
  address: { fontSize: 13, fontFamily: "monospace", color: "#475569" },
  balance: { marginTop: 4, fontSize: 14, fontWeight: 500 },
};
