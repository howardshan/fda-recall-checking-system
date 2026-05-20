-- TEMPORARY debug column: stores compressed-JPEG data URLs of the original
-- photos the user captured. Used during development to inspect what was
-- actually photographed when OCR or matching goes wrong.
-- TODO: drop this column once the photo OCR pipeline is stable.

alter table extract_logs
  add column if not exists photos text[];
