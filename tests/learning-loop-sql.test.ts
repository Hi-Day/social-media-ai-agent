import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
const sql = readFileSync(resolve(process.cwd(), 'supabase/migrations/013_learning_loop_runtime.sql'), 'utf8');
describe('learning-loop database guardrails', () => {
 it('stores source-labelled metrics with non-negative values and RLS', () => { expect(sql).toContain('create table if not exists public.performance_observations'); expect(sql).toContain('check (value >= 0)'); expect(sql).toContain("source_type = 'manual'"); expect(sql).toContain('alter table public.performance_observations enable row level security'); });
 it('limits member-created memory to unapproved user input', () => { expect(sql).toContain('approved = false'); expect(sql).toContain("source_type = 'user'"); expect(sql).toContain('admins can update memories'); });
 it('requires admin privileges for recommendation lifecycle updates', () => { expect(sql).toContain('admins can update recommendations'); expect(sql).toContain("status = 'proposed'"); });
 it('prevents cross-workspace recommendation references', () => { expect(sql).toContain('validate_recommendation_workspace'); expect(sql).toContain('recommendation_insight_workspace_mismatch'); expect(sql).toContain('recommendation_campaign_workspace_mismatch'); });
});
