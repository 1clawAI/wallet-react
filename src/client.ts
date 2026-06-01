import type { WalletInfo, WalletBalance, SendTransactionParams, SendTransactionResult, SwapParams, SwapResult, SocialLoginResult, PasskeyTxAuthResult, FiatOnrampSession } from "./types";

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
      { to: params.to, value_wei: params.valueWei, data: params.data, gasless: params.gasless },
      { "X-Auth-Confirm": params.password }
    );
  }

  async swap(params: SwapParams): Promise<SwapResult> {
    return this.request<SwapResult>(
      "POST",
      `/v1/treasury/wallets/${params.chain}/swap`,
      { sell_token: params.sellToken, buy_token: params.buyToken, sell_amount: params.sellAmount },
      { "X-Auth-Confirm": params.password }
    );
  }

  async socialLogin(provider: string, idToken: string, autoProvisionChains?: string[]): Promise<SocialLoginResult> {
    return this.request<SocialLoginResult>(
      "POST",
      "/v1/auth/social-login",
      { provider, id_token: idToken, auto_provision_chains: autoProvisionChains }
    );
  }

  async beginPasskeyTxAuth(): Promise<{ challenge: string; rp_id: string; allow_credentials: unknown[] }> {
    return this.request("POST", "/v1/auth/passkeys/tx-assert/begin", {});
  }

  async completePasskeyTxAuth(assertion: {
    credential_id: string;
    authenticator_data: string;
    client_data_json: string;
    signature: string;
  }): Promise<PasskeyTxAuthResult> {
    return this.request<PasskeyTxAuthResult>(
      "POST",
      "/v1/auth/passkeys/tx-assert/complete",
      assertion
    );
  }

  async sendWithPasskey(params: Omit<SendTransactionParams, "password"> & { passkeyToken: string }): Promise<SendTransactionResult> {
    return this.request<SendTransactionResult>(
      "POST",
      `/v1/treasury/wallets/${params.chain}/send`,
      { to: params.to, value_wei: params.valueWei, data: params.data, gasless: params.gasless },
      { "X-Passkey-Token": params.passkeyToken }
    );
  }

  async createOnrampSession(chain: string, asset?: string, amountUsd?: string): Promise<FiatOnrampSession> {
    return this.request<FiatOnrampSession>(
      "POST",
      "/v1/fiat/onramp/session",
      { chain, asset, amount_usd: amountUsd }
    );
  }
}
