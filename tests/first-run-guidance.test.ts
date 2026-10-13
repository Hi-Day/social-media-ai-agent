import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("first-run product guidance", () => {
  it("provides direct actions for brand setup, AI Studio, and campaign planning", () => {
    const guide = read("app/components/quick-start-guide.tsx");
    expect(guide).toContain("Mulai dalam 3 langkah");
    expect(guide).toContain("onOpenBrandBrain");
    expect(guide).toContain("onOpenAIStudio");
    expect(guide).toContain("onOpenCampaigns");
    expect(guide).toContain("mode demo");
  });

  it("shows generation mode and makes generation failures visible before a result exists", () => {
    const page = read("app/page.tsx");
    expect(page).toContain('useState<"live" | "demo" | "">("")');
    expect(page).toContain('generationMode === "live" ? "Live AI" : "Demo mode"');
    expect(page).toContain('{authError && !generated && <div className="auth-message error" role="alert">');
  });
});

describe("overview metrics", () => {
  it("derives draft and approval counts from saved workspace data instead of placeholders", () => {
    const page = read("app/page.tsx");
    expect(page).toContain("const overviewStats = [");
    expect(page).toContain('drafts.filter((draft) => draft.status === "in_review").length');
    expect(page).toContain('["Saved drafts", String(drafts.length), "Across this workspace"]');
    expect(page).not.toContain('["AI actions", "—", "This week"]');
  });
});
