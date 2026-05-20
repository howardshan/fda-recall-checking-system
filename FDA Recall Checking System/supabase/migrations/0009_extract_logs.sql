-- Log every /api/extract call so we can debug photo / barcode extraction
-- failures retroactively. OCR text and the full result (including candidates)
-- are captured so we can see what the algorithm saw and what it returned.

create table if not exists extract_logs (
  id bigint generated always as identity primary key,
  created_at timestamptz default now(),
  source text,                -- 'photo' / 'barcode' / 'ndc'
  ocr_text text,              -- raw OCR text (nullable, truncated to 8000 chars)
  barcode_raw text,           -- raw barcode payload (nullable)
  ndc_input text,             -- explicit NDC input (nullable)
  result jsonb                -- full ExtractResult including candidates
);

create index if not exists idx_extract_logs_created_at
  on extract_logs (created_at desc);
