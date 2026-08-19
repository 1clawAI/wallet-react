import type { ThemeConfig } from "./types";

type CSSProperties = Record<string, string | number>;

function hexToRgb(hex: string): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `${r}, ${g}, ${b}`;
}

const STYLE_ID = "ocw-base-styles";

export interface ThemeVars {
  [key: string]: string;
}

export function resolveThemeVars(config?: ThemeConfig): ThemeVars {
  const brand = config?.brandColor || "#6366f1";
  const brandRgb = hexToRgb(brand);
  const radius = config?.borderRadius || "12px";
  const radiusSm = config?.borderRadius
    ? `calc(${config.borderRadius} - 4px)`
    : "8px";
  const font =
    config?.fontFamily ||
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

  const vars: ThemeVars = {
    "--ocw-brand": brand,
    "--ocw-brand-rgb": brandRgb,
    "--ocw-radius": radius,
    "--ocw-radius-sm": radiusSm,
    "--ocw-font": font,
    ...(config?.cssVars || {}),
  };

  return vars;
}

export function buildRootStyle(
  theme: "light" | "dark" | "auto",
  config?: ThemeConfig,
): CSSProperties {
  const vars = resolveThemeVars(config);

  const light: ThemeVars = {
    "--ocw-bg": "#ffffff",
    "--ocw-bg-secondary": "#f9fafb",
    "--ocw-bg-hover": "#f3f4f6",
    "--ocw-text": "#111827",
    "--ocw-text-secondary": "#6b7280",
    "--ocw-text-tertiary": "#9ca3af",
    "--ocw-border": "#e5e7eb",
    "--ocw-border-focus": vars["--ocw-brand"],
    "--ocw-input-bg": "#ffffff",
    "--ocw-error-bg": "#fef2f2",
    "--ocw-error-text": "#dc2626",
    "--ocw-success-bg": "#f0fdf4",
    "--ocw-success-text": "#16a34a",
    "--ocw-skeleton": "#e5e7eb",
    "--ocw-skeleton-shine": "#f3f4f6",
    "--ocw-shadow": "0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)",
  };

  const dark: ThemeVars = {
    "--ocw-bg": "#18181b",
    "--ocw-bg-secondary": "#27272a",
    "--ocw-bg-hover": "#3f3f46",
    "--ocw-text": "#fafafa",
    "--ocw-text-secondary": "#a1a1aa",
    "--ocw-text-tertiary": "#71717a",
    "--ocw-border": "#3f3f46",
    "--ocw-border-focus": vars["--ocw-brand"],
    "--ocw-input-bg": "#27272a",
    "--ocw-error-bg": "#450a0a",
    "--ocw-error-text": "#fca5a5",
    "--ocw-success-bg": "#052e16",
    "--ocw-success-text": "#86efac",
    "--ocw-skeleton": "#3f3f46",
    "--ocw-skeleton-shine": "#52525b",
    "--ocw-shadow": "0 1px 3px rgba(0,0,0,0.3)",
  };

  const resolvedMode = config?.mode || theme;
  const palette = resolvedMode === "dark" ? dark : light;

  return {
    ...vars,
    ...palette,
  } as CSSProperties;
}

/**
 * @deprecated Use `buildRootStyle` for per-instance scoping instead.
 * Kept for backward compatibility with existing integrations that rely on global injection.
 */
export function injectThemeStyles(
  theme: "light" | "dark" | "auto",
  brandColor?: string,
): void {
  if (typeof document === "undefined") return;

  let el = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
  if (!el) {
    el = document.createElement("style");
    el.id = STYLE_ID;
    document.head.appendChild(el);
  }

  const brand = brandColor || "#6366f1";
  const brandRgb = hexToRgb(brand);

  el.textContent = `
/* ── Light tokens ──────────────────────────────────── */
.ocw-embedded-wallet.ocw-light,
.ocw-embedded-wallet.ocw-auto {
  --ocw-brand: ${brand};
  --ocw-brand-rgb: ${brandRgb};
  --ocw-bg: #ffffff;
  --ocw-bg-secondary: #f9fafb;
  --ocw-bg-hover: #f3f4f6;
  --ocw-text: #111827;
  --ocw-text-secondary: #6b7280;
  --ocw-text-tertiary: #9ca3af;
  --ocw-border: #e5e7eb;
  --ocw-border-focus: ${brand};
  --ocw-input-bg: #ffffff;
  --ocw-error-bg: #fef2f2;
  --ocw-error-text: #dc2626;
  --ocw-success-bg: #f0fdf4;
  --ocw-success-text: #16a34a;
  --ocw-skeleton: #e5e7eb;
  --ocw-skeleton-shine: #f3f4f6;
  --ocw-shadow: 0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04);
  --ocw-radius: 12px;
  --ocw-radius-sm: 8px;
  color-scheme: light;
}

/* ── Dark tokens ───────────────────────────────────── */
.ocw-embedded-wallet.ocw-dark {
  --ocw-brand: ${brand};
  --ocw-brand-rgb: ${brandRgb};
  --ocw-bg: #18181b;
  --ocw-bg-secondary: #27272a;
  --ocw-bg-hover: #3f3f46;
  --ocw-text: #fafafa;
  --ocw-text-secondary: #a1a1aa;
  --ocw-text-tertiary: #71717a;
  --ocw-border: #3f3f46;
  --ocw-border-focus: ${brand};
  --ocw-input-bg: #27272a;
  --ocw-error-bg: #450a0a;
  --ocw-error-text: #fca5a5;
  --ocw-success-bg: #052e16;
  --ocw-success-text: #86efac;
  --ocw-skeleton: #3f3f46;
  --ocw-skeleton-shine: #52525b;
  --ocw-shadow: 0 1px 3px rgba(0,0,0,0.3);
  --ocw-radius: 12px;
  --ocw-radius-sm: 8px;
  color-scheme: dark;
}

@media (prefers-color-scheme: dark) {
  .ocw-embedded-wallet.ocw-auto {
    --ocw-bg: #18181b;
    --ocw-bg-secondary: #27272a;
    --ocw-bg-hover: #3f3f46;
    --ocw-text: #fafafa;
    --ocw-text-secondary: #a1a1aa;
    --ocw-text-tertiary: #71717a;
    --ocw-border: #3f3f46;
    --ocw-border-focus: ${brand};
    --ocw-input-bg: #27272a;
    --ocw-error-bg: #450a0a;
    --ocw-error-text: #fca5a5;
    --ocw-success-bg: #052e16;
    --ocw-success-text: #86efac;
    --ocw-skeleton: #3f3f46;
    --ocw-skeleton-shine: #52525b;
    --ocw-shadow: 0 1px 3px rgba(0,0,0,0.3);
    color-scheme: dark;
  }
}

/* ── Base layout ───────────────────────────────────── */
.ocw-embedded-wallet {
  font-family: var(--ocw-font, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif);
  background: var(--ocw-bg);
  color: var(--ocw-text);
  border: 1px solid var(--ocw-border);
  border-radius: var(--ocw-radius);
  box-shadow: var(--ocw-shadow);
  padding: 24px;
  width: 100%;
  max-width: 420px;
  box-sizing: border-box;
  position: relative;
  overflow: hidden;
}

.ocw-embedded-wallet *, .ocw-embedded-wallet *::before, .ocw-embedded-wallet *::after {
  box-sizing: border-box;
}

/* ── Inputs ────────────────────────────────────────── */
.ocw-input {
  width: 100%;
  padding: 10px 14px;
  font-size: 14px;
  line-height: 1.5;
  background: var(--ocw-input-bg);
  color: var(--ocw-text);
  border: 1px solid var(--ocw-border);
  border-radius: var(--ocw-radius-sm);
  outline: none;
  transition: border-color 0.15s, box-shadow 0.15s;
  margin-bottom: 12px;
}
.ocw-input:focus {
  border-color: var(--ocw-border-focus);
  box-shadow: 0 0 0 3px rgba(var(--ocw-brand-rgb), 0.15);
}
.ocw-input:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.ocw-input::placeholder {
  color: var(--ocw-text-tertiary);
}

/* ── Buttons ───────────────────────────────────────── */
.ocw-btn {
  width: 100%;
  padding: 10px 18px;
  font-size: 14px;
  font-weight: 600;
  border: none;
  border-radius: var(--ocw-radius-sm);
  cursor: pointer;
  transition: background 0.15s, opacity 0.15s;
  line-height: 1.5;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}
.ocw-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.ocw-btn-primary {
  background: var(--ocw-brand);
  color: #ffffff;
}
.ocw-btn-primary:hover:not(:disabled) {
  opacity: 0.9;
}

.ocw-btn-secondary {
  background: var(--ocw-bg-secondary);
  color: var(--ocw-text);
  border: 1px solid var(--ocw-border);
}
.ocw-btn-secondary:hover:not(:disabled) {
  background: var(--ocw-bg-hover);
}

.ocw-btn-text {
  background: none;
  border: none;
  color: var(--ocw-text-secondary);
  cursor: pointer;
  padding: 6px 0;
  font-size: 13px;
  text-decoration: underline;
  text-underline-offset: 2px;
}
.ocw-btn-text:hover:not(:disabled) {
  color: var(--ocw-text);
}
.ocw-btn-text:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* ── Social login buttons ─────────────────────────── */
.ocw-btn-social {
  width: 100%;
  padding: 10px 18px;
  font-size: 14px;
  font-weight: 500;
  border: 1px solid var(--ocw-border);
  border-radius: var(--ocw-radius-sm);
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
  background: var(--ocw-bg);
  color: var(--ocw-text);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin-bottom: 8px;
}
.ocw-btn-social:hover:not(:disabled) {
  background: var(--ocw-bg-hover);
  border-color: var(--ocw-text-tertiary);
}
.ocw-btn-social:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* ── Login ─────────────────────────────────────────── */
.ocw-login { text-align: center; }
.ocw-login-title {
  margin: 0 0 4px;
  font-size: 20px;
  font-weight: 700;
  color: var(--ocw-text);
}
.ocw-login-subtitle {
  margin: 0 0 20px;
  font-size: 14px;
  color: var(--ocw-text-secondary);
}
.ocw-login-footer {
  margin: 20px 0 0;
  font-size: 12px;
  color: var(--ocw-text-tertiary);
}

.ocw-divider {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 20px 0;
  color: var(--ocw-text-tertiary);
  font-size: 13px;
}
.ocw-divider::before, .ocw-divider::after {
  content: "";
  flex: 1;
  height: 1px;
  background: var(--ocw-border);
}

.ocw-otp-hint {
  font-size: 13px;
  color: var(--ocw-text-secondary);
  margin: 0 0 12px;
}

/* ── Dashboard ─────────────────────────────────────── */
.ocw-dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
.ocw-user-email {
  font-size: 14px;
  font-weight: 500;
  color: var(--ocw-text);
  overflow: hidden;
  text-overflow: ellipsis;
}

.ocw-balances {
  margin-bottom: 16px;
}
.ocw-balance-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 14px;
  background: var(--ocw-bg-secondary);
  border: 1px solid var(--ocw-border);
  border-radius: var(--ocw-radius-sm);
  margin-bottom: 8px;
}
.ocw-chain-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--ocw-text);
  text-transform: capitalize;
}
.ocw-balance-value {
  font-size: 14px;
  font-weight: 600;
  color: var(--ocw-text);
  font-variant-numeric: tabular-nums;
}
.ocw-empty {
  text-align: center;
  color: var(--ocw-text-tertiary);
  font-size: 14px;
  padding: 24px 0;
}

.ocw-actions {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(80px, 1fr));
  gap: 8px;
}
.ocw-action-btn {
  padding: 10px 8px;
  font-size: 13px;
  font-weight: 600;
  background: var(--ocw-bg-secondary);
  color: var(--ocw-brand);
  border: 1px solid var(--ocw-border);
  border-radius: var(--ocw-radius-sm);
  cursor: pointer;
  transition: background 0.15s;
}
.ocw-action-btn:hover:not(:disabled) {
  background: var(--ocw-bg-hover);
}
.ocw-action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* ── Sub-views (Send, Swap, Receive, Buy) ──────────── */
.ocw-send, .ocw-swap, .ocw-receive, .ocw-buy { text-align: left; }
.ocw-send h3, .ocw-swap h3, .ocw-receive h3, .ocw-buy h3 {
  margin: 0 0 16px;
  font-size: 18px;
  font-weight: 700;
  color: var(--ocw-text);
}
.ocw-back-btn {
  background: none;
  border: none;
  color: var(--ocw-text-secondary);
  cursor: pointer;
  padding: 4px 0;
  margin-bottom: 8px;
  font-size: 14px;
}
.ocw-back-btn:hover { color: var(--ocw-text); }

.ocw-checkbox {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: var(--ocw-text-secondary);
  margin-bottom: 12px;
  cursor: pointer;
}

.ocw-passkey-hint {
  font-size: 13px;
  color: var(--ocw-text-tertiary);
  text-align: center;
  margin-top: 8px;
}
.ocw-passkey-error {
  font-size: 13px;
  color: var(--ocw-error-text);
  margin-bottom: 8px;
}

.ocw-address-display {
  text-align: center;
  padding: 16px;
  background: var(--ocw-bg-secondary);
  border: 1px solid var(--ocw-border);
  border-radius: var(--ocw-radius-sm);
}
.ocw-address-label {
  font-size: 14px;
  color: var(--ocw-text-secondary);
  margin: 0 0 8px;
}
.ocw-address {
  display: block;
  word-break: break-all;
  font-size: 13px;
  margin-bottom: 12px;
  color: var(--ocw-text);
  background: var(--ocw-bg);
  padding: 8px;
  border-radius: 6px;
  border: 1px solid var(--ocw-border);
}

.ocw-buy-options {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.ocw-onramp-iframe {
  width: 100%;
  height: 500px;
  border: none;
  border-radius: var(--ocw-radius-sm);
}

/* ── Toast notifications ───────────────────────────── */
.ocw-toast-container {
  position: absolute;
  top: 12px;
  left: 12px;
  right: 12px;
  z-index: 100;
  display: flex;
  flex-direction: column;
  gap: 8px;
  pointer-events: none;
}
.ocw-toast {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 14px;
  border-radius: var(--ocw-radius-sm);
  font-size: 13px;
  line-height: 1.4;
  box-shadow: var(--ocw-shadow);
  pointer-events: auto;
  animation: ocw-toast-in 0.2s ease-out;
}
.ocw-toast-error {
  background: var(--ocw-error-bg);
  color: var(--ocw-error-text);
  border: 1px solid var(--ocw-error-text);
}
.ocw-toast-success {
  background: var(--ocw-success-bg);
  color: var(--ocw-success-text);
  border: 1px solid var(--ocw-success-text);
}
.ocw-toast-dismiss {
  background: none;
  border: none;
  cursor: pointer;
  color: inherit;
  opacity: 0.6;
  font-size: 16px;
  line-height: 1;
  padding: 0;
  margin-left: auto;
  flex-shrink: 0;
}
.ocw-toast-dismiss:hover { opacity: 1; }

@keyframes ocw-toast-in {
  from { opacity: 0; transform: translateY(-8px); }
  to { opacity: 1; transform: translateY(0); }
}

/* ── Skeleton loading ──────────────────────────────── */
.ocw-skeleton-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 14px;
  background: var(--ocw-bg-secondary);
  border: 1px solid var(--ocw-border);
  border-radius: var(--ocw-radius-sm);
  margin-bottom: 8px;
}
.ocw-skeleton-block {
  height: 14px;
  border-radius: 4px;
  background: linear-gradient(90deg, var(--ocw-skeleton) 25%, var(--ocw-skeleton-shine) 50%, var(--ocw-skeleton) 75%);
  background-size: 200% 100%;
  animation: ocw-shimmer 1.5s ease-in-out infinite;
}

@keyframes ocw-shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* ── Spinner ───────────────────────────────────────── */
.ocw-spinner-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(var(--ocw-brand-rgb), 0.04);
  z-index: 50;
  border-radius: var(--ocw-radius);
}
.ocw-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--ocw-border);
  border-top-color: var(--ocw-brand);
  border-radius: 50%;
  animation: ocw-spin 0.7s linear infinite;
}
@keyframes ocw-spin {
  to { transform: rotate(360deg); }
}
`;
}
