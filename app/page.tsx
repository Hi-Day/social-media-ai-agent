"use client";

import { useEffect, useState, type FormEvent } from "react";
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
  CreditCard,
} from "lucide-react";

const navigation = [
  { icon: LayoutDashboard, name: "Overview" },
  { icon: CalendarDays, name: "Content Calendar" },
  { icon: BrainCircuit, name: "AI Studio" },
  { icon: Sparkles, name: "Campaigns" },
  { icon: MessageSquare, name: "Engagement" },
  { icon: TrendingUp, name: "Analytics" },
  { icon: Users, name: "Audience" },
  { icon: BrainCircuit, name: "Brand Brain" },
  { icon: BrainCircuit, name: "Learning Loop" },
  { icon: Settings, name: "Model Registry" },
  { icon: CreditCard, name: "Usage & Costs" },
];

type ModelPolicy = {
  capability: "text" | "image" | "video" | "voice" | "stt";
  default_codename: string;
  enabled_codenames: string[];
};

type LearningMemory = { id: string; memory_type: string; memory_key: string; content: Record<string, unknown>; approved: boolean; status: string };
type LearningInsight = { id: string; finding: string; confidence: number | null; insight_type: string; created_at: string; campaign_id: string | null };
type LearningRecommendation = { id: string; title: string; rationale: string; status: string; priority: string; risk_level: string; campaign_id: string | null; expires_at: string | null };
type LearningObservation = { id: string; metric_key: string; platform: string; value: number; observed_at: string; source_type: string };
type CampaignChoice = { id: string; name: string; status: string };
type UsageData = {
  limit: number;
  note: string;
  summary: {
    recordedAttempts: number;
    totalEstimatedCredits: number;
    generated: number;
    media_pending: number;
    failed: number;
    knownProviderCostUsd: number;
    totalKnownTokens: number;
    providerReportedEvents: number;
    partialCostEvents: number;
    costUnknownEvents: number;
    demoEvents: number;
    byModel: Record<string, { events: number; estimatedCredits: number; knownProviderCostUsd: number; providerCostEvents: number }>;
  };
  events: Array<{ campaign_id: string; content_draft_id: string; model_codename: string | null; estimated_credits: number; result_status: string; provider_cost_usd: number | null; cost_source: string; total_tokens: number | null; created_at: string }>;
};
type UsageBudgetData = {
  budget_configured: boolean;
  monthly_credit_limit: number | null;
  hard_limit: boolean;
  used_credits: number;
  reserved_credits: number;
  remaining_credits: number | null;
  editable: boolean;
};

type Draft = {
  id: string;
  workspace_id: string;
  title: string | null;
  platform: string | null;
  caption: string;
  status: string;
  created_at: string;
  updated_at: string;
  generation_status?: string;
  generation_error?: string | null;
  media_status?: string | null;
  media_url?: string | null;
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
  const [campaignName, setCampaignName] = useState("");
  const [campaignObjective, setCampaignObjective] = useState("");
  const [campaignAudience, setCampaignAudience] = useState("");
  const [campaignMode, setCampaignMode] = useState<"automatic" | "manual">("automatic");
  const [modelOverrides, setModelOverrides] = useState({ text: "Balance", image: "Balance", video: "Pro" });
  const [campaignPackages, setCampaignPackages] = useState<Array<{code:string;name:string;description:string;estimated_credits:number;estimated_duration_minutes:number;recommended:boolean;content_plan:Array<{platform:string;type:string;count:number;codename:string}>}>>([]);
  const [campaignId, setCampaignId] = useState("");
  const [selectedPackage, setSelectedPackage] = useState("");
  const [campaignLoading, setCampaignLoading] = useState(false);
  const [campaignExecutionLoading, setCampaignExecutionLoading] = useState(false);
  const [campaignExecutionMessage, setCampaignExecutionMessage] = useState("");
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
  const [brandPillars, setBrandPillars] = useState("");
  const [brandDoRules, setBrandDoRules] = useState("");
  const [brandCtaStyle, setBrandCtaStyle] = useState("");
  const [brandForbiddenTopics, setBrandForbiddenTopics] = useState("");
  const [brandHashtagStrategy, setBrandHashtagStrategy] = useState("");
  const [brandExamplePosts, setBrandExamplePosts] = useState("");
  const [brandPlatformGuidance, setBrandPlatformGuidance] = useState("");
  const [brandSaving, setBrandSaving] = useState(false);
  const [brandSaved, setBrandSaved] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [modelPolicies, setModelPolicies] = useState<ModelPolicy[]>([]);
  const [modelRegistryEditable, setModelRegistryEditable] = useState(false);
  const [modelRegistrySaving, setModelRegistrySaving] = useState(false);
  const [modelRegistrySaved, setModelRegistrySaved] = useState(false);
  const [learningData, setLearningData] = useState<{ memories: LearningMemory[]; insights: LearningInsight[]; recommendations: LearningRecommendation[]; observations: LearningObservation[] }>({ memories: [], insights: [], recommendations: [], observations: [] });
  const [learningLoading, setLearningLoading] = useState(false);
  const [learningBusy, setLearningBusy] = useState(false);
  const [learningMessage, setLearningMessage] = useState("");
  const [learningError, setLearningError] = useState("");
  const [metricPlatform, setMetricPlatform] = useState("instagram");
  const [metricKey, setMetricKey] = useState("engagement_rate");
  const [metricValue, setMetricValue] = useState("");
  const [metricObservedAt, setMetricObservedAt] = useState("");
  const [memoryKey, setMemoryKey] = useState("");
  const [memoryContent, setMemoryContent] = useState("");
  const [learningCampaignId, setLearningCampaignId] = useState("");
  const [campaignChoices, setCampaignChoices] = useState<CampaignChoice[]>([]);
  const [canManageLearning, setCanManageLearning] = useState(false);
  const [usageData, setUsageData] = useState<UsageData | null>(null);
  const [usageLoading, setUsageLoading] = useState(false);
  const [usageError, setUsageError] = useState("");
  const [usageBudget, setUsageBudget] = useState<UsageBudgetData | null>(null);
  const [budgetLimitInput, setBudgetLimitInput] = useState("");
  const [budgetHardLimitInput, setBudgetHardLimitInput] = useState(true);
  const [budgetSaving, setBudgetSaving] = useState(false);
  const [budgetMessage, setBudgetMessage] = useState("");
  const [budgetError, setBudgetError] = useState("");

  const router = useRouter();

  async function loadLearning(id = workspaceId) {
    if (!id) return;
    setLearningLoading(true);
    setLearningError("");
    try {
      const response = await fetch(`/api/agent/learning?workspaceId=${encodeURIComponent(id)}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to load learning data.");
      setLearningData({ memories: data.memories ?? [], insights: data.insights ?? [], recommendations: data.recommendations ?? [], observations: data.observations ?? [] });
    } catch (error) {
      setLearningError(error instanceof Error ? error.message : "Unable to load learning data.");
    } finally {
      setLearningLoading(false);
    }
  }

  async function runLearningAction(action: string, extra: Record<string, unknown> = {}) {
    if (!workspaceId) return;
    setLearningBusy(true); setLearningError(""); setLearningMessage("");
    try {
      const response = await fetch("/api/agent/learning", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ workspaceId, action, ...extra }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Learning action failed.");
      setLearningMessage(data.message || "Action completed.");
      await loadLearning(workspaceId);
      return data;
    } catch (error) {
      setLearningError(error instanceof Error ? error.message : "Learning action failed.");
      return null;
    } finally { setLearningBusy(false); }
  }

  async function saveObservation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!metricObservedAt || metricValue.trim() === "") { setLearningError("Enter a metric value and observation date."); return; }
    const result = await runLearningAction("observe", { observations: [{ metricKey, platform: metricPlatform, value: Number(metricValue), observedAt: new Date(metricObservedAt).toISOString() }] });
    if (result) setMetricValue("");
  }

  async function saveMemory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (memoryKey.trim().length < 2 || memoryContent.trim().length < 2) { setLearningError("Enter a memory key and content."); return; }
    const result = await runLearningAction("remember", { memoryType: "semantic", key: memoryKey.trim(), content: { note: memoryContent.trim() } });
    if (result) { setMemoryKey(""); setMemoryContent(""); }
  }

  useEffect(() => {
    if (tab === "Learning Loop" && workspaceId) void loadLearning(workspaceId);
    if (tab === "Usage & Costs" && workspaceId) void loadUsage(workspaceId);
  }, [tab, workspaceId]);

  async function loadDrafts(id = workspaceId) {
    if (!id) return;
    const response = await fetch(`/api/content/drafts?workspaceId=${encodeURIComponent(id)}`, {
      cache: "no-store",
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Unable to load drafts.");
    setDrafts(data.drafts ?? []);
  }

  async function loadUsage(id = workspaceId) {
    if (!id) return;
    setUsageLoading(true);
    setUsageError("");
    try {
      const response = await fetch(`/api/usage?workspaceId=${encodeURIComponent(id)}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to load usage history.");
      setUsageData(data as UsageData);
    } catch (error) {
      setUsageError(error instanceof Error ? error.message : "Unable to load usage history.");
    } finally {
      setUsageLoading(false);
    }

    try {
      const response = await fetch(`/api/usage/budget?workspaceId=${encodeURIComponent(id)}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to load budget settings.");
      const budget = data.budget as UsageBudgetData | null;
      setUsageBudget(budget);
      if (budget?.monthly_credit_limit != null) setBudgetLimitInput(String(budget.monthly_credit_limit));
      setBudgetHardLimitInput(budget?.hard_limit ?? true);
      setBudgetError("");
    } catch (error) {
      setBudgetError(error instanceof Error ? error.message : "Unable to load budget settings.");
    }
  }

  async function saveUsageBudget(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!workspaceId || !budgetLimitInput.trim()) return;
    setBudgetSaving(true);
    setBudgetMessage("");
    setBudgetError("");
    try {
      const response = await fetch("/api/usage/budget", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ workspaceId, monthlyCreditLimit: Number(budgetLimitInput), hardLimit: budgetHardLimitInput }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to save budget.");
      setBudgetMessage("Monthly credit budget saved.");
      await loadUsage(workspaceId);
    } catch (error) {
      setBudgetError(error instanceof Error ? error.message : "Unable to save budget.");
    } finally {
      setBudgetSaving(false);
    }
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
        setCanManageLearning(["owner", "admin"].includes(workspaceData.role));
        const { data: campaigns } = await supabase.from("campaigns").select("id,name,status").eq("workspace_id", workspaceData.workspace.id).order("created_at", { ascending: false }).limit(50);
        if (mounted) {
          const options = (campaigns ?? []) as CampaignChoice[];
          setCampaignChoices(options);
          if (options.length) setLearningCampaignId((current) => current || options[0].id);
        }
        const modelResponse = await fetch(
          `/api/model-registry?workspaceId=${encodeURIComponent(workspaceData.workspace.id)}`,
          { cache: "no-store" },
        );
        const modelData = await modelResponse.json();
        if (modelResponse.ok) {
          setModelPolicies(modelData.policies ?? []);
          setModelRegistryEditable(Boolean(modelData.editable));
        }
        setWorkspaceName(workspaceData.workspace.name);
        setBrandName(workspaceData.brand?.name ?? workspaceData.workspace.name);
        setBrandVoice(workspaceData.brand?.voice ?? "");
        setBrandDescription(workspaceData.brand?.description ?? "");
        setBrandAudience(workspaceData.brand?.audience ?? "");
        setBrandPillars(workspaceData.brand?.pillars ?? "");
        setBrandDoRules(workspaceData.brand?.do_rules ?? "");
        setBrandCtaStyle(workspaceData.brand?.cta_style ?? "");
        setBrandForbiddenTopics(workspaceData.brand?.forbidden_topics ?? "");
        setBrandHashtagStrategy(workspaceData.brand?.hashtag_strategy ?? "");
        setBrandExamplePosts(workspaceData.brand?.example_posts ?? "");
        setBrandPlatformGuidance(workspaceData.brand?.platform_guidance ?? "");
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

  async function saveModelRegistry() {
    if (!workspaceId || !modelPolicies.length) return;
    setModelRegistrySaving(true);
    setModelRegistrySaved(false);
    setAuthError("");

    try {
      const response = await fetch("/api/model-registry", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ workspaceId, policies: modelPolicies }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to save model policy.");
      setModelPolicies(data.policies ?? modelPolicies);
      setModelRegistrySaved(true);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Unable to save model policy.");
    } finally {
      setModelRegistrySaving(false);
    }
  }

  function toggleModel(capability: ModelPolicy["capability"], codename: string) {
    if (!modelRegistryEditable) return;
    setModelRegistrySaved(false);
    setModelPolicies((current) =>
      current.map((policy) => {
        if (policy.capability !== capability) return policy;
        const enabled = policy.enabled_codenames.includes(codename)
          ? policy.enabled_codenames.filter((item) => item !== codename)
          : [...policy.enabled_codenames, codename];
        if (!enabled.length) return policy;
        return {
          ...policy,
          enabled_codenames: enabled,
          default_codename: enabled.includes(policy.default_codename)
            ? policy.default_codename
            : enabled[0],
        };
      }),
    );
  }

  function setDefaultModel(capability: ModelPolicy["capability"], codename: string) {
    if (!modelRegistryEditable) return;
    setModelRegistrySaved(false);
    setModelPolicies((current) =>
      current.map((policy) =>
        policy.capability === capability &&
        policy.enabled_codenames.includes(codename)
          ? { ...policy, default_codename: codename }
          : policy,
      ),
    );
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
          pillars: brandPillars,
          doRules: brandDoRules,
          ctaStyle: brandCtaStyle,
          forbiddenTopics: brandForbiddenTopics,
          hashtagStrategy: brandHashtagStrategy,
          examplePosts: brandExamplePosts,
          platformGuidance: brandPlatformGuidance,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to save Brand Brain.");
      setBrandName(data.brand.name);
      setBrandVoice(data.brand.voice ?? "");
      setBrandDescription(data.brand.description ?? "");
      setBrandAudience(data.brand.audience ?? "");
      setBrandPillars(data.brand.pillars ?? "");
      setBrandDoRules(data.brand.do_rules ?? "");
      setBrandCtaStyle(data.brand.cta_style ?? "");
      setBrandForbiddenTopics(data.brand.forbidden_topics ?? "");
      setBrandHashtagStrategy(data.brand.hashtag_strategy ?? "");
      setBrandExamplePosts(data.brand.example_posts ?? "");
      setBrandPlatformGuidance(data.brand.platform_guidance ?? "");
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

  async function chooseCampaignPackage(code: string) {
    if (!workspaceId || !campaignId || selectedPackage) return;
    setCampaignLoading(true);
    setAuthError("");
    try {
      const response = await fetch("/api/campaign/select", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ workspaceId, campaignId, packageCode: code }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to select campaign package.");
      setSelectedPackage(code);
      setAuthError("");
      await loadDrafts();
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Unable to select campaign package.");
    } finally {
      setCampaignLoading(false);
    }
  }

  async function executeCampaign() {
    if (!workspaceId || !campaignId || !selectedPackage) return;
    setCampaignExecutionLoading(true);
    setCampaignExecutionMessage("");
    setAuthError("");
    try {
      const response = await fetch("/api/campaign/execute", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ workspaceId, campaignId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to execute campaign.");
      setCampaignExecutionMessage(
        `Generated copy for ${data.generated} task${data.generated === 1 ? "" : "s"}.` +
        (data.mediaPending ? ` ${data.mediaPending} required media asset${data.mediaPending === 1 ? "" : "s"} could not be generated; review the flagged drafts before publishing.` : "") +
        (data.remaining ? ` ${data.remaining} task${data.remaining === 1 ? "" : "s"} remain for the next execution batch.` : "")
      );
      await loadDrafts();
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Unable to execute campaign.");
    } finally {
      setCampaignExecutionLoading(false);
    }
  }

  async function planCampaign() {
    if (!workspaceId || !campaignName.trim() || !campaignObjective.trim()) return;
    setCampaignLoading(true);
    setAuthError("");
    try {
      const response = await fetch("/api/campaign/plan", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          workspaceId,
          name: campaignName,
          objective: campaignObjective,
          audience: campaignAudience,
          modelMode: campaignMode,
          modelOverrides,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to plan campaign.");
      setCampaignId(data.campaign?.id ?? "");
      setSelectedPackage("");
      setCampaignPackages(data.packages ?? []);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Unable to plan campaign.");
    } finally {
      setCampaignLoading(false);
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
                  <p>{brandVoice || brandPillars ? "Your generation rules are configured. The agent will apply them to new drafts." : "Your workspace is connected. Add brand rules to make generated content more consistent."}</p>
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

        {tab === "Campaigns" && (
          <div className="campaign-view">
            <div className="studio-copy">
              <span className="eyebrow">CAMPAIGN PLANNER</span>
              <h2>Plan the campaign,<br />not just the caption.</h2>
              <p>The agent turns your objective into content packages, model choices and an estimated AI budget.</p>
            </div>
            <div className="campaign-form panel">
              <div className="form-section">
                <label>Campaign name<input value={campaignName} onChange={(e) => setCampaignName(e.target.value)} placeholder="e.g. New Product Launch" /></label>
                <label>Audience<textarea value={campaignAudience} onChange={(e) => setCampaignAudience(e.target.value)} placeholder="Who should this campaign reach?" /></label>
              </div>
              <label className="campaign-objective">Objective<textarea value={campaignObjective} onChange={(e) => setCampaignObjective(e.target.value)} placeholder="e.g. Build awareness and drive qualified registrations for our new AI course." /></label>
              <div className="model-mode">
                <div><b>Model selection</b><small>Use product codenames only. Underlying models stay behind the registry.</small></div>
                <div className="mode-buttons">
                  <button className={campaignMode === "automatic" ? "selected" : ""} onClick={() => setCampaignMode("automatic")}>🤖 Campaign Agent decides</button>
                  <button className={campaignMode === "manual" ? "selected" : ""} onClick={() => setCampaignMode("manual")}>Manual tiers</button>
                </div>
              </div>
              <div className="brand-form-foot">
                <span>Three package options will be estimated before execution.</span>
                <button className="primary" onClick={planCampaign} disabled={campaignLoading}>{campaignLoading ? "Planning…" : "Generate campaign options"}</button>
              </div>
              {authError && <div className="auth-message error">{authError}</div>}
            </div>

            {campaignPackages.length > 0 && (
              <div className="package-grid">
                {campaignPackages.map((pkg) => (
                  <div className={`package-card ${pkg.recommended ? "recommended" : ""}`} key={pkg.code}>
                    {pkg.recommended && <span className="package-badge">RECOMMENDED</span>}
                    <small>CAMPAIGN PACKAGE</small>
                    <h3>{pkg.name}</h3>
                    <p>{pkg.description}</p>
                    <div className="package-cost"><strong>{pkg.estimated_credits}</strong><span>credits est.</span></div>
                    {selectedPackage === pkg.code && (
                      <>
                        <div className="package-selected">✓ Selected — content tasks ready</div>
                        <button className="primary campaign-execute" onClick={executeCampaign} disabled={campaignExecutionLoading}>
                          {campaignExecutionLoading ? "Generating…" : "Generate campaign content"}
                        </button>
                        {campaignExecutionMessage && <div className="package-execution-note">{campaignExecutionMessage}</div>}
                      </>
                    )}
                    <div className="package-time">~{pkg.estimated_duration_minutes} min generation</div>
                    <div className="package-items">
                      {pkg.content_plan.map((item, index) => (
                        <div key={index}><span>{item.count}× {item.platform} {item.type}</span><b>{item.codename}</b></div>
                      ))}
                    </div>
                    <button className={pkg.recommended ? "primary" : ""} disabled={campaignLoading || Boolean(selectedPackage)} onClick={() => chooseCampaignPackage(pkg.code)}>{selectedPackage === pkg.code ? "Selected" : `Choose ${pkg.name}`}</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {["Engagement", "Analytics", "Audience"].includes(tab) && (
          <div className="panel">
            <div className="panel-head">
              <div>
                <small>WORKSPACE MODULE</small>
                <h3>{tab}</h3>
              </div>
              <span className="status">Not connected</span>
            </div>
            {tab === "Engagement" && (
              <div className="empty-inline">
                Social inbox, comment replies, and moderation actions are not active until a supported social account provider is connected. No messages have been fetched or actions sent.
              </div>
            )}
            {tab === "Analytics" && (
              <div className="empty-inline">
                Live reach, engagement, and conversion metrics are not connected yet. We will not display fabricated numbers; connect a platform data source before using this dashboard for decisions.
              </div>
            )}
            {tab === "Audience" && (
              <div className="empty-inline">
                Audience demographics and behavior insights require authorized platform data and sufficient history. This module is waiting for that connection.
              </div>
            )}
            <div className="brand-form-foot">
              <span>Module availability is shown explicitly to avoid implying a live integration.</span>
              <button onClick={() => openTab("Overview")}>Back to Overview</button>
            </div>
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
                    <small>{draft.platform || "Multi-platform"} · {draft.generation_status && draft.generation_status !== "pending" ? statusLabel(draft.generation_status) + " · " : ""}Updated {new Date(draft.updated_at).toLocaleString()}</small>
                    <p>{draft.caption}</p>
                    {draft.media_status === "generated" && draft.media_url && (
                      <a className="media-preview" href={draft.media_url} target="_blank" rel="noreferrer">
                        View generated visual
                      </a>
                    )}
                    {draft.generation_error && (
                      <div className="auth-message error" role="status">
                        {draft.generation_error}
                      </div>
                    )}
                    {draft.media_status && !["generated", "not_required"].includes(draft.media_status) && !draft.generation_error && (
                      <div className="auth-message error" role="status">
                        {draft.media_status === "pending"
                          ? "Required media has not been generated yet. This draft cannot be submitted for approval."
                          : draft.media_status === "provider_unavailable"
                            ? "Required media provider is unavailable. Supply the asset before approval."
                            : "Required media has failed. Retry generation or supply the asset before approval."}
                      </div>
                    )}
                  </div>
                  <div className="draft-actions">
                    <span className={`status ${draft.status === "approved" ? "approved" : draft.status === "in_review" ? "needs-review" : "draft"}`}>
                      {statusLabel(draft.status)}
                    </span>
                    {draft.status === "draft" && (
                      <button onClick={() => reviewDraft(draft.id, "submit")} disabled={reviewing || Boolean(draft.media_status && !["generated", "not_required"].includes(draft.media_status))}>Submit</button>
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

        {tab === "Learning Loop" && (
          <div className="learning-view">
            <div className="studio-copy">
              <span className="eyebrow">MEASURE · LEARN · REPLAN</span>
              <h2>Turn campaign outcomes<br />into better decisions.</h2>
              <p>Capture observations, inspect evidence-backed findings, and approve recommendations before they influence a campaign plan.</p>
            </div>
            {learningError && <div className="learning-message learning-error">{learningError}</div>}
            {learningMessage && <div className="learning-message">{learningMessage}</div>}
            <div className="learning-grid">
              <div className="panel">
                <div className="panel-head"><div><small>PERFORMANCE DATA</small><h3>Record an observation</h3></div><span className="status">Manual</span></div>
                <p className="learning-note">Metrics entered here are labelled manual, not platform-verified. For a trend, enter at least two observations in each of the previous and current seven-day windows for the same platform and metric.</p>
                <form className="learning-form" onSubmit={saveObservation}>
                  <label>Platform<select value={metricPlatform} onChange={(e) => setMetricPlatform(e.target.value)}><option value="instagram">Instagram</option><option value="facebook">Facebook</option><option value="linkedin">LinkedIn</option><option value="tiktok">TikTok</option><option value="youtube">YouTube</option><option value="x">X</option><option value="other">Other</option></select></label>
                  <label>Metric<select value={metricKey} onChange={(e) => setMetricKey(e.target.value)}><option value="engagement_rate">Engagement rate</option><option value="impressions">Impressions</option><option value="reach">Reach</option><option value="likes">Likes</option><option value="comments">Comments</option><option value="shares">Shares</option><option value="saves">Saves</option><option value="clicks">Clicks</option><option value="conversions">Conversions</option></select></label>
                  <label>Value<input type="number" min="0" step="0.0001" value={metricValue} onChange={(e) => setMetricValue(e.target.value)} required placeholder="e.g. 3.4" /></label>
                  <label>Observed at<input type="datetime-local" value={metricObservedAt} onChange={(e) => setMetricObservedAt(e.target.value)} required /></label>
                  <div className="wide"><button className="primary" disabled={learningBusy}>{learningBusy ? "Saving…" : "Save observation"}</button></div>
                </form>
                <div className="panel-head" style={{ marginTop: 20 }}><div><small>RECENT OBSERVATIONS</small><h3>{learningData.observations.length} records</h3></div></div>
                <div className="learning-observation-list">
                  {learningData.observations.slice(0, 8).map((item) => <div className="learning-observation" key={item.id}><span><b>{item.platform} · {item.metric_key}</b><small>{new Date(item.observed_at).toLocaleString()} · {item.source_type}</small></span><strong>{item.value}</strong></div>)}
                  {!learningData.observations.length && <p className="learning-note">No observations yet.</p>}
                </div>
              </div>
              <div className="panel">
                <div className="panel-head"><div><small>PERSISTENT MEMORY</small><h3>Capture a brand or campaign fact</h3></div></div>
                <p className="learning-note">New memories remain unapproved until an owner/admin validates them. Do not enter secrets or personal data.</p>
                <form className="learning-form" onSubmit={saveMemory}>
                  <label className="wide">Memory key<input value={memoryKey} onChange={(e) => setMemoryKey(e.target.value)} maxLength={120} required placeholder="e.g. preferred_cta_style" /></label>
                  <label className="wide">Memory content<textarea value={memoryContent} onChange={(e) => setMemoryContent(e.target.value)} maxLength={4000} required placeholder="A concise, verifiable preference or lesson" /></label>
                  <div className="wide"><button className="primary" disabled={learningBusy}>{learningBusy ? "Saving…" : "Save unapproved memory"}</button></div>
                </form>
                <div className="panel-head" style={{ marginTop: 20 }}><div><small>ACTIVE MEMORIES</small><h3>{learningData.memories.length} records</h3></div></div>
                <div className="learning-list">
                  {learningData.memories.slice(0, 6).map((memory) => <div className="learning-item" key={memory.id}><h4>{memory.memory_key} <span className={memory.approved ? "status approved" : "status needs-review"}>{memory.approved ? "Approved" : "Needs review"}</span></h4><p>{String(memory.content?.note ?? JSON.stringify(memory.content))}</p>{canManageLearning && !memory.approved && <div className="learning-actions"><button onClick={() => void runLearningAction("approve-memory", { memoryId: memory.id })} disabled={learningBusy}>Approve memory</button><button onClick={() => void runLearningAction("archive-memory", { memoryId: memory.id })} disabled={learningBusy}>Archive</button></div>}</div>)}
                  {!learningData.memories.length && <p className="learning-note">No memories yet.</p>}
                </div>
              </div>
            </div>
            <div className="panel learning-full">
              <div className="panel-head"><div><small>PERFORMANCE INTELLIGENCE</small><h3>Insights and recommendations</h3></div><button onClick={() => void loadLearning()} disabled={learningLoading}>{learningLoading ? "Refreshing…" : "Refresh"}</button></div>
              <div className="learning-form" style={{ marginBottom: 18 }}>
                <label>Associate analysis with campaign<select value={learningCampaignId} onChange={(e) => setLearningCampaignId(e.target.value)}><option value="">Workspace-wide analysis</option>{campaignChoices.map((campaign) => <option value={campaign.id} key={campaign.id}>{campaign.name} · {campaign.status}</option>)}</select></label>
                <div style={{ alignSelf: "end" }}><button className="primary" onClick={() => void runLearningAction("analyze", learningCampaignId ? { campaignId: learningCampaignId } : {})} disabled={learningBusy}>{learningBusy ? "Analyzing…" : "Analyze last 14 days"}</button></div>
              </div>
              <div className="learning-grid">
                <div><small>INSIGHTS ({learningData.insights.length})</small><div className="learning-list">{learningData.insights.slice(0, 8).map((insight) => <div className="learning-item" key={insight.id}><h4>{insight.insight_type.replaceAll("_", " ")}</h4><p>{insight.finding}</p><small>Confidence {insight.confidence == null ? "n/a" : Math.round(insight.confidence * 100) + "%"}</small></div>)}{!learningData.insights.length && <p className="learning-note">Insights appear when there is enough comparable data and a meaningful change.</p>}</div></div>
                <div><small>RECOMMENDATIONS ({learningData.recommendations.length})</small><div className="learning-list">{learningData.recommendations.slice(0, 8).map((rec) => <div className="learning-item" key={rec.id}><h4>{rec.title} <span className="status">{rec.status}</span></h4><p>{rec.rationale}</p><small>Priority: {rec.priority} · Risk: {rec.risk_level}</small>{canManageLearning && rec.status === "proposed" && <div className="learning-actions"><button onClick={() => void runLearningAction("approve-recommendation", { recommendationId: rec.id })} disabled={learningBusy}>Approve</button><button onClick={() => void runLearningAction("reject-recommendation", { recommendationId: rec.id })} disabled={learningBusy}>Reject</button></div>}</div>)}{!learningData.recommendations.length && <p className="learning-note">No recommendations yet.</p>}</div></div>
              </div>
              {canManageLearning && <div className="learning-actions"><button className="primary" onClick={() => void runLearningAction("replan", { campaignId: learningCampaignId })} disabled={learningBusy || !learningCampaignId}>Create proposed campaign replan</button><span className="learning-note">Requires an approved, unexpired recommendation linked to the selected campaign. It never publishes or schedules content.</span></div>}
            </div>
          </div>
        )}

        {tab === "Usage & Costs" && (
          <div className="learning-view">
            <div className="studio-copy">
              <span className="eyebrow">USAGE · ESTIMATES · CONTROL</span>
              <h2>Know what your AI<br />workflows consume.</h2>
              <p>Track product credits used by campaign generation, with results grouped by model tier and task outcome.</p>
            </div>
            {usageError && <div className="learning-message learning-error" role="alert">{usageError}</div>}
            <div className="learning-grid">
              <div className="panel">
                <small>ESTIMATED PRODUCT CREDITS</small>
                <h3>{usageLoading && !usageData ? "Loading…" : usageData ? usageData.summary.totalEstimatedCredits.toLocaleString(undefined, { maximumFractionDigits: 4 }) : "—"}</h3>
                <p>Credits recorded across the latest {usageData?.limit ?? 500} attempts.</p>
              </div>
              <div className="panel">
                <small>GENERATED</small>
                <h3>{usageData?.summary.generated ?? "—"}</h3>
                <p>Attempts completed successfully.</p>
              </div>
              <div className="panel">
                <small>MEDIA PENDING</small>
                <h3>{usageData?.summary.media_pending ?? "—"}</h3>
                <p>Content needs a required media asset.</p>
              </div>
              <div className="panel">
                <small>FAILED</small>
                <h3>{usageData?.summary.failed ?? "—"}</h3>
                <p>Attempts that ended in failure.</p>
              </div>
              <div className="panel">
                <small>KNOWN PROVIDER COST (USD)</small>
                <h3>{usageData ? usageData.summary.knownProviderCostUsd.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 6 }) : "—"}</h3>
                <p>Only gateway-reported cost; partial totals may be incomplete.</p>
              </div>
              <div className="panel">
                <small>KNOWN TOKENS</small>
                <h3>{usageData ? usageData.summary.totalKnownTokens.toLocaleString() : "—"}</h3>
                <p>Token totals returned by the gateway.</p>
              </div>
              <div className="panel">
                <small>COST COVERAGE</small>
                <h3>{usageData ? `${usageData.summary.providerReportedEvents} complete · ${usageData.summary.partialCostEvents} partial` : "—"}</h3>
                <p>{usageData ? `${usageData.summary.costUnknownEvents} unknown · ${usageData.summary.demoEvents} demo` : "Provider cost availability"}</p>
              </div>
            </div>
            <div className="panel" style={{ marginTop: 16 }}>
              <div className="model-registry-head">
                <div><small>BREAKDOWN</small><h3>Usage by model tier</h3></div>
                <button onClick={() => void loadUsage()} disabled={usageLoading}>{usageLoading ? "Refreshing…" : "Refresh"}</button>
              </div>
              {!usageData && !usageLoading && !usageError && <p>Usage history will appear after a campaign task is attempted.</p>}
              {usageData && Object.keys(usageData.summary.byModel).length === 0 && <p>No campaign usage has been recorded for this workspace yet.</p>}
              {usageData && Object.entries(usageData.summary.byModel).map(([model, summary]) => (
                <div className="model-policy-row" key={model}>
                  <div><b>{model}</b><small>{summary.events} recorded attempts</small></div>
                  <div style={{ textAlign: "right" }}>
                    <strong>{summary.estimatedCredits.toLocaleString(undefined, { maximumFractionDigits: 4 })} credits</strong>
                    <small>{summary.providerCostEvents} cost record(s) · {summary.knownProviderCostUsd.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 6 })} known USD</small>
                  </div>
                </div>
              ))}
              <p className="learning-note">{usageData?.note ?? "Values are estimates of product credits, not actual model-provider invoice costs. Provider billing reconciliation is not yet implemented."}</p>
            </div>
            <div className="panel" style={{ marginTop: 16 }}>
              <small>SPENDING CONTROL</small>
              <h3>Monthly workspace budget</h3>
              {budgetError && <div className="learning-message learning-error" role="alert">{budgetError}</div>}
              {budgetMessage && <div className="learning-message" role="status">{budgetMessage}</div>}
              {usageBudget?.budget_configured ? (
                <p>
                  Current month: {usageBudget.used_credits.toLocaleString(undefined, { maximumFractionDigits: 4 })} used
                  {usageBudget.reserved_credits > 0 ? ` · ${usageBudget.reserved_credits.toLocaleString(undefined, { maximumFractionDigits: 4 })} reserved` : ""}
                  {" · "}Limit: {usageBudget.monthly_credit_limit?.toLocaleString(undefined, { maximumFractionDigits: 4 })} credits
                  {usageBudget.remaining_credits !== null ? ` · ${usageBudget.remaining_credits.toLocaleString(undefined, { maximumFractionDigits: 4 })} available` : ""}
                </p>
              ) : <p>No monthly credit budget is configured. Campaigns are not blocked by a workspace credit limit.</p>}
              {usageBudget?.editable && (
                <form onSubmit={saveUsageBudget} className="learning-form">
                  <label>Monthly credit limit
                    <input type="number" min="0.0001" max="1000000000" step="0.1" required value={budgetLimitInput} onChange={(e) => setBudgetLimitInput(e.target.value)} placeholder="e.g. 500" />
                  </label>
                  <label className="learning-checkbox">
                    <input type="checkbox" checked={budgetHardLimitInput} onChange={(e) => setBudgetHardLimitInput(e.target.checked)} />
                    Block campaign execution when the budget would be exceeded
                  </label>
                  <button className="primary" type="submit" disabled={budgetSaving || !budgetLimitInput.trim()}>{budgetSaving ? "Saving…" : "Save monthly budget"}</button>
                </form>
              )}
              <p className="learning-note">Budget limits are measured in estimated product credits, not USD. A hard limit reserves credits before execution to reduce overspending from concurrent requests. Active reservations expire automatically after 30 minutes if an execution is interrupted.</p>
            </div>
          </div>
        )}

        {tab === "Model Registry" && (
          <div className="model-registry-view">
            <div className="studio-copy">
              <span className="eyebrow">MODEL ROUTING</span>
              <h2>Control how the agent<br />spends your AI budget.</h2>
              <p>Choose which capability tiers are available and which tier the automatic campaign agent should prefer.</p>
            </div>

            <div className="model-registry panel">
              <div className="model-registry-head">
                <div>
                  <small>WORKSPACE POLICY</small>
                  <h3>{modelRegistryEditable ? "Your model policy" : "Read-only model policy"}</h3>
                </div>
                <span className="status approved">{modelRegistryEditable ? "Admin" : "Member"}</span>
              </div>

              <div className="model-policy-grid">
                {modelPolicies.map((policy) => (
                  <div className="model-policy-card" key={policy.capability}>
                    <div className="model-policy-title">
                      <div>
                        <small>{policy.capability.toUpperCase()}</small>
                        <h3>Automatic default</h3>
                      </div>
                      <b>{policy.default_codename}</b>
                    </div>
                    <p>Enabled tiers</p>
                    <div className="model-tier-list">
                      {["Swift", "Balance", "Pro", "Studio", "Cinematic"]
                        .filter((codename) => policy.capability === "text" || policy.capability === "voice" || policy.capability === "stt"
                          ? ["Swift", "Balance", "Pro"].includes(codename)
                          : policy.capability === "image"
                            ? ["Swift", "Balance", "Pro", "Studio"].includes(codename)
                            : true)
                        .map((codename) => {
                          const enabled = policy.enabled_codenames.includes(codename);
                          const isDefault = policy.default_codename === codename;
                          return (
                            <div className={`model-tier ${enabled ? "enabled" : ""}`} key={codename}>
                              <button type="button" disabled={!modelRegistryEditable} onClick={() => toggleModel(policy.capability, codename)}>
                                {enabled ? "✓" : "○"} {codename}
                              </button>
                              {enabled && (
                                <button
                                  type="button"
                                  className={isDefault ? "model-default active" : "model-default"}
                                  disabled={!modelRegistryEditable}
                                  onClick={() => setDefaultModel(policy.capability, codename)}
                                >
                                  {isDefault ? "Default" : "Use by default"}
                                </button>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  </div>
                ))}
              </div>

              <div className="model-registry-foot">
                <span>
                  {modelRegistrySaved
                    ? "Model policy saved. New campaign planning will use these preferences."
                    : "Pricing and underlying provider identities remain controlled by the application registry."}
                </span>
                {modelRegistryEditable && (
                  <button className="primary" onClick={saveModelRegistry} disabled={modelRegistrySaving}>
                    {modelRegistrySaving ? "Saving…" : "Save model policy"}
                  </button>
                )}
              </div>
              {authError && <div className="auth-message error">{authError}</div>}
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
              <div className="form-section">
                <label>Content pillars<textarea value={brandPillars} onChange={(e) => { setBrandPillars(e.target.value); setBrandSaved(false); }} placeholder="e.g. AI education; product insights; customer stories; practical tips." /></label>
                <label>Do / don't rules<textarea value={brandDoRules} onChange={(e) => { setBrandDoRules(e.target.value); setBrandSaved(false); }} placeholder="e.g. Do be evidence-led. Don't use clickbait, fear, or exaggerated claims." /></label>
              </div>
              <div className="form-section">
                <label>CTA style<textarea value={brandCtaStyle} onChange={(e) => { setBrandCtaStyle(e.target.value); setBrandSaved(false); }} placeholder="e.g. Prefer thoughtful questions and soft CTAs; avoid hard-sell language." /></label>
                <label>Forbidden topics<textarea value={brandForbiddenTopics} onChange={(e) => { setBrandForbiddenTopics(e.target.value); setBrandSaved(false); }} placeholder="Topics, claims, audiences, or wording the agent must avoid." /></label>
              </div>
              <div className="form-section">
                <label>Hashtag strategy<textarea value={brandHashtagStrategy} onChange={(e) => { setBrandHashtagStrategy(e.target.value); setBrandSaved(false); }} placeholder="e.g. 3–5 relevant hashtags, prioritize niche terms, never use banned/trending tags just for reach." /></label>
                <label>Platform guidance<textarea value={brandPlatformGuidance} onChange={(e) => { setBrandPlatformGuidance(e.target.value); setBrandSaved(false); }} placeholder="e.g. LinkedIn: analytical and concise. Instagram: visual, warmer, shorter." /></label>
              </div>
              <div className="form-section single">
                <label>Example posts<textarea value={brandExamplePosts} onChange={(e) => { setBrandExamplePosts(e.target.value); setBrandSaved(false); }} placeholder="Paste 1–3 representative posts. The agent uses these as style examples, not as a source of facts." /></label>
              </div>
              <div className="brand-form-foot">
                <span>{brandSaved ? "Brand Brain saved. New generations will use these instructions." : "These rules are applied to future AI generations."}</span>
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
