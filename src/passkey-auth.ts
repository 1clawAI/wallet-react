import type { EffectiveAuthPolicyResponse } from "./types";

const PASSKEY_MODES = new Set(["passkey_only", "passkey_required"]);

/** True when HFA requires a passkey but the user has none registered. */
export function passkeyRegistrationRequired(
  auth: EffectiveAuthPolicyResponse | null | undefined,
  action: "send" | "swap",
): boolean {
  if (!auth || auth.registered_passkeys > 0) return false;
  const mode = action === "send" ? auth.policy.send : auth.policy.swap;
  return PASSKEY_MODES.has(mode);
}

export function passkeyModeForAction(
  auth: EffectiveAuthPolicyResponse | null | undefined,
  action: "send" | "swap",
): string | null {
  if (!auth) return null;
  const mode = action === "send" ? auth.policy.send : auth.policy.swap;
  return PASSKEY_MODES.has(mode) ? mode : null;
}
