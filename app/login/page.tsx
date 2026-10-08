"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [workspace, setWorkspace] = useState("My Workspace");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);

  async function tryDemo() {
    setDemoLoading(true);
    setError("");
    setMessage("");

    try {
      const supabase = createClient();
      const { error: demoError } = await supabase.auth.signInAnonymously();
      if (demoError) {
        if (demoError.code === "anonymous_provider_disabled") {
          throw new Error(
            "Demo mode is disabled in the Supabase project. Enable Authentication → Providers → Anonymous.",
          );
        }
        throw demoError;
      }

      await supabase.auth.updateUser({
        data: { workspace_name: "SocialOS Demo Workspace" },
      });
      router.replace("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to start demo mode.");
    } finally {
      setDemoLoading(false);
    }
  }

  function verificationRedirectUrl() {
    return (
      (process.env.NEXT_PUBLIC_APP_URL || window.location.origin).replace(/\/$/, "") +
      "/auth/callback"
    );
  }

  async function resendVerification() {
    if (!email.trim()) {
      setError("Enter your email address first.");
      return;
    }

    setResendLoading(true);
    setError("");
    setMessage("");

    try {
      const supabase = createClient();
      const { error: resendError } = await supabase.auth.resend({
        type: "signup",
        email: email.trim(),
        options: { emailRedirectTo: verificationRedirectUrl() },
      });

      if (resendError) throw resendError;
      setMessage(
        "A new verification email has been requested. Check your inbox and spam folder.",
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? `Unable to resend verification email: ${err.message}`
          : "Unable to resend verification email.",
      );
    } finally {
      setResendLoading(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const supabase = createClient();

      if (mode === "signin") {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (signInError) {
          if (signInError.code === "email_not_confirmed") {
            throw new Error(
              "Your email is not verified yet. Check your inbox or request a new verification email below.",
            );
          }
          throw signInError;
        }
        router.replace("/");
        router.refresh();
        return;
      }

      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { workspace_name: workspace.trim() || "My Workspace" },
          emailRedirectTo: verificationRedirectUrl(),
        },
      });

      if (signUpError) throw signUpError;

      if (!data.session) {
        setMessage(
          "Account created. Check your email to confirm the account, then sign in. If it does not arrive, use the resend button below.",
        );
      } else {
        router.replace("/");
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <div className="logo"><Sparkles size={18} /></div>
          <b>SocialOS</b>
        </div>

        <div className="auth-copy">
          <span className="eyebrow">AI SOCIAL MEDIA MANAGER</span>
          <h1>{mode === "signin" ? "Welcome back." : "Create your workspace."}</h1>
          <p>
            {mode === "signin"
              ? "Sign in to continue managing your social presence."
              : "Start with a secure workspace and build your brand brain."}
          </p>
        </div>

        <form onSubmit={submit} className="auth-form">
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              required
            />
          </label>

          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="At least 6 characters"
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              minLength={6}
              required
            />
          </label>

          {mode === "signup" && (
            <label>
              Workspace name
              <input
                value={workspace}
                onChange={(event) => setWorkspace(event.target.value)}
                placeholder="My Workspace"
                required
              />
            </label>
          )}

          {error && <div className="auth-message error">{error}</div>}
          {message && <div className="auth-message success">{message}</div>}

          {mode === "signup" && message && (
            <button
              type="button"
              className="auth-switch"
              onClick={resendVerification}
              disabled={loading || demoLoading || resendLoading}
            >
              {resendLoading ? "Sending verification email…" : "Resend verification email"}
            </button>
          )}

          <button className="primary auth-submit" disabled={loading || demoLoading || resendLoading}>
            {loading ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
          </button>

          <div className="auth-divider"><span>or</span></div>

          <button
            type="button"
            className="demo-submit auth-submit"
            onClick={tryDemo}
            disabled={loading || demoLoading}
          >
            <Sparkles size={14} />
            <span>{demoLoading ? "Starting demo…" : "Try Demo"}</span>
            {!demoLoading && <small>No account required</small>}
          </button>
        </form>

        <button
          className="auth-switch"
          onClick={() => {
            setMode(mode === "signin" ? "signup" : "signin");
            setError("");
            setMessage("");
          }}
        >
          {mode === "signin"
            ? "New here? Create an account"
            : "Already have an account? Sign in"}
        </button>
      </div>
    </main>
  );
}
