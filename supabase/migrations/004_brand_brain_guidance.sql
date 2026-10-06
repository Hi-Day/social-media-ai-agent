-- Expand Brand Brain into structured guidance used by the content agent.
alter table public.brands
  add column if not exists pillars text,
  add column if not exists do_rules text,
  add column if not exists cta_style text,
  add column if not exists forbidden_topics text,
  add column if not exists hashtag_strategy text,
  add column if not exists example_posts text,
  add column if not exists platform_guidance text;