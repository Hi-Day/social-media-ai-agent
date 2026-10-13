"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, ExternalLink, Link2, LoaderCircle, RefreshCw, Unplug } from "lucide-react";
import LinkedInIntegration from "@/app/components/linkedin-integration";

type ProviderKey = "instagram" | "tiktok";
type ConnectedAccount = {
  id: string;
  accountName: string | null;
  connectedAt: string;
  tokenExpiresAt: string | null;
  tokenExpired: boolean;
};
type ProviderStatus = {
  configured: boolean;
  connections: ConnectedAccount[];
};
type StatusResponse = {
  providers: Record<"instagram" | "tiktok" | "linkedin", ProviderStatus>;
};

const providerInfo: Record<ProviderKey, { name: string; description: string; connectLabel: string }> = {
  instagram: {
    name: "Instagram",
    description: "Untuk akun profesional yang memenuhi persyaratan Meta API dan izin content publishing.",
    connectLabel: "Hubungkan Instagram",
  },
  tiktok: {
    name: "TikTok",
    description: "Memerlukan aplikasi TikTok developer dengan izin video.publish/video.upload yang disetujui.",
    connectLabel: "Hubungkan TikTok",
  },
};

export default function SocialAccountsPanel({ workspaceId }: { workspaceId: string }) {
  const [providers, setProviders] = useState<StatusResponse["providers"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyAccount, setBusyAccount] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    if (!workspaceId) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/integrations/status?workspaceId=" + encodeURIComponent(workspaceId), { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Tidak dapat memuat status akun sosial.");
      setProviders(data.providers as StatusResponse["providers"]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Tidak dapat memuat status akun sosial.");
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const integration = params.get("integration");
    const integrationError = params.get("integration_error") || "";
    if (integration === "instagram_connected" || integration === "tiktok_connected") {
      setMessage((integration === "instagram_connected" ? "Instagram" : "TikTok") + " berhasil terhubung.");
      window.history.replaceState({}, "", window.location.pathname);
      void load();
    } else if (integrationError.startsWith("instagram_") || integrationError.startsWith("tiktok_")) {
      setError("Koneksi akun gagal (" + integrationError + "). Periksa konfigurasi aplikasi dan callback URL.");
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [load]);

  function connect(provider: ProviderKey) {
    if (!workspaceId) return;
    window.location.href = "/api/integrations/" + provider + "/connect?workspaceId=" + encodeURIComponent(workspaceId);
  }

  async function disconnect(provider: ProviderKey, connectionId: string) {
    setBusyAccount(connectionId);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/integrations/" + provider + "/connections", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ workspaceId, connectionId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Gagal memutus koneksi akun.");
      setMessage("Akun " + providerInfo[provider].name + " berhasil diputus.");
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Gagal memutus koneksi akun.");
    } finally {
      setBusyAccount("");
    }
  }

  return (
    <div className="brand-settings">
      <div className="panel">
        <div className="panel-head">
          <div><small>SOCIAL ACCOUNT CONNECTIONS</small><h3>Instagram & TikTok</h3></div>
          <button onClick={() => void load()} disabled={loading} aria-label="Refresh social account status">
            <RefreshCw size={15} /> {loading ? "Memuat…" : "Refresh"}
          </button>
        </div>
        <p>Hubungkan akun profesional yang Anda kelola. Koneksi hanya tersedia jika kredensial aplikasi dan callback URL telah dikonfigurasi di server.</p>
        {error && <div className="auth-message error" role="alert">{error}</div>}
        {message && <div className="auth-message" role="status">{message}</div>}
        {loading && !providers ? <div className="empty-inline"><LoaderCircle size={16} /> Memeriksa konfigurasi provider…</div> : (
          <div className="integration-list">
            {(["instagram", "tiktok"] as const).map((provider) => {
              const status = providers?.[provider];
              const info = providerInfo[provider];
              const connections = status?.connections ?? [];
              return (
                <div className="panel" key={provider}>
                  <div className="panel-head">
                    <div><small>PLATFORM</small><h3>{info.name}</h3></div>
                    <span className={`status ${connections.length ? "approved" : "needs-review"}`}>
                      {connections.length ? "Connected" : status?.configured ? "Not connected" : "Needs setup"}
                    </span>
                  </div>
                  <p>{info.description}</p>
                  {!status?.configured && <div className="empty-inline">Admin perlu mengatur kredensial OAuth dan redirect URI untuk {info.name} di environment Vercel.</div>}
                  {connections.map((account) => (
                    <div className="draft-row" key={account.id}>
                      <div className="platform"><CheckCircle2 size={16} /></div>
                      <div className="draft-copy">
                        <b>{account.accountName || "Connected account"}</b>
                        <small>{account.tokenExpired ? "Token expired or expiry unavailable" : "Token expiry: " + new Date(account.tokenExpiresAt || "").toLocaleString()}</small>
                      </div>
                      <button disabled={Boolean(busyAccount)} onClick={() => void disconnect(provider, account.id)}>
                        {busyAccount === account.id ? "Disconnecting…" : <><Unplug size={14} /> Disconnect</>}
                      </button>
                    </div>
                  ))}
                  <div className="brand-form-foot">
                    <span>{connections.length ? connections.length + " account(s) connected" : "No connected account"}</span>
                    <button className="primary" onClick={() => connect(provider)} disabled={!status?.configured || Boolean(busyAccount)}>
                      <Link2 size={15} /> {info.connectLabel} <ExternalLink size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <p className="learning-note">Panel ini saat ini mengelola koneksi akun. UI publikasi Instagram/TikTok belum aktif; status Connected bukan bukti bahwa publikasi sudah diuji. Publikasi perlu dilanjutkan sebagai task terpisah setelah izin API dan persyaratan media tervalidasi.</p>
      </div>
      <LinkedInIntegration workspaceId={workspaceId} />
    </div>
  );
}
