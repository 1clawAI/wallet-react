/** Minimal WebAuthn helpers for embedded wallet passkey flows. */

function base64urlEncode(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64urlDecode(str: string): ArrayBuffer {
  let s = str.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4 !== 0) s += "=";
  const binary = atob(s);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

export function isWebAuthnSupported(): boolean {
  return typeof window !== "undefined" && !!window.PublicKeyCredential;
}

interface AssertBeginResponse {
  challenge: string;
  rp_id: string;
  timeout: number;
  user_verification: string;
  allow_credentials: { id: string; type: string; transports?: string[] }[];
}

interface RegisterBeginResponse {
  challenge: string;
  rp_id: string;
  rp_name: string;
  user_id: string;
  user_name: string;
  user_display_name: string;
  attestation?: string;
  authenticator_selection?: Record<string, unknown>;
  exclude_credentials?: { id: string; type: string; transports?: string[] }[];
  pub_key_cred_params?: { type: string; alg: number }[];
  timeout?: number;
}

export async function performPasskeyTxAssert(
  request: <T>(method: string, path: string, body?: unknown) => Promise<T>,
  txDigest: string,
  action: "send" | "swap" = "send",
): Promise<string> {
  const begin = await request<AssertBeginResponse>("POST", "/v1/auth/passkeys/tx-assert/begin", {
    tx_digest: txDigest,
    action,
  });

  const credential = (await navigator.credentials.get({
    publicKey: {
      challenge: base64urlDecode(begin.challenge),
      rpId: begin.rp_id,
      timeout: begin.timeout,
      userVerification: begin.user_verification as UserVerificationRequirement,
      allowCredentials: begin.allow_credentials.map((c) => ({
        id: base64urlDecode(c.id),
        type: c.type as PublicKeyCredentialType,
        transports: c.transports as AuthenticatorTransport[] | undefined,
      })),
    },
  })) as PublicKeyCredential | null;

  if (!credential) throw new Error("Passkey authentication was cancelled");

  const response = credential.response as AuthenticatorAssertionResponse;
  const complete = await request<{ passkey_token: string }>(
    "POST",
    "/v1/auth/passkeys/tx-assert/complete",
    {
      credential_id: base64urlEncode(credential.rawId),
      authenticator_data: base64urlEncode(response.authenticatorData),
      client_data_json: base64urlEncode(response.clientDataJSON),
      signature: base64urlEncode(response.signature),
    },
  );
  return complete.passkey_token;
}

export async function registerPasskey(
  request: <T>(method: string, path: string, body?: unknown, headers?: Record<string, string>) => Promise<T>,
  name?: string,
): Promise<void> {
  const begin = await request<RegisterBeginResponse>(
    "POST",
    "/v1/auth/passkeys/register/begin",
    {},
  );

  const credential = (await navigator.credentials.create({
    publicKey: {
      challenge: base64urlDecode(begin.challenge),
      rp: { id: begin.rp_id, name: begin.rp_name },
      user: {
        id: base64urlDecode(begin.user_id),
        name: begin.user_name,
        displayName: begin.user_display_name,
      },
      pubKeyCredParams: (begin.pub_key_cred_params ?? [{ type: "public-key", alg: -7 }]).map(
        (p) => ({ type: p.type as PublicKeyCredentialType, alg: p.alg }),
      ),
      timeout: begin.timeout ?? 60000,
      attestation: (begin.attestation as AttestationConveyancePreference) ?? "none",
      authenticatorSelection: begin.authenticator_selection as AuthenticatorSelectionCriteria,
      excludeCredentials: begin.exclude_credentials?.map((c) => ({
        id: base64urlDecode(c.id),
        type: c.type as PublicKeyCredentialType,
        transports: c.transports as AuthenticatorTransport[] | undefined,
      })),
    },
  })) as PublicKeyCredential | null;

  if (!credential) throw new Error("Passkey registration was cancelled");

  const response = credential.response as AuthenticatorAttestationResponse;
  await request(
    "POST",
    "/v1/auth/passkeys/register/complete",
    {
      credential_id: base64urlEncode(credential.rawId),
      attestation_object: base64urlEncode(response.attestationObject),
      client_data_json: base64urlEncode(response.clientDataJSON),
      transports: response.getTransports?.(),
      name,
    },
  );
}
