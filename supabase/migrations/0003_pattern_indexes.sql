-- Btree indexes with text_pattern_ops to make case-folded LIKE 'phrase%'
-- prefix queries fast. Used by the N-gram window match in /api/extract.

create index if not exists idx_ndc_brand_lower_pattern
  on ndc_products (lower(brand_name) text_pattern_ops);
create index if not exists idx_ndc_generic_lower_pattern
  on ndc_products (lower(generic_name) text_pattern_ops);
create index if not exists idx_ndc_labeler_lower_pattern
  on ndc_products (lower(labeler_name) text_pattern_ops);

-- Look up NDC dictionary rows whose brand_name or generic_name starts with
-- any phrase in the input array (case-insensitive, whole-word anchored).
-- "Whole-word anchored" means: name = phrase, or name LIKE 'phrase %' — so
-- "amox" doesn't bleed into "amoxicillin", and "amoxicillin" matches
-- "Amoxicillin and Clavulanate Potassium" but not "Co-Amoxiclav".
--
-- Optional `labelers` arg restricts results to that set of manufacturers.
-- The caller does the labeler scan first; when both scans find matches we
-- can intersect IN SQL (where LIMIT-truncation can't hurt the intersection)
-- instead of in app code.
create or replace function drug_phrase_lookup(
  phrases text[],
  per_phrase_limit int default 300
)
returns table (
  phrase text,
  product_ndc text,
  brand_name text,
  generic_name text,
  labeler_name text,
  dosage_form text
)
language sql stable as $$
  select distinct
    p.phrase,
    np.product_ndc,
    np.brand_name,
    np.generic_name,
    np.labeler_name,
    np.dosage_form
  from unnest(phrases) as p(phrase)
  cross join lateral (
    select product_ndc, brand_name, generic_name, labeler_name, dosage_form
    from ndc_products
    where lower(brand_name) = p.phrase
       or lower(brand_name) like p.phrase || ' %'
       or lower(generic_name) = p.phrase
       or lower(generic_name) like p.phrase || ' %'
    limit per_phrase_limit
  ) np;
$$;

create or replace function labeler_phrase_lookup(phrases text[])
returns table (
  phrase text,
  labeler_name text
)
language sql stable as $$
  select distinct
    p.phrase,
    np.labeler_name
  from unnest(phrases) as p(phrase)
  cross join lateral (
    select labeler_name
    from ndc_products
    where lower(labeler_name) = p.phrase
       or lower(labeler_name) like p.phrase || ' %'
    limit 60
  ) np;
$$;
