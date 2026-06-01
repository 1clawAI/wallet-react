import React, { useState, useEffect } from "react";
import { OneclawWalletProvider, useOneclawWallet } from "./context";
import type { OneclawTreasuryWidgetProps, SendTransactionResult, SwapResult } from "./types";

type View = "list" | "send" | "swap" | "receive";

function WalletContent({
  chains,
  onError,
  onTransactionSent,
  onSwapCompleted,
  className,
}: Pick<OneclawTreasuryWidgetProps, "chains" | "onError" | "onTransactionSent" | "onSwapCompleted" | "className">) {
  const { wallets, balances, loading, error, refreshBalance, generateWallets, send, swap } = useOneclawWallet();
  const [selectedChain, setSelectedChain] = useState<string | null>(null);
  const [view, setView] = useState<View>("list");

  // Send form state
  const [sendTo, setSendTo] = useState("");
  const [sendAmount, setSendAmount] = useState("");
  const [sendPassword, setSendPassword] = useState("");
  const [sendGasless, setSendGasless] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<SendTransactionResult | null>(null);

  // Swap form state
  const [sellToken, setSellToken] = useState("");
  const [buyToken, setBuyToken] = useState("");
  const [sellAmount, setSellAmount] = useState("");
  const [swapPassword, setSwapPassword] = useState("");
  const [swapping, setSwapping] = useState(false);
  const [swapResult, setSwapResult] = useState<SwapResult | null>(null);

  // Error display
  const [actionError, setActionError] = useState<string | null>(null);

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

  const handleSend = async () => {
    if (!selectedChain || !sendTo || !sendAmount || !sendPassword) return;
    setSending(true);
    setActionError(null);
    try {
      const weiAmount = (parseFloat(sendAmount) * 1e18).toFixed(0);
      const result = await send({
        chain: selectedChain,
        to: sendTo,
        valueWei: weiAmount,
        password: sendPassword,
        gasless: sendGasless || undefined,
      });
      setSendResult(result);
      onTransactionSent?.(result);
      refreshBalance(selectedChain);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : String(e));
    } finally {
      setSending(false);
    }
  };

  const handleSwap = async () => {
    if (!selectedChain || !sellToken || !buyToken || !sellAmount || !swapPassword) return;
    setSwapping(true);
    setActionError(null);
    try {
      const result = await swap({
        chain: selectedChain,
        sellToken,
        buyToken,
        sellAmount,
        password: swapPassword,
      });
      setSwapResult(result);
      onSwapCompleted?.(result);
      refreshBalance(selectedChain);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : String(e));
    } finally {
      setSwapping(false);
    }
  };

  const resetForms = () => {
    setSendTo(""); setSendAmount(""); setSendPassword(""); setSendGasless(false);
    setSellToken(""); setBuyToken(""); setSellAmount(""); setSwapPassword("");
    setSendResult(null); setSwapResult(null); setActionError(null);
  };

  const goBack = () => { resetForms(); setView("list"); };

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
          <button style={styles.button} onClick={() => generateWallets(chains)}>
            Generate Wallets
          </button>
        </div>
      </div>
    );
  }

  const selectedWallet = wallets.find(w => w.chain === selectedChain);

  // Send view
  if (view === "send" && selectedChain) {
    return (
      <div className={className} style={styles.container}>
        <div style={styles.viewHeader}>
          <button style={styles.backBtn} onClick={goBack}>&larr;</button>
          <h3 style={styles.title}>Send ({selectedChain})</h3>
        </div>
        {sendResult ? (
          <div style={styles.resultBox}>
            <p style={styles.successText}>Transaction sent!</p>
            <p style={styles.mono}>Hash: {sendResult.txHash.slice(0, 10)}...</p>
            <p>Status: {sendResult.status}</p>
            <button style={styles.button} onClick={goBack}>Done</button>
          </div>
        ) : (
          <div style={styles.form}>
            <input style={styles.input} placeholder="Recipient address (0x...)" value={sendTo} onChange={e => setSendTo(e.target.value)} />
            <input style={styles.input} placeholder="Amount (ETH)" type="number" step="0.0001" value={sendAmount} onChange={e => setSendAmount(e.target.value)} />
            <input style={styles.input} placeholder="Password" type="password" value={sendPassword} onChange={e => setSendPassword(e.target.value)} />
            <label style={styles.checkLabel}>
              <input type="checkbox" checked={sendGasless} onChange={e => setSendGasless(e.target.checked)} />
              <span style={{ marginLeft: 6 }}>Gasless (sponsored)</span>
            </label>
            {actionError && <p style={styles.errorText}>{actionError}</p>}
            <button style={styles.button} onClick={handleSend} disabled={sending}>
              {sending ? "Sending..." : "Send"}
            </button>
          </div>
        )}
      </div>
    );
  }

  // Swap view
  if (view === "swap" && selectedChain) {
    return (
      <div className={className} style={styles.container}>
        <div style={styles.viewHeader}>
          <button style={styles.backBtn} onClick={goBack}>&larr;</button>
          <h3 style={styles.title}>Swap ({selectedChain})</h3>
        </div>
        {swapResult ? (
          <div style={styles.resultBox}>
            <p style={styles.successText}>Swap executed!</p>
            <p style={styles.mono}>Hash: {swapResult.txHash.slice(0, 10)}...</p>
            <p>Bought: {swapResult.buyAmount}</p>
            <button style={styles.button} onClick={goBack}>Done</button>
          </div>
        ) : (
          <div style={styles.form}>
            <input style={styles.input} placeholder="Sell token (address or symbol)" value={sellToken} onChange={e => setSellToken(e.target.value)} />
            <input style={styles.input} placeholder="Buy token (address or symbol)" value={buyToken} onChange={e => setBuyToken(e.target.value)} />
            <input style={styles.input} placeholder="Sell amount (raw)" value={sellAmount} onChange={e => setSellAmount(e.target.value)} />
            <input style={styles.input} placeholder="Password" type="password" value={swapPassword} onChange={e => setSwapPassword(e.target.value)} />
            {actionError && <p style={styles.errorText}>{actionError}</p>}
            <button style={styles.button} onClick={handleSwap} disabled={swapping}>
              {swapping ? "Swapping..." : "Swap"}
            </button>
          </div>
        )}
      </div>
    );
  }

  // Receive view
  if (view === "receive" && selectedWallet) {
    return (
      <div className={className} style={styles.container}>
        <div style={styles.viewHeader}>
          <button style={styles.backBtn} onClick={goBack}>&larr;</button>
          <h3 style={styles.title}>Receive ({selectedChain})</h3>
        </div>
        <div style={styles.receiveBox}>
          <p style={{ fontSize: 13, color: "#64748b", marginBottom: 8 }}>
            Send tokens to this address on {selectedChain}:
          </p>
          <div style={styles.addressFull}>{selectedWallet.address}</div>
          <button
            style={styles.button}
            onClick={() => navigator.clipboard?.writeText(selectedWallet.address)}
          >
            Copy Address
          </button>
        </div>
      </div>
    );
  }

  // Wallet list view (default)
  return (
    <div className={className} style={styles.container}>
      <div style={styles.header}>
        <h3 style={styles.title}>Treasury Wallets</h3>
      </div>
      <div style={styles.walletList}>
        {wallets.map((w) => {
          const bal = balances[w.chain];
          const isSelected = selectedChain === w.chain;
          return (
            <div key={w.id}>
              <div
                style={{ ...styles.walletCard, ...(isSelected ? styles.walletCardSelected : {}) }}
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
              {isSelected && (
                <div style={styles.actions}>
                  <button style={styles.actionBtn} onClick={() => setView("send")}>Send</button>
                  <button style={styles.actionBtn} onClick={() => setView("receive")}>Receive</button>
                  <button style={styles.actionBtn} onClick={() => setView("swap")}>Swap</button>
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
  onSwapCompleted,
  className,
}: OneclawTreasuryWidgetProps) {
  return (
    <OneclawWalletProvider apiKey={apiKey} baseUrl={baseUrl}>
      <WalletContent
        chains={chains}
        onError={onError}
        onTransactionSent={onTransactionSent}
        onSwapCompleted={onSwapCompleted}
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
  viewHeader: { display: "flex", alignItems: "center", gap: 8, marginBottom: 12 },
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
    width: "100%",
  },
  backBtn: {
    background: "none",
    border: "1px solid #e2e8f0",
    borderRadius: 6,
    padding: "4px 10px",
    cursor: "pointer",
    fontSize: 16,
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
  actions: { display: "flex", gap: 6, padding: "8px 0" },
  actionBtn: {
    flex: 1,
    padding: "6px 12px",
    borderRadius: 6,
    border: "1px solid #e2e8f0",
    background: "#f8fafc",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 500,
  },
  form: { display: "flex", flexDirection: "column" as const, gap: 10 },
  input: {
    padding: "8px 12px",
    borderRadius: 8,
    border: "1px solid #e2e8f0",
    fontSize: 14,
    outline: "none",
  },
  checkLabel: { display: "flex", alignItems: "center", fontSize: 13, color: "#475569" },
  errorText: { color: "#dc2626", fontSize: 13, margin: 0 },
  successText: { color: "#16a34a", fontWeight: 600, fontSize: 14 },
  resultBox: { textAlign: "center" as const, padding: 12 },
  mono: { fontFamily: "monospace", fontSize: 12, color: "#475569", wordBreak: "break-all" as const },
  receiveBox: { textAlign: "center" as const, padding: 16 },
  addressFull: {
    fontFamily: "monospace",
    fontSize: 12,
    padding: 12,
    background: "#f8fafc",
    borderRadius: 8,
    wordBreak: "break-all" as const,
    marginBottom: 12,
  },
};
