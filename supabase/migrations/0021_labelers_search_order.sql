-- Rank manufacturer prefix matches ahead of in-word matches when filtering.

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
language sql stable as $$
  with makers as (
    select distinct on (lower(c.name)) c.name as labeler_name, c.src as source
    from (
      select np.labeler_name as name, 'current'::text as src
      from ndc_products np
      where np.labeler_name is not null
        and (
          lower(np.brand_name) = lower(product_name)
          or lower(np.brand_name) like lower(product_name) || ' %'
          or lower(np.generic_name) = lower(product_name)
          or lower(np.generic_name) like lower(product_name) || ' %'
        )
        and (
          query = ''
          or np.labeler_norm like lower(query) || '%'
          or np.labeler_norm like '% ' || lower(query) || '%'
        )

      union all

      select r.recalling_firm as name, 'historical'::text as src
      from recalls r
      where r.recalling_firm is not null
        and (
          r.brand_name ilike lower(product_name)
          or r.brand_name ilike lower(product_name) || ' %'
          or r.brand_name ilike '% ' || lower(product_name) || ' %'
          or r.brand_name ilike '% ' || lower(product_name)
          or r.generic_name ilike lower(product_name)
          or r.generic_name ilike lower(product_name) || ' %'
          or r.generic_name ilike '% ' || lower(product_name) || ' %'
          or r.generic_name ilike '% ' || lower(product_name)
          or r.product_description ilike lower(product_name) || ' %'
          or r.product_description ilike '% ' || lower(product_name) || ' %'
          or r.product_description ilike '% ' || lower(product_name)
        )
        and (
          query = ''
          or r.recalling_firm ilike lower(query) || '%'
          or r.recalling_firm ilike '% ' || lower(query) || '%'
        )
    ) c
    order by lower(c.name), c.src
  )
  select m.labeler_name, m.source
  from makers m
  order by
    case
      when query = '' then 0
      when lower(m.labeler_name) like lower(query) || '%' then 0
      when lower(m.labeler_name) like '% ' || lower(query) || '%' then 1
      else 2
    end,
    lower(m.labeler_name)
  limit max_results;
$$;
