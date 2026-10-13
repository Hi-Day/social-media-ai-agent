import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("social account readiness", () => {
  it("requires an authenticated workspace owner/admin and returns only provider configuration booleans", () => {
    const route = read("app/api/integrations/status/route.ts");
    expect(route).toContain('await supabase.auth.getUser()');
    expect(route).toContain('["owner", "admin"].includes(membership.role)');
    expect(route).toContain("configured: Boolean(process.env.INSTAGRAM_APP_ID");
    expect(route).toContain("configured: Boolean(process.env.TIKTOK_CLIENT_KEY");
    expect(route).toContain("configured: Boolean(process.env.LINKEDIN_CLIENT_ID");
    expect(route).not.toContain("process.env.INSTAGRAM_APP_SECRET,");
    expect(route).not.toContain("process.env.TIKTOK_CLIENT_SECRET,");
  });

  it("surfaces Instagram and TikTok readiness, connection status, and disconnect actions", () => {
    const panel = read("app/components/social-accounts-panel.tsx");
    expect(panel).toContain('"/api/integrations/status?workspaceId="');
    expect(panel).toContain("Hubungkan Instagram");
    expect(panel).toContain("Hubungkan TikTok");
    expect(panel).toContain('disabled={!status?.configured || Boolean(busyAccount)}');
    expect(panel).toContain('method: "DELETE"');
    expect(panel).toContain("LinkedInIntegration workspaceId={workspaceId}");
  });

  it("keeps OAuth callback errors namespaced to their provider", () => {
    expect(read("app/api/integrations/instagram/callback/route.ts")).toContain("instagram_session_expired");
    expect(read("app/api/integrations/tiktok/callback/route.ts")).toContain("tiktok_session_expired");
    expect(read("app/components/linkedin-integration.tsx")).toContain('integrationError.startsWith("linkedin_")');
  });
});
