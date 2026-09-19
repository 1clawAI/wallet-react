import type { Proposal, ProposalDetails, ProposalScheme } from "./types";

function str(v: unknown): string | undefined {
  return typeof v === "string" ? v : typeof v === "number" ? String(v) : undefined;
}

function decodeMaybeHex(s: string): string {
  if (!/^0x[0-9a-fA-F]*$/.test(s) || s.length % 2 !== 0) return s;
  try {
    const bytes = new Uint8Array((s.length - 2) / 2);
    for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(s.slice(2 + i * 2, 4 + i * 2), 16);
    const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    return /^[\x20-\x7e\s]*$/.test(text) ? text : s;
  } catch {
    return s;
  }
}

/**
 * Read a proposal's `summary` into what a wallet shows: the scheme, the
 * signer's chain and target, the message or typed data, and a status line.
 * Pure; safe to call on every render.
 */
export function describeProposal(p: Proposal): ProposalDetails {
  const s = p.summary ?? {};
  const req = (s.request ?? {}) as Record<string, unknown>;
  const intentType = str(s.intent_type) ?? str(req.type);
  const chain = str(req.chain) ?? str(s.chain);
  const fields: ProposalDetails["fields"] = [];
  let scheme: ProposalScheme = "unknown";
  let schemeLabel = p.action;
  let body = "";
  let target: string | undefined;
  let valueWei: string | undefined;
  let typedData: ProposalDetails["typedData"];

  if (p.action === "agent_transaction") {
    scheme = "transaction";
    schemeLabel = "Transaction";
    target = str(s.to) ?? str(req.to);
    valueWei = str(s.value_wei) ?? str(req.value) ?? str(s.value);
    body = [target ? `to ${target}` : null, valueWei ? `value ${valueWei}` : null, chain ? `on ${chain}` : null].filter(Boolean).join(" · ");
    if (target) fields.push({ label: "To", value: target, mono: true });
    if (valueWei) fields.push({ label: "Value", value: valueWei, mono: true });
  } else if (intentType === "personal_sign" || intentType === "message") {
    scheme = "personal_sign";
    schemeLabel = "Sign message";
    body = decodeMaybeHex(str(req.message) ?? "");
    fields.push({ label: "Message", value: body });
  } else if (intentType === "typed_data") {
    scheme = "typed_data";
    schemeLabel = "Sign typed data";
    const td = (req.typed_data ?? req) as Record<string, unknown>;
    const domain = (td.domain ?? {}) as Record<string, unknown>;
    typedData = { domain, primaryType: str(td.primaryType ?? td.primary_type), message: td.message };
    target = str(domain.verifyingContract);
    body = `${str(domain.name) ?? "Typed data"}${typedData.primaryType ? ` · ${typedData.primaryType}` : ""}`;
    if (str(domain.name)) fields.push({ label: "Domain", value: str(domain.name)! });
    if (target) fields.push({ label: "Verifying contract", value: target, mono: true });
    if (typedData.primaryType) fields.push({ label: "Primary type", value: typedData.primaryType, mono: true });
  } else if (intentType === "digest" || intentType === "raw_digest") {
    scheme = "digest";
    schemeLabel = "Sign raw digest";
    body = str(req.digest) ?? str(req.hash) ?? "";
    fields.push({ label: "Digest", value: body, mono: true });
  } else {
    body = p.human_summary ?? p.reason ?? "";
  }
  if (chain) fields.push({ label: "Chain", value: chain });

  const expired = !!p.expires_at && new Date(p.expires_at).getTime() < Date.now();
  const statusText =
    p.status === "approved" ? "Signature created" : p.status === "rejected" ? "Rejected" : expired ? "Expired" : "Awaiting your decision";

  return {
    scheme,
    schemeLabel,
    agentName: str(s.agent_name) ?? (p.agent_id ? p.agent_id.slice(0, 8) : "Agent"),
    chain,
    target,
    valueWei,
    body,
    fields,
    typedData,
    statusText,
  };
}
