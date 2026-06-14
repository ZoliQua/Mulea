export interface ExampleInputs { gmtText: string; target: string[]; background: string[] }

/** Fetch the bundled E. coli RegulonDB example from /examples/. */
export async function loadExample(): Promise<ExampleInputs> {
  const base = import.meta.env.BASE_URL;
  const [gmtText, targetText, backgroundText] = await Promise.all([
    fetch(`${base}examples/ecoli_regulondb.gmt`).then((r) => r.text()),
    fetch(`${base}examples/ecoli_target.txt`).then((r) => r.text()),
    fetch(`${base}examples/ecoli_background.txt`).then((r) => r.text()),
  ]);
  const lines = (t: string) => t.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  return { gmtText, target: lines(targetText), background: lines(backgroundText) };
}
