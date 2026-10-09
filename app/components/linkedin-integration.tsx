"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, ExternalLink, Link2, LoaderCircle, RefreshCw, Send, Unplug } from "lucide-react";

type Connection = {
  id: string;
  provider: string;
  provider_account_id: string;
  account_name: string | null;
  token_expires_at: string;
  connected_at: string;
  tokenExpired: boolean;
};
type Draft = { id: string; title: string | null; platform: string | null; caption: string; status: string };

export default function LinkedInIntegration({ workspaceId }: { workspaceId: string }) {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [selectedDraft, setSelectedDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    if (!workspaceId) return;
    setLoading(true);
    setError("");
    try {
      const [connectionResponse, draftResponse] = await Promise.all([
        fetch("/api/integrations/linkedin/connections?workspaceId=" + encodeURIComponent(workspaceId), { cache: "no-store" }),
        fetch("/api/content/drafts?workspaceId=" + encodeURIComponent(workspaceId), { cache: "no-store" }),
      ]);
      const connectionData = await connectionResponse.json();
      const draftData = await draftResponse.json();
      if (!connectionResponse.ok) throw new Error(connectionData.error || "Could not load LinkedIn connections.");
      if (!draftResponse.ok) throw new Error(draftData.error || "Could not load drafts.");
      setConnections(connectionData.connections ?? []);
      setDrafts((draftData.drafts ?? []).filter((draft: Draft) =>
        draft.status === "approved" && /(linkedin|multi-platform)/i.test(draft.platform ?? "") && Boolean(draft.caption?.trim()),
      ));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load social accounts.");
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("integration") === "linkedin_connected") {
      setMessage("LinkedIn account connected.");
      window.history.replaceState({}, "", window.location.pathname);
      void load();
    } else if (params.has("integration_error")) {
      setError("LinkedIn connection failed (" + params.get("integration_error") + "). Check app credentials, product access, and callback URL.");
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [load]);

  function connect() {
    if (!workspaceId) return;
    window.location.href = "/api/integrations/linkedin/connect?workspaceId=" + encodeURIComponent(workspaceId);
  }

  async function disconnect(connectionId: string) {
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/integrations/linkedin/connections", {
        method: "DELETE", headers: { "content-type": "application/json" },
        body: JSON.stringify({ workspaceId, connectionId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Disconnect failed.");
      setMessage("LinkedIn account disconnected.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Disconnect failed.");
    } finally { setBusy(false); }
  }

  async function publish() {
    if (!selectedDraft) return;
    const confirmed = window.confirm("Publish this approved draft publicly to LinkedIn now? This cannot be undone from SocialOS.");
    if (!confirmed) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/integrations/linkedin/publish", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ workspaceId, draftId: selectedDraft }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Publishing failed.");
      setMessage("Published successfully. LinkedIn post ID: " + (data.postId || "accepted by LinkedIn") + ". Verify the post in LinkedIn.");
      setSelectedDraft("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Publishing failed.");
    } finally { setBusy(false); }
  }

  return (
    <div className="brand-settings">
      <div className="panel">
        <div className="panel-head">
          <div><small>PLATFORM INTEGRATION</small><h3>LinkedIn</h3></div>
          <span className="status">{connections.length ? "Connected" : "Not connected"}</span>
        </div>
        <p>Connect a LinkedIn member account to publish approved text drafts. SocialOS never publishes drafts that have not passed the existing approval workflow.</p>
        {loading ? <div className="empty-inline"><LoaderCircle size={16} /> Loading account status…</div> : connections.length ? (
          <div className="integration-list">
            {connections.map((connection) => (
              <div className="draft-row" key={connection.id}>
                <div className="draft-copy">
                  <b>{connection.account_name || "LinkedIn member"}</b>
                  <small>{connection.tokenExpired ? "Access token expired — reconnect required" : "Token expires " + new Date(connection.token_expires_at).toLocaleDateString()}</small>
                </div>
                <button disabled={busy} onClick={() => void disconnect(connection.id)}><Unplug size={15} /> Disconnect</button>
              </div>
            ))}
          </div>
        ) : <div className="empty-inline">No LinkedIn account is connected to this workspace.</div>}
        <div className="brand-form-foot">
          <span>Requires LinkedIn app approval and server-side credentials.</span>
          <div className="integration-actions">
            <button onClick={() => void load()} disabled={loading || busy}><RefreshCw size={15} /> Refresh</button>
            <button className="primary" onClick={connect} disabled={busy}><Link2 size={15} /> Connect LinkedIn</button>
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head"><div><small>PUBLISHING</small><h3>Approved drafts</h3></div><span>{drafts.length} ready</span></div>
        {drafts.length ? (
          <>
            <label>Choose an approved LinkedIn draft
              <select value={selectedDraft} onChange={(e) => setSelectedDraft(e.target.value)}>
                <option value="">Select a draft…</option>
                {drafts.map((draft) => <option key={draft.id} value={draft.id}>{draft.title || "Untitled draft"} — {draft.platform}</option>)}
              </select>
            </label>
            {selectedDraft && <div className="empty-inline">{drafts.find((draft) => draft.id === selectedDraft)?.caption}</div>}
            <div className="brand-form-foot">
              <span>Publishing is public and requires explicit confirmation.</span>
              <button className="primary" disabled={!selectedDraft || busy || connections.length === 0 || connections.every((c) => c.tokenExpired)} onClick={() => void publish()}>
                {busy ? <LoaderCircle size={15} /> : <Send size={15} />} Publish now
              </button>
            </div>
          </>
        ) : <div className="empty-inline">No approved LinkedIn-compatible text drafts yet. Approve a draft in Content Calendar first.</div>}
      </div>
      {message && <div className="auth-message success"><CheckCircle2 size={16} /> {message}</div>}
      {error && <div className="auth-message error">{error}</div>}
      <div className="empty-inline"><ExternalLink size={15} /> After publishing, verify the post directly on LinkedIn. Analytics and media publishing are not included in this initial integration.</div>
    </div>
  );
}
