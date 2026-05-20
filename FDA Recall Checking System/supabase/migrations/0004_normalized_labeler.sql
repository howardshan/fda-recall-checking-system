-- Normalized labeler column for robust word-anywhere matching.
-- FDA labelers commonly carry leading titles ("Dr.", "Inc.") and apostrophes
-- ("Reddy's"), which break a strict prefix match like "reddys%". This adds a
-- lowercase, letters-and-spaces-only column we can search with whole-word
-- LIKE patterns (delimited by sentinel spaces).

alter table ndc_products
  add column if not exists labeler_norm text
  generated always as (
    trim(regexp_replace(
      regexp_replace(
        regexp_replace(lower(coalesce(labeler_name, '')), $a$['`]+$a$, '', 'g'),
        '[^a-z]+', ' ', 'g'
      ),
      ' +', ' ', 'g'
    ))
  ) stored;

create index if not exists idx_ndc_labeler_norm_trgm
  on ndc_products using gin (labeler_norm gin_trgm_ops);

-- Replace labeler_phrase_lookup to match `phrase` as a WHOLE WORD anywhere in
-- the normalized labeler name. The sentinel-space pattern (' ' || norm || ' '
-- LIKE '% phrase %') gives word-boundary semantics with normal LIKE, which
-- the GIN trigram index can accelerate.
create or replace function labeler_phrase_lookup(phrases text[])
returns table (
  phrase text,
  labeler_name text
)
language sql stable as $fn$
  select distinct
    p.phrase,
    np.labeler_name
  from unnest(phrases) as p(phrase)
  cross join lateral (
    select labeler_name
    from ndc_products
    where labeler_norm is not null
      and (' ' || labeler_norm || ' ') like ('% ' || p.phrase || ' %')
    limit 60
  ) np;
$fn$;
