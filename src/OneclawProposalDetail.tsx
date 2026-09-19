import React, { useCallback, useEffect, useState } from "react";
import { useOneclawWallet } from "./context";
import { describeProposal } from "./proposals";
import type { Proposal } from "./types";

export interface OneclawProposalDetailProps {
  /** The proposal to show. Pass either the object or its id. */
  proposal?: Proposal;
  proposalId?: string;
  /** Called after a decision is recorded. */
  onDecided?: (proposal: Proposal, decision: "approved" | "rejected") => void;
  /**
   * Tier-2 signatures need a re-auth token (`POST /v1/auth/reauth`, purpose
   * `approval.decide`). Return one, or `undefined` to try without.
   */
  getReauthToken?: () => Promise<string | undefined>;
  /** Poll interval for "Refresh status" while pending (ms, 0 = manual only). */
  pollMs?: number;
  className?: string;
}

/**
 * A wallet-style proposal view: scheme, signer, exactly what is being
 * signed, expiry, and Sign / Reject. Mirrors the dashboard's /proposals
 * rendering so an embedded wallet shows the same thing the owner sees.
 */
export function OneclawProposalDetail({ proposal: initial, proposalId, onDecided, getReauthToken, pollMs = 5000, className }: OneclawProposalDetailProps) {
  const { client } = useOneclawWallet();
  const [proposal, setProposal] = useState<Proposal | null>(initial ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const id = initial?.id ?? proposalId;

  const refresh = useCallback(async () => {
    if (!id) return;
    try {
      setProposal(await client.getProposal(id));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not refresh");
    }
  }, [client, id]);

  useEffect(() => {
    if (!proposal && id) void refresh();
  }, [proposal, id, refresh]);

  useEffect(() => {
    if (!pollMs || !proposal || proposal.status !== "pending") return;
    const t = setInterval(() => void refresh(), pollMs);
    return () => clearInterval(t);
  }, [pollMs, proposal, refresh]);

  if (!proposal) {
    return <div className={`ocw-proposal ${className ?? ""}`}>{error ? <p className="ocw-error">{error}</p> : <div className="ocw-skeleton-row" />}</div>;
  }
  const d = describeProposal(proposal);
  const expiresIn = proposal.expires_at ? Math.max(0, Math.round((new Date(proposal.expires_at).getTime() - Date.now()) / 60000)) : null;

  const decide = async (decision: "approved" | "rejected") => {
    setBusy(true);
    setError(null);
    try {
      let reauthToken: string | undefined;
      if (decision === "approved" && proposal.risk_tier >= 2 && getReauthToken) {
        reauthToken = await getReauthToken();
      }
      const updated = await client.decideProposal(proposal.id, decision, { reauthToken });
      setProposal(updated);
      onDecided?.(updated, decision);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Decision failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`ocw-proposal ${className ?? ""}`}>
      <div className="ocw-proposal-header">
        <span className="ocw-proposal-scheme">{d.schemeLabel}</span>
        <span className={`ocw-proposal-status ocw-status-${proposal.status}`}>{d.statusText}</span>
      </div>
      <p className="ocw-proposal-agent">
        From <strong>{d.agentName}</strong>
        {d.chain ? ` · ${d.chain}` : ""}
        {proposal.status === "pending" && expiresIn !== null ? ` · expires in ${expiresIn} min` : ""}
      </p>
      {proposal.human_summary && <p className="ocw-proposal-summary">{proposal.human_summary}</p>}
      <div className="ocw-proposal-body">
        <div className="ocw-proposal-label">What you are signing</div>
        <pre className="ocw-proposal-pre">{d.body}</pre>
      </div>
      {proposal.status === "approved" && <div className="ocw-proposal-banner">Message bytes verified · signature created by your policy on {proposal.decided_at ? new Date(proposal.decided_at).toLocaleString() : "—"}</div>}
      <button type="button" className="ocw-link" onClick={() => setShowDetails((v) => !v)}>
        {showDetails ? "Hide technical details" : "Technical details"}
      </button>
      {showDetails && (
        <dl className="ocw-proposal-fields">
          {d.fields.map((f) => (
            <React.Fragment key={f.label}>
              <dt>{f.label}</dt>
              <dd className={f.mono ? "ocw-mono" : undefined}>{f.value}</dd>
            </React.Fragment>
          ))}
          <dt>Proposal</dt>
          <dd className="ocw-mono">{proposal.id}</dd>
          <dt>Risk tier</dt>
          <dd>{proposal.risk_tier}</dd>
          {d.typedData && (
            <>
              <dt>Typed data</dt>
              <dd>
                <pre className="ocw-proposal-pre">{JSON.stringify({ domain: d.typedData.domain, primaryType: d.typedData.primaryType, message: d.typedData.message }, null, 2)}</pre>
              </dd>
            </>
          )}
        </dl>
      )}
      {error && <p className="ocw-error">{error}</p>}
      <div className="ocw-proposal-actions">
        {proposal.status === "pending" ? (
          <>
            <button type="button" className="ocw-btn ocw-btn-primary" disabled={busy} onClick={() => void decide("approved")}>Sign</button>
            <button type="button" className="ocw-btn" disabled={busy} onClick={() => void decide("rejected")}>Reject</button>
          </>
        ) : null}
        <button type="button" className="ocw-btn ocw-btn-ghost" disabled={busy} onClick={() => void refresh()}>Refresh status</button>
      </div>
    </div>
  );
}
