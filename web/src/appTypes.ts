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
