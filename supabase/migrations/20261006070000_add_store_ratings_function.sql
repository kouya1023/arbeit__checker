-- Average and count of reviews for each store. Stores without reviews are
-- represented by no row; the app displays those as "評価なし".
create or replace function public.get_store_ratings()
returns table (
  store_id bigint,
  average_rating double precision,
  review_count bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    r.store_id,
    avg(r.stage_evaluation) as average_rating,
    count(*) as review_count
  from public.review as r
  where r.store_id is not null
  group by r.store_id;
$$;

revoke all on function public.get_store_ratings() from public;
grant execute on function public.get_store_ratings() to anon, authenticated;
