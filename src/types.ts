export interface OneclawTreasuryWidgetProps {
  apiKey: string;
  baseUrl?: string;
  chains?: string[];
  theme?: "light" | "dark" | "auto";
  onError?: (error: Error) => void;
  onTransactionSent?: (result: SendTransactionResult) => void;
  className?: string;
}

export interface WalletInfo {
  id: string;
  chain: string;
  address: string;
  publicKeyHex: string;
  isActive: boolean;
  createdAt: string;
}

export interface NativeBalance {
  symbol: string;
  balanceWei: string;
  balanceDisplay: string;
}

export interface TokenBalance {
  contractAddress: string;
  balanceRaw: string;
}

export interface WalletBalance {
  chain: string;
  address: string;
  native: NativeBalance;
  tokens: TokenBalance[];
}

export interface SendTransactionParams {
  chain: string;
  to: string;
  valueWei: string;
  data?: string;
  password: string;
}

export interface SendTransactionResult {
  txHash: string;
  from: string;
  to: string;
  valueWei: string;
  chain: string;
  status: string;
}
