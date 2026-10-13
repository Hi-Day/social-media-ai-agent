import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("content draft editing", () => {
  it("only updates a member's own-workspace draft while it remains editable", () => {
    const route = read("app/api/content/drafts/[id]/route.ts");
    expect(route).toContain("export async function PATCH");
    expect(route).toContain("await supabase.auth.getUser()");
    expect(route).toContain('.eq("workspace_id", workspaceId)');
    expect(route).toContain('["draft", "rejected"].includes(existing.status)');
    expect(route).toContain('.eq("status", existing.status)');
    expect(route).toContain('status: 409');
  });

  it("lets the user edit generated text, reopen a saved draft, and resubmit requested changes", () => {
    const page = read("app/page.tsx");
    expect(page).toContain('aria-label="Edit generated content"');
    expect(page).toContain('method: updating ? "PATCH" : "POST"');
    expect(page).toContain("function editDraft(draft: Draft)");
    expect(page).toContain('draft.status === "rejected" ? "Resubmit" : "Submit"');
    expect(page).toContain('draftStatus === "rejected" ? "Resubmit for approval" : "Send to approval"');
  });
});
