-- FDA Recall Checking System — initial schema
-- Run this in your Supabase project's SQL editor (or via supabase CLI).

create extension if not exists pg_trgm;

-- Recall records (source: OpenFDA drug enforcement)
create table if not exists recalls (
  id bigint generated always as identity primary key,
  recall_number text unique not null,
  recalling_firm text,
  product_description text,
  brand_name text,
  generic_name text,
  manufacturer_name text,
  product_ndc text[],
  package_ndc text[],
  reason_for_recall text,
  classification text,
  status text,
  recall_initiation_date date,
  code_info text,
  distribution_pattern text,
  raw jsonb,
  synced_at timestamptz default now()
);
create index if not exists idx_recalls_firm_trgm    on recalls using gin (recalling_firm gin_trgm_ops);
create index if not exists idx_recalls_product_trgm on recalls using gin (product_description gin_trgm_ops);
create index if not exists idx_recalls_product_ndc  on recalls using gin (product_ndc);
create index if not exists idx_recalls_package_ndc  on recalls using gin (package_ndc);

-- NDC directory (source: OpenFDA NDC) used as dictionary for OCR matching
create table if not exists ndc_products (
  id bigint generated always as identity primary key,
  product_ndc text,
  generic_name text,
  brand_name text,
  labeler_name text,
  dosage_form text,
  raw jsonb
);
create index if not exists idx_ndc_generic_trgm on ndc_products using gin (generic_name gin_trgm_ops);
create index if not exists idx_ndc_brand_trgm   on ndc_products using gin (brand_name gin_trgm_ops);
create index if not exists idx_ndc_labeler_trgm on ndc_products using gin (labeler_name gin_trgm_ops);

-- Sync job log
create table if not exists sync_runs (
  id bigint generated always as identity primary key,
  source text,
  started_at timestamptz default now(),
  finished_at timestamptz,
  status text,
  records_upserted int,
  error text
);

-- Query log (for ops observability)
create table if not exists query_logs (
  id bigint generated always as identity primary key,
  input_method text,
  input_product text,
  input_manufacturer text,
  input_ndc text,
  input_lot text,
  result_status text,
  created_at timestamptz default now()
);
