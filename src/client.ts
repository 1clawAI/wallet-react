import type { WalletInfo, WalletBalance, SendTransactionParams, SendTransactionResult, SwapParams, SwapResult, SocialLoginResult, PasskeyTxAuthResult, FiatOnrampSession } from "./types";

const DEFAULT_BASE_URL = "https://api.1claw.xyz";

export class OneclawWalletClient {
  private baseUrl: string;
  private token: string | null = null;
  private appId: string | undefined;

  constructor(
    apiKey: string,
    baseUrl?: string,
    appId?: string,
  ) {
    this.baseUrl = baseUrl || DEFAULT_BASE_URL;
    this.appId = appId;
  }

  setToken(token: string): void {
    this.token = token;
  }

  clearToken(): void {
    this.token = null;
  }

  get isAuthenticated(): boolean {
    return this.token !== null;
  }

  private ensureToken(): string {
    if (!this.token) {
      throw new Error(
        "Not authenticated. Call socialLogin() or verifyEmailOtp() first.",
      );
    }
    return this.token;
  }

  private async request<T>(method: string, path: string, body?: unknown, headers?: Record<string, string>): Promise<T> {
    const token = this.ensureToken();
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
    const headers: Record<string, string> = {};
    if (params.passkeyToken) {
      headers["X-Passkey-Token"] = params.passkeyToken;
    } else if (params.password) {
      headers["X-Auth-Confirm"] = params.password;
    }
    return this.request<SendTransactionResult>(
      "POST",
      `/v1/treasury/wallets/${params.chain}/send`,
      { to: params.to, value_wei: params.valueWei, data: params.data, gasless: params.gasless },
      headers
    );
  }

  async swap(params: SwapParams): Promise<SwapResult> {
    const headers: Record<string, string> = {};
    if (params.passkeyToken) {
      headers["X-Passkey-Token"] = params.passkeyToken;
    } else if (params.password) {
      headers["X-Auth-Confirm"] = params.password;
    }
    return this.request<SwapResult>(
      "POST",
      `/v1/treasury/wallets/${params.chain}/swap`,
      { sell_token: params.sellToken, buy_token: params.buyToken, sell_amount: params.sellAmount },
      headers
    );
  }

  async socialLogin(provider: string, idToken: string, autoProvisionChains?: string[], oauthRedirectUri?: string): Promise<SocialLoginResult> {
    const body: Record<string, unknown> = {
      provider,
      id_token: idToken,
      auto_provision_chains: autoProvisionChains,
      platform_app_id: this.appId,
    };
    if (oauthRedirectUri) {
      body.oauth_redirect_uri = oauthRedirectUri;
    }
    const resp = await fetch(`${this.baseUrl}/v1/auth/social-login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (resp.status === 409) {
      const data = await resp.json();
      if (data.link_required?.authorize_url) {
        throw new LinkRequiredError(data.link_required.authorize_url, data.link_required.app_slug);
      }
    }
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({ detail: resp.statusText }));
      throw new Error(err.detail || `Request failed: ${resp.status}`);
    }
    const data: SocialLoginResult = await resp.json();
    if (data.token) {
      this.token = data.token;
    }
    return data;
  }

  async beginPasskeyTxAuth(
    txDigest: string,
  ): Promise<{ challenge: string; rp_id: string; allow_credentials: unknown[] }> {
    return this.request("POST", "/v1/auth/passkeys/tx-assert/begin", {
      tx_digest: txDigest,
    });
  }

  /** SHA-256 hex digest for passkey tx-assert (chain|to|valueWei|data). */
  async treasurySendTxDigest(
    chain: string,
    to: string,
    valueWei: string,
    data?: string,
  ): Promise<string> {
    const { treasurySendTxDigest } = await import("./treasury-send-digest");
    return treasurySendTxDigest(chain, to, valueWei, data);
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

  async sendEmailOtp(email: string): Promise<{ status: string }> {
    const resp = await fetch(`${this.baseUrl}/v1/auth/email-otp/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, platform_app_id: this.appId }),
    });
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({ detail: resp.statusText }));
      throw new Error(err.detail || `Request failed: ${resp.status}`);
    }
    return resp.json();
  }

  async verifyEmailOtp(email: string, code: string, autoProvisionChains?: string[]): Promise<SocialLoginResult> {
    const resp = await fetch(`${this.baseUrl}/v1/auth/email-otp/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        code,
        platform_app_id: this.appId,
        auto_provision_chains: autoProvisionChains,
      }),
    });
    if (resp.status === 409) {
      const data = await resp.json();
      if (data.link_required?.authorize_url) {
        throw new LinkRequiredError(data.link_required.authorize_url, data.link_required.app_slug);
      }
    }
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({ detail: resp.statusText }));
      throw new Error(err.detail || `Request failed: ${resp.status}`);
    }
    const data: SocialLoginResult = await resp.json();
    if (data.token) {
      this.token = data.token;
    }
    return data;
  }
}

export class LinkRequiredError extends Error {
  constructor(
    public readonly authorizeUrl: string,
    public readonly appSlug: string,
  ) {
    super("This account exists in another organization. User must authorize the connection.");
    this.name = "LinkRequiredError";
  }
}
