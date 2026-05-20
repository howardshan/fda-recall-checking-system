-- Typeahead RPCs for the new manual-input UX:
--   - Product typeahead returns just distinct product names (no labeler / NDC)
--   - Manufacturer typeahead, when constrained by a product, returns just
--     the labelers that actually make that product
--
-- Both use partial-word prefix matching (LIKE 'q%') — appropriate for
-- typeahead where the user has only entered the first few letters.

create or replace function product_name_suggest(
  query text,
  max_results int default 10
)
returns table (name text)
language plpgsql stable as $$
declare
  q text := lower(query);
begin
  return query
  select t.name from (
    select distinct on (lower(n.name)) n.name from (
      select brand_name as name from ndc_products
      where lower(brand_name) like q || '%'
      union all
      select generic_name as name from ndc_products
      where lower(generic_name) like q || '%'
    ) n
    where n.name is not null
    order by lower(n.name), n.name
  ) t
  order by length(t.name), t.name
  limit max_results;
end;
$$;

create or replace function labelers_for_product(
  product_name text,
  query text default '',
  max_results int default 20
)
returns table (labeler_name text)
language plpgsql stable as $$
declare
  pn text := lower(product_name);
  q text := lower(query);
begin
  return query
  select distinct np.labeler_name
  from ndc_products np
  where np.labeler_name is not null
    and (
      -- Product is matched as a whole-word prefix: user picked an exact
      -- product name from the typeahead, so we want all labelers whose
      -- brand_name or generic_name equals that name or starts with it as
      -- a full word.
      lower(np.brand_name) = pn
      or lower(np.brand_name) like pn || ' %'
      or lower(np.generic_name) = pn
      or lower(np.generic_name) like pn || ' %'
    )
    and (
      -- Manufacturer query is partial-prefix (typeahead style).
      q = ''
      or np.labeler_norm like q || '%'        -- whole name starts with q
      or np.labeler_norm like '% ' || q || '%' -- any word in name starts with q
    )
  order by np.labeler_name
  limit max_results;
end;
$$;
