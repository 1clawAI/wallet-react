# @1claw/wallet-react

React components for embedding 1Claw treasury wallets in your app.

Built for platform developers using the 1Claw Platform API (`plt_` keys). Your users get multi-chain wallets, send/swap/receive flows, social login, email OTP, and passkey transaction auth without you running wallet infrastructure or storing private keys.

## Installation

```bash
npm install @1claw/wallet-react
```

## Quick Start

```tsx
import { OneclawEmbeddedWallet } from "@1claw/wallet-react";

function App() {
  return (
    <OneclawEmbeddedWallet
      appId="your-platform-slug"
      socialProviders={["google", "apple"]}
      socialProviderConfig={{
        google: { clientId: "your-google-client-id" },
      }}
      features={{ send: true, swap: true, buy: true, receive: true }}
      onLogin={(user) => console.log(user.walletAddress)}
    />
  );
}
```

## Components

### `<OneclawEmbeddedWallet />`

Full embedded wallet with social login, email OTP login, Send/Swap/Receive/Buy views. Internally wraps itself in `<OneclawWalletProvider>`.

**v0.55 note:** Graduated HITL and extended transaction guardrails (`tx_approval_policy`, org freeze, etc.) are configured on **agents** via the Vault API / dashboard — not on embedded wallet send/swap flows. No API surface changes required for `@1claw/wallet-react` in this release.

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `appId` | `string` | Yes | Platform app slug |
| `baseUrl` | `string` | No | API base URL (default: `https://api.1claw.xyz`) |
| `theme` | `"light" \| "dark" \| "auto"` | No | Color theme |
| `brandColor` | `string` | No | Primary brand color hex |
| `chains` | `string[]` | No | Chains to provision wallets for |
| `features` | `{ send?, swap?, buy?, receive? }` | No | Toggle features |
| `socialProviders` | `("google" \| "apple" \| "discord")[]` | No | Enabled social login providers |
| `socialProviderConfig` | `SocialProviderConfig` | No | OAuth client IDs per provider |
| `persistSession` | `"session" \| "local" \| false` | No | Token persistence strategy (default: `"session"`) |
| `onLogin` | `(user) => void` | No | Login success callback |
| `onLogout` | `() => void` | No | Logout callback |
| `onTransactionSent` | `(result) => void` | No | Send success callback |
| `onSwapCompleted` | `(result) => void` | No | Swap success callback |
| `onError` | `(error: Error) => void` | No | Error callback |

### `<OneclawTreasuryWidget />`

Read-only balance widget. Displays wallet balances for each chain, fetched on mount.

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `apiKey` | `string` | Yes | Platform API key (`plt_...`) or session token |
| `baseUrl` | `string` | No | API base URL (default: `https://api.1claw.xyz`) |
| `theme` | `"light" \| "dark" \| "auto"` | No | Color theme |
| `onError` | `(error: Error) => void` | No | Error callback |
| `className` | `string` | No | CSS class for outer container |

> **Note:** `onTransactionSent` and `onSwapCompleted` props are accepted but not currently wired to any UI within TreasuryWidget. Use `<OneclawEmbeddedWallet>` for full send/swap functionality.

### `<OneclawWalletProvider />`

Lower-level provider for building custom UI:

```tsx
import { OneclawWalletProvider, useOneclawWallet } from "@1claw/wallet-react";

function CustomWalletUI() {
  const { wallets, balances, send, swap, refreshBalance, loginWithEmailOtp, logout } = useOneclawWallet();
  // Build your own UI...
}

function App() {
  return (
    <OneclawWalletProvider apiKey="plt_..." appId="your-slug" persistSession="session">
      <CustomWalletUI />
    </OneclawWalletProvider>
  );
}
```

### `<SignInWith1Claw />`

Drop-in "Sign in with 1Claw" OAuth button:

```tsx
import { SignInWith1Claw, handleSignInCallback } from "@1claw/wallet-react/oauth";

function LoginPage() {
  return (
    <SignInWith1Claw
      clientId="your-app-slug"
      redirectUri="https://yourapp.com/auth/callback"
      authorizeBaseUrl="https://1claw.xyz"
      apiBaseUrl="https://api.1claw.xyz"
    />
  );
}

// On your callback page:
const tokens = await handleSignInCallback({
  code: urlParams.get("code")!,
  state: urlParams.get("state")!,
  clientId: "your-app-slug",
  redirectUri: "https://yourapp.com/auth/callback",
  apiBaseUrl: "https://api.1claw.xyz",
});
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
| `client` | `OneclawWalletClient` | Underlying API client |
| `refreshWallets()` | `() => Promise<void>` | Refetch wallet list |
| `refreshBalance(chain)` | `(chain: string) => Promise<WalletBalance \| null>` | Fetch balance |
| `generateWallets(chains?)` | `(chains?: string[]) => Promise<WalletInfo[]>` | Generate new wallets |
| `send(params)` | `(params) => Promise<SendTransactionResult>` | Send a transaction |
| `swap(params)` | `(params) => Promise<SwapResult>` | Swap tokens via DEX aggregator |
| `loginWithEmailOtp(email, code, chains?)` | `(...) => Promise<SocialLoginResult>` | Verify OTP and authenticate |
| `loginWithSocial(provider, idToken, chains?, redirectUri?)` | `(...) => Promise<SocialLoginResult>` | Social login |
| `logout()` | `() => void` | Clear token and reset state |

## Theming

The widget uses CSS custom properties scoped to `.ocw-embedded-wallet`. You can customize the theme via:

1. **Props** — `theme` and `brandColor` on the component
2. **`ThemeConfig`** — Pass a full config to `buildRootStyle()` for per-instance scoping:

```ts
import { buildRootStyle } from "@1claw/wallet-react";

const style = buildRootStyle("dark", {
  brandColor: "#8b5cf6",
  borderRadius: "16px",
  fontFamily: "Inter, sans-serif",
  cssVars: { "--ocw-bg": "#1a1a2e" },
});
```

## Next.js App Router

This library does not include `"use client"` directives. If you're using Next.js App Router, wrap the component in your own client boundary:

```tsx
"use client";
import { OneclawEmbeddedWallet } from "@1claw/wallet-react";
export default function WalletPage() {
  return <OneclawEmbeddedWallet appId="..." />;
}
```

## Passkey enrollment (passwordless / HFA)

Social and email-OTP users often have no password. When your platform spend policy sets `passkey_only` for send/swap, users must register a passkey before transacting:

```tsx
const { registerPasskey, getEffectiveAuthPolicy, send } = useOneclawWallet();

const auth = await getEffectiveAuthPolicy();
if (auth.registered_passkeys === 0 && auth.policy.send === "passkey_only") {
  await registerPasskey("My device");
}

// send() auto-routes to passkey tx-assert when policy requires it
await send({ chain: "ethereum", to: "0x...", valueWei: "1000000000000000" });
```

Backend endpoints: `POST /v1/auth/passkeys/register/begin|complete`, `GET /v1/treasury/wallets/auth-policy`.

## Security

- The `apiKey` is a Platform API key, not a user key — it inherits platform custody guarantees.
- Sends require password re-authentication or a passkey token.
- The widget never stores or caches private keys client-side.
- Session tokens are stored in `sessionStorage` by default (configurable via `persistSession`).

## Subpath Exports

```ts
import { OneclawWalletClient } from "@1claw/wallet-react/client";
import { SignInWith1Claw } from "@1claw/wallet-react/oauth";
```
