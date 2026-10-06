"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  CalendarDays,
  ChevronRight,
  Command,
  LayoutDashboard,
  MessageSquare,
  Plus,
  Send,
  Settings,
  Sparkles,
  TrendingUp,
  Users,
  BrainCircuit,
  Check,
  X,
} from "lucide-react";

const navigation = [
  { icon: LayoutDashboard, name: "Overview" },
  { icon: CalendarDays, name: "Content Calendar" },
  { icon: BrainCircuit, name: "AI Studio" },
  { icon: MessageSquare, name: "Engagement" },
  { icon: TrendingUp, name: "Analytics" },
  { icon: Users, name: "Audience" },
  { icon: BrainCircuit, name: "Brand Brain" },
];

type Draft = {
  id: string;
  workspace_id: string;
  title: string | null;
  platform: string | null;
  caption: string;
  status: string;
  created_at: string;
  updated_at: string;
};

const stats = [
  ["Content this week", "—", "Live workspace"],
  ["Engagement rate", "—", "Connect accounts"],
  ["Pending approvals", "—", "Live workspace"],
  ["AI actions", "—", "This week"],
];

function statusLabel(status: string) {
  return status.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function Home() {
  const [tab, setTab] = useState("Overview");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [idea, setIdea] = useState("");
  const [generated, setGenerated] = useState("");
  const [draftId, setDraftId] = useState("");
  const [draftStatus, setDraftStatus] = useState("draft");
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState("");
  const [workspaceId, setWorkspaceId] = useState("");
  const [workspaceName, setWorkspaceName] = useState("My Workspace");
  const [brandName, setBrandName] = useState("My Brand");
  const [brandVoice, setBrandVoice] = useState("");
  const [brandDescription, setBrandDescription] = useState("");
  const [brandAudience, setBrandAudience] = useState("");
  const [brandSaving, setBrandSaving] = useState(false);
  const [brandSaved, setBrandSaved] = useState(false);
  const [userEmail, setUserEmail] = useState("");

  const router = useRouter();

  async function loadDrafts(id = workspaceId) {
    if (!id) return;
    const response = await fetch(`/api/content/drafts?workspaceId=${encodeURIComponent(id)}`, {
      cache: "no-store",
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Unable to load drafts.");
    setDrafts(data.drafts ?? []);
  }

  useEffect(() => {
    let mounted = true;
    const supabase = createClient();

    async function loadWorkspace() {
      try {
        const { data, error } = await supabase.auth.getUser();
        if (error || !data.user) {
          router.replace("/login");
          return;
        }

        if (!mounted) return;
        setUserEmail(data.user.email ?? "");

        let response = await fetch("/api/workspace", { cache: "no-store" });
        let workspaceData = await response.json();

        if (response.ok && !workspaceData.workspace) {
          response = await fetch("/api/workspace", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              name:
                typeof data.user.user_metadata?.workspace_name === "string"
                  ? data.user.user_metadata.workspace_name
                  : "My Workspace",
            }),
          });
          workspaceData = await response.json();
        }

        if (!response.ok || !workspaceData.workspace) {
          throw new Error(workspaceData.error || "Unable to load workspace.");
        }

        if (!mounted) return;
        setWorkspaceId(workspaceData.workspace.id);
        setWorkspaceName(workspaceData.workspace.name);
        setBrandName(workspaceData.brand?.name ?? workspaceData.workspace.name);
        setBrandVoice(workspaceData.brand?.voice ?? "");
        setBrandDescription(workspaceData.brand?.description ?? "");
        setBrandAudience(workspaceData.brand?.audience ?? "");
        await loadDrafts(workspaceData.workspace.id);
      } catch (error) {
        if (mounted) {
          setAuthError(error instanceof Error ? error.message : "Unable to load account.");
        }
      } finally {
        if (mounted) setAuthLoading(false);
      }
    }

    loadWorkspace();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") router.replace("/login");
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [router]);

  async function generate() {
    if (!idea.trim()) return;
    setAuthError("");
    setLoading(true);
    setGenerated("");
    setDraftId("");
    setDraftStatus("draft");

    try {
      const response = await fetch("/api/agent/content", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ idea, workspaceId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Generation failed.");
      setGenerated(data.caption || "");
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Generation failed.");
    } finally {
      setLoading(false);
    }
  }

  async function saveBrand() {
    if (!workspaceId || !brandName.trim()) return;
    setBrandSaving(true);
    setBrandSaved(false);
    setAuthError("");
    try {
      const response = await fetch("/api/brand", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          workspaceId,
          name: brandName,
          voice: brandVoice,
          description: brandDescription,
          audience: brandAudience,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to save Brand Brain.");
      setBrandName(data.brand.name);
      setBrandVoice(data.brand.voice ?? "");
      setBrandDescription(data.brand.description ?? "");
      setBrandAudience(data.brand.audience ?? "");
      setBrandSaved(true);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Unable to save Brand Brain.");
    } finally {
      setBrandSaving(false);
    }
  }

  async function saveDraft() {
    if (!workspaceId || !idea.trim() || !generated.trim()) return;
    setSaving(true);
    setAuthError("");

    try {
      const response = await fetch("/api/content/drafts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          workspaceId,
          idea,
          caption: generated,
          platform: "Multi-platform",
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to save draft.");

      setDraftId(data.draft.id);
      setDraftStatus(data.draft.status);
      await loadDrafts();
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Unable to save draft.");
    } finally {
      setSaving(false);
    }
  }

  async function reviewDraft(id: string, action: "submit" | "approve" | "reject" | "changes_requested") {
    setReviewing(true);
    setAuthError("");

    try {
      const response = await fetch(`/api/content/drafts/${id}/review`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Review action failed.");

      setDraftId(data.draft.id);
      setDraftStatus(data.draft.status);
      await loadDrafts();
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Review action failed.");
    } finally {
      setReviewing(false);
    }
  }

  function openTab(name: string) {
    setTab(name);
    setMobileNavOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (authLoading) {
    return (
      <main className="auth-loading">
        <Sparkles size={22} />
        <span>Loading your workspace…</span>
      </main>
    );
  }

  if (authError && !workspaceId) {
    return (
      <main className="auth-loading">
        <Sparkles size={22} />
        <span>{authError}</span>
        <button className="primary" onClick={() => router.push("/login")}>
          Back to sign in
        </button>
      </main>
    );
  }

  return (
    <main>
      <aside>
        <div className="brand">
          <div className="logo"><Sparkles size={18} /></div>
          <b>SocialOS</b>
        </div>

        <nav>
          {navigation.map(({ icon: Icon, name }) => (
            <button className={tab === name ? "active" : ""} onClick={() => openTab(name)} key={name}>
              <Icon size={17} />
              {name}
            </button>
          ))}
        </nav>

        <button
          className="mobile-nav-toggle"
          onClick={() => setMobileNavOpen((open) => !open)}
          aria-expanded={mobileNavOpen}
          aria-label="Open navigation"
        >
          {(() => {
            const current = navigation.find((item) => item.name === tab) ?? navigation[0];
            const Icon = current.icon;
            return (
              <>
                <Icon size={17} />
                <span>{current.name}</span>
                <ChevronRight className={mobileNavOpen ? "rotate" : ""} size={16} />
              </>
            );
          })()}
        </button>

        {mobileNavOpen && (
          <div className="mobile-nav-menu">
            {navigation.map(({ icon: Icon, name }) => (
              <button
                className={tab === name ? "selected" : ""}
                onClick={() => openTab(name)}
                key={name}
              >
                <Icon size={16} />
                <span>{name}</span>
              </button>
            ))}
          </div>
        )}

        <div className="side-bottom">
          <button onClick={() => openTab("Brand Brain")}><Settings size={17} />Settings</button>
          <div className="workspace">
            <div className="avatar">HD</div>
            <div>
              <b>{workspaceName}</b>
              <small>{userEmail}</small>
            </div>
          </div>
        </div>
      </aside>

      <section className="content">
        <header>
          <div>
            <span className="eyebrow">AI SOCIAL MEDIA MANAGER</span>
            <h1>{tab}</h1>
          </div>
          <div className="header-actions">
            <button className="icon"><Command size={17} /></button>
            <button className="new" onClick={() => openTab("AI Studio")}>
              <Plus size={17} />
              New task
            </button>
          </div>
        </header>

        {tab === "Overview" && (
          <>
            <div className="hero">
              <div>
                <span className="pill"><span className="dot" /> Agent online</span>
                <h2>Your social presence,<br /><em>working for you.</em></h2>
                <p>Plan, create, review and learn from every interaction — with AI handling the busywork and you keeping control.</p>
                <button className="primary" onClick={() => openTab("AI Studio")}>
                  Open AI Studio <ChevronRight size={17} />
                </button>
              </div>
              <div className="orb">
                <Sparkles size={42} />
                <span>Observe<br />→ Plan<br />→ Act<br />→ Learn</span>
              </div>
            </div>

            <div className="stats">
              {stats.map(([label, value, detail]) => (
                <div className="stat" key={label}>
                  <small>{label}</small>
                  <strong>{value}</strong>
                  <span>{detail}</span>
                </div>
              ))}
            </div>

            <div className="grid">
              <div className="panel">
                <div className="panel-head">
                  <div><small>CONTENT PIPELINE</small><h3>Recent drafts</h3></div>
                  <button onClick={() => openTab("Content Calendar")}>View all <ChevronRight size={15} /></button>
                </div>

                {drafts.length === 0 ? (
                  <div className="empty-inline">No drafts yet. Create your first one in AI Studio.</div>
                ) : drafts.slice(0, 4).map((post) => (
                  <div className="post" key={post.id}>
                    <div className="platform">{(post.platform || "AI").slice(0, 2)}</div>
                    <div className="post-main">
                      <b>{post.title || "Untitled draft"}</b>
                      <small>{post.platform || "Multi-platform"} · {statusLabel(post.status)}</small>
                    </div>
                    <span className={`status ${post.status === "approved" ? "approved" : post.status === "in_review" ? "needs-review" : "draft"}`}>
                      {statusLabel(post.status)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="panel">
                <div className="panel-head">
                  <div><small>BRAND</small><h3>{brandName}</h3></div>
                  <Sparkles size={18} />
                </div>
                <div className="recommend">
                  <div className="rec-icon"><BrainCircuit size={20} /></div>
                  <b>Brand Brain ready</b>
                  <p>Your workspace is connected. Generate content now; brand voice controls can be configured next.</p>
                  <button onClick={() => openTab("AI Studio")}>Create content <ChevronRight size={15} /></button>
                </div>
              </div>
            </div>
          </>
        )}

        {tab === "AI Studio" && (
          <div className="studio">
            <div className="studio-copy">
              <span className="eyebrow">AI CONTENT STUDIO</span>
              <h2>Tell the agent what<br />you want to achieve.</h2>
              <p>Generate a draft, save it, then submit it for human approval before any publishing action.</p>
            </div>

            <div className="composer">
              <div className="composer-top">
                <Sparkles size={18} />
                <span>Content Agent</span>
                <span className="auto">Approval-first</span>
              </div>
              <textarea
                value={idea}
                onChange={(event) => setIdea(event.target.value)}
                placeholder="e.g. Create a LinkedIn post explaining why AI agents need human governance..."
              />
              <div className="composer-foot">
                <span>AI generation · no publishing without approval</span>
                <button className="primary" disabled={loading} onClick={generate}>
                  {loading ? "Thinking…" : <>Generate <Send size={15} /></>}
                </button>
              </div>
            </div>

            {generated && (
              <div className="result">
                <div className="panel-head">
                  <div><small>GENERATED DRAFT</small><h3>{draftStatus === "in_review" ? "Awaiting approval" : "Ready for review"}</h3></div>
                  <span className={`status ${draftStatus === "approved" ? "approved" : draftStatus === "in_review" ? "needs-review" : "draft"}`}>
                    {statusLabel(draftStatus)}
                  </span>
                </div>
                <p>{generated}</p>
                <div className="result-actions">
                  {!draftId && (
                    <button onClick={saveDraft} disabled={saving}>
                      {saving ? "Saving…" : "Save draft"}
                    </button>
                  )}
                  {draftId && draftStatus === "draft" && (
                    <button className="primary" onClick={() => reviewDraft(draftId, "submit")} disabled={reviewing}>
                      {reviewing ? "Submitting…" : <>Send to approval <ChevronRight size={15} /></>}
                    </button>
                  )}
                  {draftId && draftStatus === "in_review" && (
                    <>
                      <button onClick={() => reviewDraft(draftId, "reject")} disabled={reviewing}><X size={14} /> Reject</button>
                      <button className="primary" onClick={() => reviewDraft(draftId, "approve")} disabled={reviewing}>
                        <Check size={14} /> Approve
                      </button>
                    </>
                  )}
                  {draftId && draftStatus === "approved" && (
                    <span className="approval-note"><Check size={15} /> Approved — publishing adapter comes next.</span>
                  )}
                </div>
                {authError && <div className="auth-message error" style={{ marginTop: 12 }}>{authError}</div>}
              </div>
            )}
          </div>
        )}

        {tab === "Content Calendar" && (
          <div className="calendar-view">
            <div className="panel">
              <div className="panel-head">
                <div><small>CONTENT WORKSPACE</small><h3>Draft & approval queue</h3></div>
                <button onClick={() => openTab("AI Studio")}>New draft <Plus size={15} /></button>
              </div>
              {drafts.length === 0 ? (
                <div className="empty-inline">No content yet. Start with an idea in AI Studio.</div>
              ) : drafts.map((draft) => (
                <div className="draft-row" key={draft.id}>
                  <div className="draft-copy">
                    <b>{draft.title || "Untitled draft"}</b>
                    <small>{draft.platform || "Multi-platform"} · Updated {new Date(draft.updated_at).toLocaleString()}</small>
                    <p>{draft.caption}</p>
                  </div>
                  <div className="draft-actions">
                    <span className={`status ${draft.status === "approved" ? "approved" : draft.status === "in_review" ? "needs-review" : "draft"}`}>
                      {statusLabel(draft.status)}
                    </span>
                    {draft.status === "draft" && (
                      <button onClick={() => reviewDraft(draft.id, "submit")} disabled={reviewing}>Submit</button>
                    )}
                    {draft.status === "in_review" && (
                      <>
                        <button onClick={() => reviewDraft(draft.id, "reject")} disabled={reviewing}>Reject</button>
                        <button className="primary" onClick={() => reviewDraft(draft.id, "approve")} disabled={reviewing}>Approve</button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "Brand Brain" && (
          <div className="brand-settings">
            <div className="studio-copy">
              <span className="eyebrow">BRAND INTELLIGENCE</span>
              <h2>Teach the agent<br />how your brand speaks.</h2>
              <p>These instructions are applied to future content generation for this workspace.</p>
            </div>

            <div className="brand-form panel">
              <div className="form-section">
                <label>Brand name<input value={brandName} onChange={(e) => { setBrandName(e.target.value); setBrandSaved(false); }} placeholder="Your brand" /></label>
                <label>Brand voice<textarea value={brandVoice} onChange={(e) => { setBrandVoice(e.target.value); setBrandSaved(false); }} placeholder="e.g. Clear, confident, practical, warm. Avoid hype and jargon." /></label>
              </div>
              <div className="form-section">
                <label>What does the brand do?<textarea value={brandDescription} onChange={(e) => { setBrandDescription(e.target.value); setBrandSaved(false); }} placeholder="Describe the product, service, positioning, and important context." /></label>
                <label>Target audience<textarea value={brandAudience} onChange={(e) => { setBrandAudience(e.target.value); setBrandSaved(false); }} placeholder="Who should the content speak to?" /></label>
              </div>
              <div className="brand-form-foot">
                <span>{brandSaved ? "Brand Brain saved. New generations will use these instructions." : "Changes affect future AI generations."}</span>
                <button className="primary" onClick={saveBrand} disabled={brandSaving}>{brandSaving ? "Saving…" : "Save Brand Brain"}</button>
              </div>
              {authError && <div className="auth-message error">{authError}</div>}
            </div>
          </div>
        )}

        {["Engagement", "Analytics", "Audience"].includes(tab) && (
          <div className="empty">
            <Sparkles size={30} />
            <h2>{tab}</h2>
            <p>Connect social accounts to unlock this module. The MVP currently focuses on content generation and human approval.</p>
            <button className="primary" onClick={() => openTab("AI Studio")}>Try AI Studio</button>
          </div>
        )}
      </section>
    </main>
  );
}
