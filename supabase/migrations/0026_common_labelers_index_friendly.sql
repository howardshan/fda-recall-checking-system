-- Fix planner choosing Seq Scan + Join Filter on OR (0025 cross join pattern).
-- Split equality vs prefix into separate branches so idx_ndc_*_lower_labeler_name
-- can be used; cap each branch before GROUP BY.

create or replace function common_labelers_for_product(
  product_name text,
  max_results int default 12
)
returns table (
  labeler_name text,
  ndc_count bigint
)
language plpgsql stable as $$
declare
  pn text := lower(trim(product_name));
  branch_limit int := 600;
begin
  if pn = '' then
    return;
  end if;

  return query
  with matched as (
    (
      select np.labeler_name
      from ndc_products np
      where np.labeler_name is not null
        and lower(np.generic_name) = pn
      limit branch_limit
    )
    union all
    (
      select np.labeler_name
      from ndc_products np
      where np.labeler_name is not null
        and lower(np.generic_name) like pn || ' %'
      limit branch_limit
    )
    union all
    (
      select np.labeler_name
      from ndc_products np
      where np.labeler_name is not null
        and lower(np.brand_name) = pn
      limit branch_limit
    )
    union all
    (
      select np.labeler_name
      from ndc_products np
      where np.labeler_name is not null
        and lower(np.brand_name) like pn || ' %'
      limit branch_limit
    )
  )
  select m.labeler_name, count(*)::bigint as ndc_count
  from matched m
  group by m.labeler_name
  order by count(*) desc, m.labeler_name
  limit greatest(1, least(max_results, 20));
end;
$$;
