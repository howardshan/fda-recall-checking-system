-- Common labelers for a product: ranked by NDC registration count (typeahead preview on focus).

create or replace function common_labelers_for_product(
  product_name text,
  max_results int default 12
)
returns table (
  labeler_name text,
  ndc_count bigint
)
language sql stable as $$
  select
    np.labeler_name,
    count(*)::bigint as ndc_count
  from ndc_products np
  where np.labeler_name is not null
    and (
      lower(np.generic_name) = lower(trim(product_name))
      or lower(np.generic_name) like lower(trim(product_name)) || ' %'
      or lower(np.brand_name) = lower(trim(product_name))
      or lower(np.brand_name) like lower(trim(product_name)) || ' %'
    )
  group by np.labeler_name
  order by count(*) desc, np.labeler_name
  limit greatest(1, least(max_results, 20));
$$;
