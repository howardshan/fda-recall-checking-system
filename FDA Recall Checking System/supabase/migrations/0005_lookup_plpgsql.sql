-- Rewrite phrase lookups in plpgsql with FOREACH so the planner uses the
-- functional btree indexes (idx_ndc_brand_lower_pattern, etc.) per iteration.
-- The earlier SQL-language version with CROSS JOIN LATERAL unnest forced a
-- single seq scan because the phrase value wasn't known at plan time.

drop function if exists drug_phrase_lookup(text[], integer);
drop function if exists labeler_phrase_lookup(text[]);

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
language plpgsql stable as $$
declare
  p text;
begin
  foreach p in array phrases loop
    return query
      select distinct
        p,
        np.product_ndc,
        np.brand_name,
        np.generic_name,
        np.labeler_name,
        np.dosage_form
      from ndc_products np
      where lower(np.brand_name) = p
         or lower(np.brand_name) like p || ' %'
         or lower(np.generic_name) = p
         or lower(np.generic_name) like p || ' %'
      limit per_phrase_limit;
  end loop;
end;
$$;

create or replace function labeler_phrase_lookup(phrases text[])
returns table (
  phrase text,
  labeler_name text
)
language plpgsql stable as $$
declare
  p text;
begin
  foreach p in array phrases loop
    return query
      select distinct p, np.labeler_name
      from ndc_products np
      where np.labeler_norm is not null
        and (' ' || np.labeler_norm || ' ') like ('% ' || p || ' %')
      limit 60;
  end loop;
end;
$$;
