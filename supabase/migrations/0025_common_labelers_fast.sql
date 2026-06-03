-- Speed up common_labelers_for_product: split generic/brand index paths and cap
-- raw rows before GROUP BY so high-cardinality products (e.g. magnesium sulfate)
-- cannot hit statement_timeout on full-table aggregation.

create index if not exists idx_ndc_generic_lower_labeler_name
  on ndc_products (lower(generic_name) text_pattern_ops, labeler_name)
  where labeler_name is not null;

create index if not exists idx_ndc_brand_lower_labeler_name
  on ndc_products (lower(brand_name) text_pattern_ops, labeler_name)
  where labeler_name is not null;

create or replace function common_labelers_for_product(
  product_name text,
  max_results int default 12
)
returns table (
  labeler_name text,
  ndc_count bigint
)
language sql stable as $$
  with pn as (
    select lower(trim(product_name)) as v
  ),
  generic_rows as (
    select np.labeler_name
    from ndc_products np
    cross join pn
    where np.labeler_name is not null
      and pn.v <> ''
      and (
        lower(np.generic_name) = pn.v
        or lower(np.generic_name) like pn.v || ' %'
      )
    limit 2500
  ),
  brand_rows as (
    select np.labeler_name
    from ndc_products np
    cross join pn
    where np.labeler_name is not null
      and pn.v <> ''
      and (
        lower(np.brand_name) = pn.v
        or lower(np.brand_name) like pn.v || ' %'
      )
    limit 2500
  ),
  counts as (
    select matched.labeler_name, count(*)::bigint as ndc_count
    from (
      select labeler_name from generic_rows
      union all
      select labeler_name from brand_rows
    ) matched
    group by matched.labeler_name
  )
  select c.labeler_name, c.ndc_count
  from counts c
  order by c.ndc_count desc, c.labeler_name
  limit greatest(1, least(max_results, 20));
$$;
