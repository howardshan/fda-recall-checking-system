-- Whole-word match for recalls.{brand_name,generic_name,product_description}.
-- Replaces the pg_trgm word_similarity path that pulled in Tacrolimus when
-- searching Sirolimus (5 shared trigrams in the "-rolimus" suffix).
--
-- ILIKE with sentinel-space patterns gives word-boundary semantics, and the
-- existing gin_trgm_ops GIN indexes from migration 0001 accelerate it.

create or replace function recalls_exact_product_match(product_phrase text)
returns table (
  id bigint,
  recall_number text,
  recalling_firm text,
  product_description text,
  brand_name text,
  generic_name text,
  manufacturer_name text,
  reason_for_recall text,
  classification text,
  status text,
  recall_initiation_date date,
  code_info text,
  distribution_pattern text,
  product_ndc text[],
  package_ndc text[]
)
language plpgsql stable as $$
begin
  return query
  select
    r.id, r.recall_number, r.recalling_firm, r.product_description,
    r.brand_name, r.generic_name, r.manufacturer_name, r.reason_for_recall,
    r.classification, r.status, r.recall_initiation_date, r.code_info,
    r.distribution_pattern, r.product_ndc, r.package_ndc
  from recalls r
  where
    -- short-name fields: equal, prefix, middle, or suffix word match
    r.brand_name ilike product_phrase
    or r.brand_name ilike (product_phrase || ' %')
    or r.brand_name ilike ('% ' || product_phrase || ' %')
    or r.brand_name ilike ('% ' || product_phrase)
    or r.generic_name ilike product_phrase
    or r.generic_name ilike (product_phrase || ' %')
    or r.generic_name ilike ('% ' || product_phrase || ' %')
    or r.generic_name ilike ('% ' || product_phrase)
    -- product_description is a long sentence — word-anywhere
    or r.product_description ilike (product_phrase || ' %')
    or r.product_description ilike ('% ' || product_phrase || ' %')
    or r.product_description ilike ('% ' || product_phrase)
  order by r.recall_initiation_date desc nulls last
  limit 50;
end;
$$;
