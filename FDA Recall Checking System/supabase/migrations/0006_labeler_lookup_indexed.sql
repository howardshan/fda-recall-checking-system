-- Rewrite labeler_phrase_lookup so every WHERE clause can hit an index.
-- The previous version wrapped labeler_norm in concatenation
-- (' ' || labeler_norm || ' '), which hid the indexed column from the planner
-- and forced a sequential scan.

drop function if exists labeler_phrase_lookup(text[]);

create index if not exists idx_ndc_labeler_norm_pattern
  on ndc_products (labeler_norm text_pattern_ops);

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
        and (
          -- whole-word match: equal, prefix, suffix, or middle.
          -- Equal + prefix use the text_pattern_ops btree.
          -- Suffix + middle use the gin_trgm_ops GIN index.
          np.labeler_norm = p
          or np.labeler_norm like (p || ' %')
          or np.labeler_norm like ('% ' || p)
          or np.labeler_norm like ('% ' || p || ' %')
        )
      limit 60;
  end loop;
end;
$$;
