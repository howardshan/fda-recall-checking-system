-- Fuzzy-search RPC functions used by /api/extract and /api/check-recall.
-- Uses pg_trgm word_similarity (3-gram windowed match — handles OCR'd text well).
-- Indexes from 0001_init.sql back the <% operator.
--
-- word_similarity is not symmetric: word_similarity(a, b) finds the best
-- window in `b` that contains the trigrams of `a`. So a short query against
-- a long field, and a long OCR text against a short field, need opposite
-- argument order. We compute both directions and take the greatest.

-- Helper used by `npm run seed:ndc` to wipe the dictionary before re-loading.
create or replace function truncate_ndc_products()
returns void
language plpgsql
volatile
security definer
as $$
begin
  truncate table ndc_products restart identity;
end;
$$;

create or replace function ndc_fuzzy_search(
  query text,
  threshold real default 0.4,
  max_results int default 50
)
returns table (
  product_ndc text,
  generic_name text,
  brand_name text,
  labeler_name text,
  dosage_form text,
  product_score real,
  labeler_score real
)
language plpgsql
volatile
as $$
begin
  execute format('set local pg_trgm.word_similarity_threshold = %s', threshold);
  set local statement_timeout = '20s';
  return query
  with scored as (
    select
      np.product_ndc,
      np.generic_name,
      np.brand_name,
      np.labeler_name,
      np.dosage_form,
      greatest(
        coalesce(word_similarity(np.generic_name, query), 0),
        coalesce(word_similarity(query, np.generic_name), 0),
        coalesce(word_similarity(np.brand_name, query), 0),
        coalesce(word_similarity(query, np.brand_name), 0)
      )::real as product_score,
      greatest(
        coalesce(word_similarity(np.labeler_name, query), 0),
        coalesce(word_similarity(query, np.labeler_name), 0)
      )::real as labeler_score
    from ndc_products np
    where
      np.generic_name <% query
      or query <% np.generic_name
      or np.brand_name <% query
      or query <% np.brand_name
      or np.labeler_name <% query
      or query <% np.labeler_name
  )
  select
    s.product_ndc,
    s.generic_name,
    s.brand_name,
    s.labeler_name,
    s.dosage_form,
    s.product_score,
    s.labeler_score
  from scored s
  order by (s.product_score * 0.7 + s.labeler_score * 0.3) desc
  limit max_results;
end;
$$;

create or replace function recalls_fuzzy_search(
  product_text text,
  firm_text text default null,
  threshold real default 0.4,
  max_results int default 50
)
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
  package_ndc text[],
  product_score real,
  firm_score real
)
language plpgsql
volatile
as $$
declare
  has_firm boolean := firm_text is not null and firm_text <> '';
begin
  execute format('set local pg_trgm.word_similarity_threshold = %s', threshold);
  set local statement_timeout = '20s';
  return query
  with scored as (
    select
      r.id,
      r.recall_number,
      r.recalling_firm,
      r.product_description,
      r.brand_name,
      r.generic_name,
      r.manufacturer_name,
      r.reason_for_recall,
      r.classification,
      r.status,
      r.recall_initiation_date,
      r.code_info,
      r.distribution_pattern,
      r.product_ndc,
      r.package_ndc,
      greatest(
        coalesce(word_similarity(r.product_description, product_text), 0),
        coalesce(word_similarity(product_text, r.product_description), 0),
        coalesce(word_similarity(r.brand_name, product_text), 0),
        coalesce(word_similarity(product_text, r.brand_name), 0),
        coalesce(word_similarity(r.generic_name, product_text), 0),
        coalesce(word_similarity(product_text, r.generic_name), 0)
      )::real as product_score,
      case
        when not has_firm then 0::real
        else greatest(
          coalesce(word_similarity(r.recalling_firm, firm_text), 0),
          coalesce(word_similarity(firm_text, r.recalling_firm), 0)
        )::real
      end as firm_score
    from recalls r
    where
      r.product_description <% product_text
      or product_text <% r.product_description
      or r.brand_name <% product_text
      or product_text <% r.brand_name
      or r.generic_name <% product_text
      or product_text <% r.generic_name
      or (has_firm and (
            r.recalling_firm <% firm_text
            or firm_text <% r.recalling_firm
          ))
  )
  select
    s.id, s.recall_number, s.recalling_firm, s.product_description,
    s.brand_name, s.generic_name, s.manufacturer_name, s.reason_for_recall,
    s.classification, s.status, s.recall_initiation_date, s.code_info,
    s.distribution_pattern, s.product_ndc, s.package_ndc,
    s.product_score, s.firm_score
  from scored s
  order by (s.product_score * 0.7 + s.firm_score * 0.3) desc
  limit max_results;
end;
$$;
