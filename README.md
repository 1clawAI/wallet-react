# @1claw/wallet-react

React components for embedding 1Claw treasury wallets in your app.

Built for platform developers using the 1Claw Platform API (`plt_` keys). Your users get multi-chain wallets, send/swap/receive flows, social login, email OTP, and passkey transaction auth without you running wallet infrastructure or storing private keys.

Drop in `<OneclawEmbeddedWallet />` for a full login and dashboard experience, or `<OneclawTreasuryWidget />` for send/swap/receive on specific chains. Spend policies and per-user limits are enforced server-side through the Platform API.

## Installation

```bash
npm install @1claw/wallet-react
```

## Quick Start

```tsx
import { OneclawTreasuryWidget } from "@1claw/wallet-react";

function App() {
  return (
    <OneclawTreasuryWidget
      apiKey="plt_your_platform_api_key"
      chains={["ethereum", "base"]}
      onTransactionSent={(tx) => console.log("Sent:", tx.txHash)}
      onError={(err) => console.error(err)}
    />
  );
}
```

## Components

### `<OneclawEmbeddedWallet />` (v0.3.0)

Full embedded wallet with social login, email OTP login, Send/Swap/Receive/Buy views:

```tsx
import { OneclawEmbeddedWallet } from "@1claw/wallet-react";

function App() {
  return (
    <OneclawEmbeddedWallet
      appId="your-platform-slug"
      socialProviders={["google", "apple"]}
      features={{ send: true, swap: true, buy: true, receive: true }}
      onLogin={(user) => console.log(user.walletAddress)}
    />
  );
}
```

**Authentication methods:**
- **Social login** — Google/Apple via `POST /v1/auth/social-login`.
- **Email OTP** — Passwordless login via `sendEmailOtp(email)` and `verifyEmailOtp(email, code)`. Uses `POST /v1/auth/email-otp/send` and `POST /v1/auth/email-otp/verify`.
- **Passkey transaction auth** — `tx-assert` endpoints; sends can use `X-Passkey-Token` instead of password.

### `<OneclawTreasuryWidget />`

All-in-one widget that displays wallet balances and allows transfers.

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `apiKey` | `string` | Yes | Platform API key (`plt_...`) |
| `baseUrl` | `string` | No | API base URL (default: `https://api.1claw.xyz`) |
| `chains` | `string[]` | No | Chains to generate wallets for |
| `theme` | `"light" \| "dark" \| "auto"` | No | Color theme |
| `onError` | `(error: Error) => void` | No | Error callback |
| `onTransactionSent` | `(result) => void` | No | Send success callback |
| `onSwapCompleted` | `(result) => void` | No | Swap success callback |
| `className` | `string` | No | CSS class for outer container |

### `<OneclawWalletProvider />`

Lower-level provider for building custom UI:

```tsx
import { OneclawWalletProvider, useOneclawWallet } from "@1claw/wallet-react";

function CustomWalletUI() {
  const { wallets, balances, send, swap, refreshBalance } = useOneclawWallet();
  // Build your own UI...
}

function App() {
  return (
    <OneclawWalletProvider apiKey="plt_...">
      <CustomWalletUI />
    </OneclawWalletProvider>
  );
}
```

## Hooks

### `useOneclawWallet()`

Returns:

| Field | Type | Description |
|-------|------|-------------|
| `wallets` | `WalletInfo[]` | Active wallets |
| `balances` | `Record<string, WalletBalance>` | Cached balances by chain |
| `loading` | `boolean` | Initial load state |
| `error` | `Error \| null` | Last error |
| `refreshWallets()` | `() => Promise<void>` | Refetch wallet list |
| `refreshBalance(chain)` | `(chain: string) => Promise<WalletBalance>` | Fetch balance |
| `generateWallets(chains?)` | `(chains?: string[]) => Promise<WalletInfo[]>` | Generate new wallets |
| `send(params)` | `(params: SendTransactionParams) => Promise<SendTransactionResult>` | Send a transaction |
| `swap(params)` | `(params: SwapParams) => Promise<SwapResult>` | Swap tokens via DEX aggregator |
| `sendEmailOtp(email)` | `(email: string) => Promise<{ status: string }>` | Send a one-time passcode for email login |
| `verifyEmailOtp(email, code)` | `(email: string, code: string) => Promise<SocialLoginResult>` | Verify OTP and authenticate |

## Security

- The `apiKey` is a Platform API key, not a user key — it inherits platform custody guarantees.
- Sends require password re-authentication via the `password` field in `SendTransactionParams`, or a passkey token from `completePasskeyTxAuth()` via `sendWithPasskey()`.
- Gasless sends (`gasless: true` in `SendTransactionParams`) use an ERC-4337 paymaster to sponsor gas — the user pays no gas fees.
- Swaps route through a DEX aggregator (0x API) and also require password re-authentication.
- The widget never stores or caches private keys client-side.
