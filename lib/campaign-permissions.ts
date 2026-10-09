/** Roles allowed to start potentially billable campaign generation. */
export function canExecuteCampaign(role: string | null | undefined): boolean {
  return role === "owner" || role === "admin";
}
