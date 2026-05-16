/** Map a significance score (eFDR / adjusted p-value) to a 3-bucket color. */
export function scoreToColor(score: number): string {
  return score < 0.001 ? '#7b1fa2' : score < 0.01 ? '#c0392b' : '#e67e22';
}
