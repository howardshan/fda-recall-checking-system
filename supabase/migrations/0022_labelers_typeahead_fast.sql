-- Fast typeahead path when query is non-empty: filter labeler_norm by prefix
-- (uses idx_ndc_labeler_norm_pattern) before product match, skip recalls scan.

drop function if exists labelers_for_product(text, text, integer);

create or replace function labelers_for_product(
  product_name text,
  query text default '',
  max_results int default 20
)
returns table (
  labeler_name text,
  source text
)
language plpgsql stable as $$
declare
  pn text := lower(trim(product_name));
  q text := lower(trim(query));
begin
  if pn = '' then
    return;
  end if;

  -- Typeahead: at least one filter letter — index-friendly prefix search on NDC only.
  if q <> '' then
    return query
    select distinct on (lower(np.labeler_name))
      np.labeler_name,
      'current'::text
    from ndc_products np
    where np.labeler_name is not null
      and np.labeler_norm like q || '%'
      and (
        lower(np.generic_name) = pn
        or lower(np.generic_name) like pn || ' %'
        or lower(np.brand_name) = pn
        or lower(np.brand_name) like pn || ' %'
      )
    order by lower(np.labeler_name)
    limit max_results;

    return;
  end if;

  -- Empty query (manufacturer verify): full labeler set, NDC + historical recalls.
  return query
  select distinct on (lower(c.name)) c.name, c.src
  from (
    select np.labeler_name as name, 'current'::text as src
    from ndc_products np
    where np.labeler_name is not null
      and (
        lower(np.brand_name) = pn
        or lower(np.brand_name) like pn || ' %'
        or lower(np.generic_name) = pn
        or lower(np.generic_name) like pn || ' %'
      )

    union all

    select r.recalling_firm as name, 'historical'::text as src
    from recalls r
    where r.recalling_firm is not null
      and (
        r.brand_name ilike pn
        or r.brand_name ilike pn || ' %'
        or r.brand_name ilike '% ' || pn || ' %'
        or r.brand_name ilike '% ' || pn
        or r.generic_name ilike pn
        or r.generic_name ilike pn || ' %'
        or r.generic_name ilike '% ' || pn || ' %'
        or r.generic_name ilike '% ' || pn
        or r.product_description ilike pn || ' %'
        or r.product_description ilike '% ' || pn || ' %'
        or r.product_description ilike '% ' || pn
      )
  ) c
  order by lower(c.name), c.src
  limit max_results;
end;
$$;

-- Product + labeler prefix lookups (typeahead hot path).
create index if not exists idx_ndc_generic_lower_labeler_prefix
  on ndc_products (lower(generic_name) text_pattern_ops, labeler_norm text_pattern_ops);

create index if not exists idx_ndc_brand_lower_labeler_prefix
  on ndc_products (lower(brand_name) text_pattern_ops, labeler_norm text_pattern_ops);
