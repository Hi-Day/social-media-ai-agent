"use client";

import { useState } from "react";
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
} from "lucide-react";

const navigation = [
  { icon: LayoutDashboard, name: "Overview" },
  { icon: CalendarDays, name: "Content Calendar" },
  { icon: BrainCircuit, name: "AI Studio" },
  { icon: MessageSquare, name: "Engagement" },
  { icon: TrendingUp, name: "Analytics" },
  { icon: Users, name: "Audience" },
];

const posts = [
  {
    platform: "Instagram",
    title: "Behind the scenes: our AI lab",
    status: "Approved",
    time: "Today · 18:30",
    tag: "Product",
  },
  {
    platform: "LinkedIn",
    title: "What happens when AI becomes a teammate?",
    status: "Needs review",
    time: "Tomorrow · 09:00",
    tag: "Thought leadership",
  },
  {
    platform: "Instagram",
    title: "3 ways to make your content workflow smarter",
    status: "Draft",
    time: "Friday · 12:00",
    tag: "Education",
  },
];

const stats = [
  ["Content this week", "12", "↑ 33%"],
  ["Engagement rate", "6.8%", "↑ 1.2%"],
  ["Pending approvals", "4", "Needs attention"],
  ["AI actions", "38", "This week"],
];

export default function Home() {
  const [tab, setTab] = useState("Overview");
  const [idea, setIdea] = useState("");
  const [generated, setGenerated] = useState("");
  const [loading, setLoading] = useState(false);

  async function generate() {
    if (!idea.trim()) return;

    setLoading(true);
    try {
      const response = await fetch("/api/agent/content", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ idea }),
      });

      const data = await response.json();
      setGenerated(data.caption || data.error || "");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main>
      <aside>
        <div className="brand">
          <div className="logo">
            <Sparkles size={18} />
          </div>
          <b>SocialOS</b>
        </div>

        <nav>
          {navigation.map(({ icon: Icon, name }) => (
            <button
              className={tab === name ? "active" : ""}
              onClick={() => {
                setTab(name);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              key={name}
            >
              <Icon size={17} />
              {name}
            </button>
          ))}
        </nav>

        <div className="side-bottom">
          <button>
            <Settings size={17} />
            Settings
          </button>
          <div className="workspace">
            <div className="avatar">HD</div>
            <div>
              <b>Hidayaturrahman</b>
              <small>Personal workspace</small>
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
            <button className="icon">
              <Command size={17} />
            </button>
            <button className="new">
              <Plus size={17} />
              New task
            </button>
          </div>
        </header>

        {tab === "Overview" ? (
          <>
            <div className="hero">
              <div>
                <span className="pill">
                  <span className="dot" /> Agent online
                </span>
                <h2>
                  Your social presence,
                  <br />
                  <em>working for you.</em>
                </h2>
                <p>
                  Plan, create, publish and learn from every interaction — with
                  AI handling the busywork and you keeping control.
                </p>
                <button
                  className="primary"
                  onClick={() => setTab("AI Studio")}
                >
                  Open AI Studio <ChevronRight size={17} />
                </button>
              </div>
              <div className="orb">
                <Sparkles size={42} />
                <span>
                  Observe
                  <br />→ Plan
                  <br />→ Act
                  <br />→ Learn
                </span>
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
                  <div>
                    <small>CONTENT PIPELINE</small>
                    <h3>Upcoming content</h3>
                  </div>
                  <button onClick={() => setTab("Content Calendar")}>
                    View calendar <ChevronRight size={15} />
                  </button>
                </div>

                {posts.map((post) => (
                  <div className="post" key={post.title}>
                    <div className="platform">{post.platform.slice(0, 2)}</div>
                    <div className="post-main">
                      <b>{post.title}</b>
                      <small>
                        {post.tag} · {post.time}
                      </small>
                    </div>
                    <span
                      className={
                        "status " +
                        post.status.toLowerCase().replaceAll(" ", "-")
                      }
                    >
                      {post.status}
                    </span>
                  </div>
                ))}
              </div>

              <div className="panel">
                <div className="panel-head">
                  <div>
                    <small>AI RECOMMENDATION</small>
                    <h3>Next best action</h3>
                  </div>
                  <Sparkles size={18} />
                </div>
                <div className="recommend">
                  <div className="rec-icon">
                    <TrendingUp size={20} />
                  </div>
                  <b>Double down on educational posts</b>
                  <p>
                    Your educational posts generated 2.4× more saves than
                    product posts over the last 30 days.
                  </p>
                  <button onClick={() => setTab("AI Studio")}>
                    Create 3 variations <ChevronRight size={15} />
                  </button>
                </div>
              </div>
            </div>
          </>
        ) : tab === "AI Studio" ? (
          <div className="studio">
            <div className="studio-copy">
              <span className="eyebrow">AI CONTENT STUDIO</span>
              <h2>
                Tell the agent what
                <br />
                you want to achieve.
              </h2>
              <p>
                It will use your brand voice, audience and performance history
                to create content worth publishing.
              </p>
            </div>

            <div className="composer">
              <div className="composer-top">
                <Sparkles size={18} />
                <span>Content Agent</span>
                <span className="auto">Brand Brain connected</span>
              </div>
              <textarea
                value={idea}
                onChange={(event) => setIdea(event.target.value)}
                placeholder="e.g. Create a LinkedIn post explaining why AI agents need human governance..."
              />
              <div className="composer-foot">
                <span>Low-risk generation · no publishing without approval</span>
                <button
                  className="primary"
                  disabled={loading}
                  onClick={generate}
                >
                  {loading ? (
                    "Thinking…"
                  ) : (
                    <>
                      Generate <Send size={15} />
                    </>
                  )}
                </button>
              </div>
            </div>

            {generated && (
              <div className="result">
                <div className="panel-head">
                  <div>
                    <small>GENERATED DRAFT</small>
                    <h3>Ready for review</h3>
                  </div>
                  <span className="status draft">Draft</span>
                </div>
                <p>{generated}</p>
                <div className="result-actions">
                  <button>Save draft</button>
                  <button className="primary">
                    Send to approval <ChevronRight size={15} />
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="empty">
            <Sparkles size={30} />
            <h2>{tab}</h2>
            <p>
              This workspace is ready. Connect your social accounts to unlock
              this module.
            </p>
            <button className="primary" onClick={() => setTab("AI Studio")}>
              Try AI Studio
            </button>
          </div>
        )}
      </section>
    </main>
  );
}
