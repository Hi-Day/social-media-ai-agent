import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
const readMigration = (name: string) => readFileSync(resolve(process.cwd(), 'supabase/migrations', name), 'utf8');
const runtime = readMigration('20261009000406_learning_loop_runtime.sql');
describe('learning-loop database guardrails', () => {
 it('stores source-labelled metrics with non-negative values and RLS', () => { expect(runtime).toContain('create table if not exists public.performance_observations'); expect(runtime).toContain('check (value >= 0)'); expect(runtime).toContain("source_type = 'manual'"); expect(runtime).toContain('alter table public.performance_observations enable row level security'); });
 it('limits member-created memory to unapproved user input', () => { expect(runtime).toContain('approved = false'); expect(runtime).toContain("source_type = 'user'"); expect(runtime).toContain('admins can update memories'); });
 it('requires admin privileges for recommendation lifecycle updates', () => { expect(runtime).toContain('admins can update recommendations'); expect(runtime).toContain("status = 'proposed'"); });
 it('prevents cross-workspace recommendation references', () => { expect(runtime).toContain('validate_recommendation_workspace'); expect(runtime).toContain('recommendation_insight_workspace_mismatch'); expect(runtime).toContain('recommendation_campaign_workspace_mismatch'); });
 it('indexes foreign-key columns used by learning queries', () => { const indexes = readMigration('20261009000500_learning_loop_indexes.sql'); expect(indexes).toContain('on public.agent_recommendations(campaign_id)'); expect(indexes).toContain('on public.agent_recommendations(insight_id)'); expect(indexes).toContain('on public.performance_insights(campaign_id)'); expect(indexes).toContain('on public.approvals(workspace_id)'); expect(indexes).toContain('on public.content_packages(workspace_id)'); });
});
