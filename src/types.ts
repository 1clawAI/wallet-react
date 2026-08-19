export type WalletErrorCode =
  | "network_error"
  | "auth_error"
  | "insufficient_balance"
  | "rate_limited"
  | "validation_error"
  | "unknown_error";

export interface WalletError {
  code: WalletErrorCode;
  message: string;
  detail?: string;
}

export interface OneclawTreasuryWidgetProps {
  apiKey: string;
  baseUrl?: string;
  chains?: string[];
  theme?: "light" | "dark" | "auto";
  brandColor?: string;
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
  password?: string;
  passkeyToken?: string;
  gasless?: boolean;
}

export type AuthMethod = "password" | "passkey";

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
  password?: string;
  passkeyToken?: string;
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

export interface SocialProviderConfig {
  google?: { clientId: string };
  apple?: { clientId: string; redirectUri: string };
  discord?: { clientId: string; redirectUri: string };
}

export interface ThemeConfig {
  mode?: "light" | "dark" | "auto";
  brandColor?: string;
  borderRadius?: string;
  fontFamily?: string;
  cssVars?: Record<string, string>;
}

export interface OneclawEmbeddedWalletProps {
  appId: string;
  baseUrl?: string;
  theme?: "light" | "dark" | "auto";
  brandColor?: string;
  chains?: string[];
  features?: {
    send?: boolean;
    swap?: boolean;
    buy?: boolean;
    receive?: boolean;
  };
  socialProviders?: ("google" | "apple" | "discord")[];
  socialProviderConfig?: SocialProviderConfig;
  persistSession?: "session" | "local" | false;
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
  isPasswordless: boolean;
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
