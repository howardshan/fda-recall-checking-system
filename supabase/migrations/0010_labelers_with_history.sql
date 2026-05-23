-- Extend labelers_for_product to also draw from recalls.recalling_firm so
-- historical labelers (those that have since been acquired / renamed)
-- still appear in the manufacturer typeahead for products they once
-- recalled. Example: Greenstone LLC's Methylprednisolone recall stays
-- searchable even after FDA transferred the NDC labeler code to Mylan.

drop function if exists labelers_for_product(text, text, integer);

create or replace function labelers_for_product(
  product_name text,
  query text default '',
  max_results int default 20
)
returns table (
  labeler_name text,
  source text  -- 'current' (ndc_products) or 'historical' (recalls)
)
language plpgsql stable as $$
declare
  pn text := lower(product_name);
  q text := lower(query);
begin
  return query
  select distinct on (lower(c.name)) c.name, c.src
  from (
    -- Current NDC registrants making this product.
    select np.labeler_name as name, 'current'::text as src
    from ndc_products np
    where np.labeler_name is not null
      and (
        lower(np.brand_name) = pn
        or lower(np.brand_name) like pn || ' %'
        or lower(np.generic_name) = pn
        or lower(np.generic_name) like pn || ' %'
      )
      and (
        q = ''
        or np.labeler_norm like q || '%'
        or np.labeler_norm like '% ' || q || '%'
      )

    union all

    -- Historical recalling firms with a recall for this product. We allow
    -- the product to appear anywhere in brand_name / generic_name /
    -- product_description (recall product descriptions are long sentences).
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
      and (
        q = ''
        or r.recalling_firm ilike q || '%'
        or r.recalling_firm ilike '% ' || q || '%'
      )
  ) c
  order by lower(c.name), c.src  -- 'current' < 'historical' alphabetically, so dedup prefers current label
  limit max_results;
end;
$$;
