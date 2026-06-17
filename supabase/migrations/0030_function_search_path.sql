-- Security Advisor: pin search_path on public RPCs to prevent search_path hijacking.

alter function public.truncate_ndc_products() set search_path = public;

alter function public.product_name_suggest(text, integer) set search_path = public;

alter function public.recalls_fuzzy_search(text, text, real, integer) set search_path = public;

alter function public.labeler_phrase_lookup(text[]) set search_path = public;

alter function public.recalls_exact_product_match(text) set search_path = public;

alter function public.labelers_for_product(text, text, integer) set search_path = public;

alter function public.ndc_fuzzy_search(text, real, integer) set search_path = public;

alter function public.drug_phrase_lookup(text[], integer) set search_path = public;

alter function public.common_labelers_for_product(text, integer) set search_path = public;
