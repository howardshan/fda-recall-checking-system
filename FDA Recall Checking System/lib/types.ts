export type RecallClassification = "Class I" | "Class II" | "Class III" | string;

export type RecallRow = {
  recall_number: string;
  recalling_firm: string | null;
  product_description: string | null;
  brand_name: string | null;
  generic_name: string | null;
  manufacturer_name: string | null;
  product_ndc: string[] | null;
  package_ndc: string[] | null;
  reason_for_recall: string | null;
  classification: RecallClassification | null;
  status: string | null;
  recall_initiation_date: string | null;
  code_info: string | null;
  distribution_pattern: string | null;
  raw: unknown;
};

export type NdcProductRow = {
  product_ndc: string | null;
  generic_name: string | null;
  brand_name: string | null;
  labeler_name: string | null;
  dosage_form: string | null;
  raw: unknown;
};

export type OpenFdaEnforcementRecord = {
  recall_number?: string;
  recalling_firm?: string;
  product_description?: string;
  reason_for_recall?: string;
  classification?: string;
  status?: string;
  recall_initiation_date?: string;
  code_info?: string;
  distribution_pattern?: string;
  openfda?: {
    brand_name?: string[];
    generic_name?: string[];
    manufacturer_name?: string[];
    product_ndc?: string[];
    package_ndc?: string[];
  };
  [k: string]: unknown;
};

export type OpenFdaNdcRecord = {
  product_ndc?: string;
  generic_name?: string;
  brand_name?: string;
  labeler_name?: string;
  dosage_form?: string;
  [k: string]: unknown;
};
