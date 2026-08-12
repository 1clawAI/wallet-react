"use client";

import React, { useEffect } from "react";
import type { OneclawTreasuryWidgetProps } from "./types";
import { OneclawWalletProvider, useOneclawWallet } from "./context";
import { injectThemeStyles } from "./theme";

function TreasuryWidgetInner({
  theme = "auto",
  brandColor,
  onError,
  onTransactionSent,
  onSwapCompleted,
  className,
}: Omit<OneclawTreasuryWidgetProps, "apiKey" | "baseUrl" | "chains">) {
  const { wallets, balances, loading, error, refreshBalance } = useOneclawWallet();

  useEffect(() => {
    injectThemeStyles(theme === "auto" ? "auto" : theme, brandColor);
  }, [theme, brandColor]);

  useEffect(() => {
    if (error) onError?.(error);
  }, [error, onError]);

  const themeClass =
    theme === "dark"
      ? "ocw-dark"
      : theme === "light"
        ? "ocw-light"
        : "ocw-auto";

  return (
    <div className={`ocw-embedded-wallet ${themeClass} ${className || ""}`}>
      <div className="ocw-balances">
        {loading ? (
          <>
            {[0, 1].map((i) => (
              <div key={i} className="ocw-skeleton-row">
                <div className="ocw-skeleton-block" style={{ width: "70px" }} />
                <div className="ocw-skeleton-block" style={{ width: "100px" }} />
              </div>
            ))}
          </>
        ) : wallets.length > 0 ? (
          wallets.map((w) => {
            const bal = balances[w.chain];
            return (
              <div key={w.chain} className="ocw-balance-row">
                <span className="ocw-chain-name">{w.chain}</span>
                <span className="ocw-balance-value">
                  {bal ? `${bal.native.balanceDisplay} ${bal.native.symbol}` : "—"}
                </span>
              </div>
            );
          })
        ) : (
          <p className="ocw-empty">No wallets</p>
        )}
      </div>
    </div>
  );
}

export function OneclawTreasuryWidget(props: OneclawTreasuryWidgetProps) {
  return (
    <OneclawWalletProvider apiKey={props.apiKey} baseUrl={props.baseUrl}>
      <TreasuryWidgetInner
        theme={props.theme}
        brandColor={props.brandColor}
        onError={props.onError}
        onTransactionSent={props.onTransactionSent}
        onSwapCompleted={props.onSwapCompleted}
        className={props.className}
      />
    </OneclawWalletProvider>
  );
}
