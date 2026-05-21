-- OCR / barcode pipeline cancelled per SOW v3.0. extract_logs (introduced in
-- 0009 + 0011 for debugging photo OCR) is no longer used by any code path —
-- drop it. Migrations 0009 and 0011 remain in the history for the record.

drop table if exists extract_logs cascade;
