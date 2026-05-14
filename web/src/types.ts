export interface GmtTerm {
  ontology_id: string;
  ontology_name: string;
  list_of_values: string[];
}

export interface OraRow {
  ontology_id: string;
  ontology_name: string;
  p_value: number;
  adjusted_p_value: number;
}

export interface EfdrRow {
  ontology_id: string;
  ontology_name: string;
  nr_common_with_tested_elements: number;
  nr_common_with_background_elements: number;
  p_value: number;
  eFDR: number;
}
