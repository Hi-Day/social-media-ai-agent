-- Make campaign media readiness explicit and prevent incomplete assets from approval.
-- Campaign text tasks need no media; all other campaign formats begin with media pending.
update public.content_drafts
set media_status = 'pending'
where campaign_id is not null
  and lower(coalesce(content_type, '')) not in ('post','linkedin post','social post','caption','text post')
  and media_status = 'not_required'
  and generation_status in ('pending','generating','failed');

create or replace function public.enforce_campaign_media_readiness()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.campaign_id is not null then
    if lower(coalesce(new.content_type, '')) not in ('post','linkedin post','social post','caption','text post')
       and new.media_status = 'not_required'
       and new.generation_status in ('pending','generating','failed','provider_unavailable') then
      new.media_status := 'pending';
    end if;

    if new.status in ('in_review','approved')
       and new.media_status not in ('generated','not_required') then
      raise exception using
        errcode = '23514',
        message = 'Required campaign media must be generated before submitting or approving this draft.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_campaign_media_readiness on public.content_drafts;
create trigger trg_campaign_media_readiness
before insert or update of status, media_status, content_type, campaign_id, generation_status
on public.content_drafts
for each row execute function public.enforce_campaign_media_readiness();
