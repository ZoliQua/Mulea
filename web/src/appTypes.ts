export type Method = 'eFDR' | 'BH' | 'bonferroni';

export interface AnalysisInput {
  gmtText: string;
  target: string[];
  background: string[];
  method: Method;
  minNrOfElements: number;
  maxNrOfElements: number;
}

export interface ResultRow {
  ontology_id: string;
  ontology_name: string;
  p_value: number;
  adjusted_p_value?: number;
  eFDR?: number;
  nr_common_with_tested_elements?: number;
  nr_common_with_background_elements?: number;
  hits?: string[];
}

export interface AnalysisResult {
  rows: ResultRow[];
  method: Method;
  meta: { nTerms: number; nTargetDropped: number; poolSize: number };
  warnings: string[];
}
