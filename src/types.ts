export interface OneclawTreasuryWidgetProps {
  apiKey: string;
  baseUrl?: string;
  chains?: string[];
  theme?: "light" | "dark" | "auto";
  onError?: (error: Error) => void;
  onTransactionSent?: (result: SendTransactionResult) => void;
  onSwapCompleted?: (result: SwapResult) => void;
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
  gasless?: boolean;
}

export interface SendTransactionResult {
  txHash: string;
  from: string;
  to: string;
  valueWei: string;
  chain: string;
  status: string;
  userOpHash?: string;
}

export interface SwapParams {
  chain: string;
  sellToken: string;
  buyToken: string;
  sellAmount: string;
  password: string;
}

export interface SwapResult {
  txHash: string;
  sellToken: string;
  buyToken: string;
  sellAmount: string;
  buyAmount: string;
  chain: string;
  status: string;
}

export interface OneclawEmbeddedWalletProps {
  appId: string;
  baseUrl?: string;
  theme?: "light" | "dark" | "auto";
  chains?: string[];
  features?: {
    send?: boolean;
    swap?: boolean;
    buy?: boolean;
    receive?: boolean;
    history?: boolean;
  };
  socialProviders?: ("google" | "apple" | "discord")[];
  onLogin?: (user: EmbeddedWalletUser) => void;
  onLogout?: () => void;
  onLinkRequired?: (authorizeUrl: string, appSlug: string) => void;
  onTransactionSent?: (result: SendTransactionResult) => void;
  onSwapCompleted?: (result: SwapResult) => void;
  onError?: (error: Error) => void;
  className?: string;
}

export interface EmbeddedWalletUser {
  userId: string;
  email: string;
  walletAddress?: string;
  isNewUser: boolean;
}

export interface SocialLoginParams {
  provider: "google" | "apple" | "discord";
  idToken: string;
  autoProvisionChains?: string[];
}

export interface SocialLoginResult {
  token: string;
  user_id: string;
  org_id: string;
  is_new_user: boolean;
  email: string;
  wallet_address?: string;
}

export interface PasskeyTxAuthResult {
  passkey_token: string;
  expires_in: number;
}

export interface FiatOnrampSession {
  session_url: string;
  provider: string;
  destination_address: string;
  chain: string;
  asset: string;
}
