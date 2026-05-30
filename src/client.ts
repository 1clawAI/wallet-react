import type { WalletInfo, WalletBalance, SendTransactionParams, SendTransactionResult } from "./types";

const DEFAULT_BASE_URL = "https://api.1claw.xyz";

export class OneclawWalletClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor(
    private apiKey: string,
    baseUrl?: string
  ) {
    this.baseUrl = baseUrl || DEFAULT_BASE_URL;
  }

  private async ensureToken(): Promise<string> {
    if (this.token) return this.token;
    const resp = await fetch(`${this.baseUrl}/v1/auth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ api_key: this.apiKey }),
    });
    if (!resp.ok) throw new Error(`Auth failed: ${resp.status}`);
    const data = await resp.json();
    this.token = data.token;
    return this.token!;
  }

  private async request<T>(method: string, path: string, body?: unknown, headers?: Record<string, string>): Promise<T> {
    const token = await this.ensureToken();
    const resp = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({ detail: resp.statusText }));
      throw new Error(err.detail || `Request failed: ${resp.status}`);
    }
    return resp.json();
  }

  async listWallets(): Promise<WalletInfo[]> {
    const data = await this.request<{ wallets: WalletInfo[] }>("GET", "/v1/treasury/wallets");
    return data.wallets;
  }

  async generateWallets(chains?: string[]): Promise<WalletInfo[]> {
    const data = await this.request<{ wallets: WalletInfo[] }>(
      "POST",
      "/v1/treasury/wallets/generate",
      { chains }
    );
    return data.wallets;
  }

  async getBalance(chain: string, tokens?: string[]): Promise<WalletBalance> {
    const params = tokens?.length ? `?tokens=${tokens.join(",")}` : "";
    return this.request<WalletBalance>("GET", `/v1/treasury/wallets/${chain}/balance${params}`);
  }

  async send(params: SendTransactionParams): Promise<SendTransactionResult> {
    return this.request<SendTransactionResult>(
      "POST",
      `/v1/treasury/wallets/${params.chain}/send`,
      { to: params.to, value_wei: params.valueWei, data: params.data },
      { "X-Auth-Confirm": params.password }
    );
  }
}
