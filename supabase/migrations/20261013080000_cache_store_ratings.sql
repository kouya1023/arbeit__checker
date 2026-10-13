-- Keep store ratings up to date when reviews change, so listing stores does
-- not aggregate the review table on every request.
alter table public.store
  add column if not exists average_rating double precision,
  add column if not exists review_count bigint not null default 0;

-- Existing reviews need a one-time backfill before the trigger takes over.
update public.store as s
set review_count = stats.review_count,
    average_rating = stats.average_rating
from (
  select
    s.id as store_id,
    count(r.id) as review_count,
    avg(r.stage_evaluation)::double precision as average_rating
  from public.store as s
  left join public.review as r on r.store_id = s.id
  group by s.id
) as stats
where s.id = stats.store_id;

create or replace function public.recalculate_store_rating(p_store_id bigint)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_store_id is null then
    return;
  end if;

  -- Serialize updates for the same store before reading its reviews.
  perform 1 from public.store where id = p_store_id for update;

  update public.store as s
  set review_count = stats.review_count,
      average_rating = stats.average_rating
  from (
    select
      count(*) as review_count,
      avg(r.stage_evaluation)::double precision as average_rating
    from public.review as r
    where r.store_id = p_store_id
  ) as stats
  where s.id = p_store_id;
end;
$$;

create or replace function public.sync_store_rating()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  affected_store_id bigint;
begin
  if tg_op = 'INSERT' then
    perform public.recalculate_store_rating(new.store_id);
    return new;
  elsif tg_op = 'DELETE' then
    perform public.recalculate_store_rating(old.store_id);
    return old;
  end if;

  -- A review can move between stores; update both in a consistent lock order.
  for affected_store_id in
    select distinct store_id
    from (values (old.store_id), (new.store_id)) as changed(store_id)
    where store_id is not null
    order by store_id
  loop
    perform public.recalculate_store_rating(affected_store_id);
  end loop;

  return new;
end;
$$;

revoke all on function public.recalculate_store_rating(bigint) from public;
revoke all on function public.sync_store_rating() from public;

drop trigger if exists sync_store_rating_on_review on public.review;
create trigger sync_store_rating_on_review
after insert or update of store_id, stage_evaluation or delete on public.review
for each row execute function public.sync_store_rating();
