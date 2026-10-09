import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { analyzeObservations, isSupportedMetric, recommendationForInsight, type MetricObservation } from '@/lib/learning-loop';
const MEMORY_TYPES = new Set(['semantic','episodic','performance','policy']);
const PLATFORMS = new Set(['instagram','facebook','linkedin','tiktok','youtube','x','other']);
const fail = (message: string, status: number) => NextResponse.json({ error: message }, { status });
async function memberRole(supabase: Awaited<ReturnType<typeof createClient>>, userId: string, workspaceId: string) {
 const { data, error } = await supabase.from('workspace_members').select('role').eq('workspace_id', workspaceId).eq('user_id', userId).maybeSingle();
 if (error) throw new Error(error.message);
 return data?.role as string | undefined;
}
export async function GET(request: Request) {
 try {
  const supabase = await createClient(); const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) return fail('Unauthorized', 401);
  const workspaceId = new URL(request.url).searchParams.get('workspaceId') || ''; if (!workspaceId) return fail('workspaceId is required.', 400);
  if (!await memberRole(supabase, auth.user.id, workspaceId)) return fail('Forbidden', 403);
  const [memories, insights, recommendations] = await Promise.all([
   supabase.from('agent_memories').select('id,memory_type,memory_key,content,source_type,confidence,approved,status,created_at,updated_at').eq('workspace_id', workspaceId).eq('status', 'active').order('updated_at', { ascending: false }).limit(100),
   supabase.from('performance_insights').select('id,campaign_id,insight_type,period_start,period_end,finding,evidence,confidence,status,created_at').eq('workspace_id', workspaceId).eq('status', 'active').order('created_at', { ascending: false }).limit(100),
   supabase.from('agent_recommendations').select('id,campaign_id,insight_id,action_type,title,rationale,evidence,expected_impact,risk_level,priority,status,expires_at,created_at').eq('workspace_id', workspaceId).order('created_at', { ascending: false }).limit(100),
  ]);
  const error = memories.error || insights.error || recommendations.error; if (error) return fail(error.message, 500);
  return NextResponse.json({ memories: memories.data ?? [], insights: insights.data ?? [], recommendations: recommendations.data ?? [] });
 } catch (error) { return fail(error instanceof Error ? error.message : 'Unable to load learning data.', 500); }
}
export async function POST(request: Request) {
 try {
  const supabase = await createClient(); const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) return fail('Unauthorized', 401);
  const body = await request.json().catch(() => null); if (!body || typeof body !== 'object') return fail('A JSON request body is required.', 400);
  const workspaceId = typeof body.workspaceId === 'string' ? body.workspaceId : ''; const action = typeof body.action === 'string' ? body.action : '';
  if (!workspaceId) return fail('workspaceId is required.', 400);
  const role = await memberRole(supabase, auth.user.id, workspaceId); if (!role) return fail('Forbidden', 403);
  if (action === 'remember') {
   const memoryType = typeof body.memoryType === 'string' ? body.memoryType : 'semantic'; const key = typeof body.key === 'string' ? body.key.trim() : ''; const value = body.content;
   if (!MEMORY_TYPES.has(memoryType) || key.length < 2 || key.length > 120) return fail('A supported memoryType and key (2–120 characters) are required.', 400);
   if (!value || typeof value !== 'object' || Array.isArray(value) || JSON.stringify(value).length > 6000) return fail('content must be a JSON object of at most 6000 characters.', 400);
   const { data, error } = await supabase.from('agent_memories').insert({ workspace_id: workspaceId, memory_type: memoryType, memory_key: key, content: value, source_type: 'user', confidence: 1, approved: false, status: 'active' }).select('id,memory_type,memory_key,content,approved,status').single();
   if (error) return fail(error.code === '23505' ? 'An active memory with this key already exists.' : error.message, error.code === '23505' ? 409 : 500);
   return NextResponse.json({ memory: data, note: 'Saved as unapproved memory; it is not treated as verified policy or brand truth.' }, { status: 201 });
  }
  if (action === 'observe') {
   const raw = Array.isArray(body.observations) ? body.observations : []; if (!raw.length || raw.length > 100) return fail('Submit between 1 and 100 observations per request.', 400);
   const rows: Array<Record<string, unknown>> = [];
   for (const item of raw) {
    if (!item || typeof item !== 'object') return fail('Each observation must be an object.', 400);
    const metricKey = typeof item.metricKey === 'string' ? item.metricKey : ''; const platform = typeof item.platform === 'string' ? item.platform.toLowerCase() : ''; const value = Number(item.value); const observedAt = typeof item.observedAt === 'string' ? item.observedAt : '';
    if (!isSupportedMetric(metricKey) || !PLATFORMS.has(platform) || !Number.isFinite(value) || value < 0 || !Number.isFinite(Date.parse(observedAt))) return fail('Each observation needs a supported metric, platform, non-negative value, and ISO date.', 400);
    rows.push({ workspace_id: workspaceId, metric_key: metricKey, platform, value, observed_at: new Date(observedAt).toISOString(), post_ref: typeof item.postRef === 'string' ? item.postRef.slice(0, 200) : null, source_type: 'manual', evidence: { entered_by: auth.user.id, input_method: 'workspace_form' } });
   }
   const { data, error } = await supabase.from('performance_observations').insert(rows).select('id'); if (error) return fail(error.message, 500);
   return NextResponse.json({ inserted: data?.length ?? rows.length, sourceType: 'manual', message: 'Observations saved as user-entered metrics, not provider-verified metrics.' }, { status: 201 });
  }
  if (action === 'analyze') {
   const now = new Date(); const campaignId = typeof body.campaignId === 'string' ? body.campaignId : null;
   if (campaignId) { const { data: campaign, error } = await supabase.from('campaigns').select('id').eq('workspace_id', workspaceId).eq('id', campaignId).maybeSingle(); if (error) return fail(error.message, 500); if (!campaign) return fail('Campaign not found.', 404); }
   const { data, error } = await supabase.from('performance_observations').select('metric_key,value,platform,observed_at,post_ref,source_type').eq('workspace_id', workspaceId).gte('observed_at', new Date(now.getTime() - 14 * 86400000).toISOString()).lte('observed_at', now.toISOString()).order('observed_at', { ascending: true }).limit(2000);
   if (error) return fail(error.message, 500);
   const insights = analyzeObservations((data ?? []) as MetricObservation[], now);
   if (!insights.length) return NextResponse.json({ insights: [], recommendations: [], message: 'Insufficient comparable observations. Each platform/metric needs at least two observations in both adjacent 7-day windows and a change of at least 15%.' });
   const savedInsights = []; const savedRecommendations = [];
   for (const insight of insights) {
    const { data: saved, error: insightError } = await supabase.from('performance_insights').insert({ workspace_id: workspaceId, campaign_id: campaignId, insight_type: insight.insight_type, period_start: insight.period_start, period_end: insight.period_end, finding: insight.finding, evidence: insight.evidence, confidence: insight.confidence, status: 'active' }).select('id,insight_type,finding,evidence,confidence').single();
    if (insightError) return fail(insightError.message, 500); savedInsights.push(saved);
    const recommendation = recommendationForInsight(insight);
    const { data: savedRecommendation, error: recError } = await supabase.from('agent_recommendations').insert({ workspace_id: workspaceId, campaign_id: campaignId, insight_id: saved.id, ...recommendation, status: 'proposed', created_by: 'agent', expires_at: new Date(now.getTime() + 30 * 86400000).toISOString() }).select('id,title,rationale,evidence,expected_impact,risk_level,priority,status').single();
    if (recError) return fail(recError.message, 500); savedRecommendations.push(savedRecommendation);
   }
   return NextResponse.json({ insights: savedInsights, recommendations: savedRecommendations, message: 'Recommendations remain proposals and require human approval.' }, { status: 201 });
  }
  if (action === 'approve-recommendation' || action === 'reject-recommendation') {
   if (!['owner','admin'].includes(role)) return fail('Only workspace owners and admins can approve or reject recommendations.', 403);
   const id = typeof body.recommendationId === 'string' ? body.recommendationId : ''; if (!id) return fail('recommendationId is required.', 400);
   const status = action === 'approve-recommendation' ? 'approved' : 'rejected';
   const { data, error } = await supabase.from('agent_recommendations').update({ status, updated_at: new Date().toISOString() }).eq('id', id).eq('workspace_id', workspaceId).eq('status', 'proposed').select('id,title,status,campaign_id,insight_id').maybeSingle();
   if (error) return fail(error.message, 500); if (!data) return fail('Recommendation not found or no longer proposed.', 409); return NextResponse.json({ recommendation: data });
  }
  if (action === 'replan') {
   if (!['owner','admin'].includes(role)) return fail('Only workspace owners and admins can create a replan.', 403);
   const campaignId = typeof body.campaignId === 'string' ? body.campaignId : ''; if (!campaignId) return fail('campaignId is required.', 400);
   const { data: campaign, error: campaignError } = await supabase.from('campaigns').select('id,name,plan,status').eq('workspace_id', workspaceId).eq('id', campaignId).maybeSingle();
   if (campaignError) return fail(campaignError.message, 500); if (!campaign) return fail('Campaign not found.', 404);
   const { data: approved, error: recError } = await supabase.from('agent_recommendations').select('id,title,rationale,evidence,expected_impact,priority,insight_id').eq('workspace_id', workspaceId).eq('campaign_id', campaignId).eq('status', 'approved').gt('expires_at', new Date().toISOString()).limit(25);
   if (recError) return fail(recError.message, 500); if (!approved?.length) return fail('No approved, unexpired recommendations are linked to this campaign. Approve evidence-backed recommendations first.', 409);
   const previous = campaign.plan && typeof campaign.plan === 'object' && !Array.isArray(campaign.plan) ? campaign.plan as Record<string, unknown> : {};
   const revision = { created_at: new Date().toISOString(), based_on_recommendation_ids: approved.map(x => x.id), recommendations: approved, approval_required: true, execution_authorized: false };
   const { error: updateError } = await supabase.from('campaigns').update({ plan: { ...previous, proposed_replan: revision }, updated_at: new Date().toISOString() }).eq('workspace_id', workspaceId).eq('id', campaignId);
   if (updateError) return fail(updateError.message, 500);
   const { error: auditError } = await supabase.from('audit_events').insert({ workspace_id: workspaceId, actor_type: 'user', action: 'campaign.replan.proposed', resource_type: 'campaign', resource_id: campaignId, metadata: { recommendation_ids: approved.map(x => x.id), execution_authorized: false } });
   if (auditError) return fail('Replan saved, but audit event write failed: ' + auditError.message, 500);
   return NextResponse.json({ campaignId, proposedReplan: revision, message: 'Proposed plan revision recorded. No content was scheduled, published, or executed.' }, { status: 201 });
  }
  return fail('Unsupported action. Use remember, observe, analyze, approve-recommendation, reject-recommendation, or replan.', 400);
 } catch (error) { return fail(error instanceof Error ? error.message : 'Learning action failed.', 500); }
}
