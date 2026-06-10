export type Method = 'eFDR' | 'BH' | 'bonferroni';

export type EfdrMode = 'exact' | 'resampling';

export interface AnalysisInput {
  gmtText: string;
  target: string[];
  background: string[];
  method: Method;
  minNrOfElements: number;
  maxNrOfElements: number;
  efdrMode?: EfdrMode;
  steps?: number;
  seed?: number;
  /** Hypergeometric tail for the BH/Bonferroni ORA path (eFDR is always over-representation). */
  direction?: 'over' | 'under' | 'two-sided';
  /** Clamp eFDR to ≤1 (default true). false = raw rExp/rObs ratio, matching base-R mulea. */
  efdrClamp?: boolean;
}

export interface ResultRow {
  ontology_id: string;
  ontology_name: string;
  p_value: number;
  adjusted_p_value?: number;
  eFDR?: number;
  /** Approximate Poisson Monte-Carlo standard error + 95% CI for the resampling eFDR (MC path only). */
  efdrSe?: number;
  efdrCiLow?: number;
  efdrCiHigh?: number;
  nr_common_with_tested_elements?: number;
  nr_common_with_background_elements?: number;
  hits?: string[];
  /** Tail of the hypergeometric ORA test that produced p_value. */
  direction?: 'over' | 'under' | 'two-sided';
  /** Fold enrichment (k/n)/(K/N) for the term (ORA path only). */
  fold_enrichment?: number;
  /** Natural-log odds ratio with Haldane–Anscombe correction (ORA path only). */
  log_odds_ratio?: number;
  /** 95% Wald CI for the (linear) odds ratio. */
  or_ci_low?: number;
  or_ci_high?: number;
}

export interface EfdrDiagnostics {
  steps: number;
  seed: number;
  runtimeMs: number;
  maxAbsDeltaVsExact: number;
  termsCompared: number;
  withinNoise: boolean;
  clampedToOne: boolean;
}

export interface AnalysisResult {
  rows: ResultRow[];
  method: Method;
  meta: { nTerms: number; nTargetDropped: number; poolSize: number };
  warnings: string[];
  efdrMode?: EfdrMode;
  diagnostics?: EfdrDiagnostics;
}
