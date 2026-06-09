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
  /** Tail used for p_value: 'over' (default), 'under', or 'two-sided'. */
  direction?: 'over' | 'under' | 'two-sided';
  /** Effect sizes from the 2x2 table (see statistics.effectSize). */
  fold_enrichment?: number;
  log_odds_ratio?: number;
  or_ci_low?: number;
  or_ci_high?: number;
}

export interface EfdrRow {
  ontology_id: string;
  ontology_name: string;
  nr_common_with_tested_elements: number;
  nr_common_with_background_elements: number;
  p_value: number;
  eFDR: number;
}
