# python/tests/fixtures/generate_fgsea_reference.R
# Independent GSEA reference from fgsea (Bioconductor) — exactly the call mulea's gsea() makes
# (SubramanianTest.R): fgsea::fgsea(pathways, stats, gseaParam, scoreType), no nperm → multilevel.
# Validates mulea's web GSEA: ES/NES exact, p-value tolerance (web uses a classic permutation p).
#
# Usage (from repo root): Rscript python/tests/fixtures/generate_fgsea_reference.R
# Requires R + fgsea.
suppressMessages(library(fgsea))

gmt_lines <- readLines(file.path("inst", "extdata",
  "Transcription_factor_RegulonDB_Escherichia_coli_GeneSymbol.gmt"))
fields <- strsplit(gmt_lines, "\t", fixed = TRUE)
pathways <- lapply(fields, function(f) f[-(1:2)])
names(pathways) <- vapply(fields, `[`, character(1), 1)
# mulea applies filter_ontology(3, 400) before gsea (strict: 3 < full term size < 400)
sz <- vapply(pathways, length, integer(1))
pathways <- pathways[sz > 3 & sz < 400]

ord <- read.delim(file.path("inst", "extdata", "ordered_set.tsv"))
stats <- ord$logFC
names(stats) <- ord$Gene.symbol

set.seed(42)  # fgseaMultilevel is stochastic; fix the seed for a reproducible fixture
res <- fgsea::fgsea(pathways = pathways, stats = stats, gseaParam = 1, scoreType = "std")
out <- as.data.frame(res)[, c("pathway", "size", "ES", "NES", "pval", "padj")]

# fgsea()'s multilevel batch code carries a ~1e-6 numerical artefact in ES on heavily-tied,
# low-precision scores. The canonical ES is fgsea::calcGseaStat — use it for the ES column so the
# reference is the exact enrichment score (NES/pval/padj stay from the multilevel run).
ss <- sort(stats, decreasing = TRUE)
out$ES <- vapply(out$pathway, function(p) {
  pos <- match(intersect(pathways[[p]], names(ss)), names(ss))
  fgsea::calcGseaStat(ss, selectedStats = pos, gseaParam = 1, scoreType = "std")
}, numeric(1))

out <- out[order(out$pathway), ]
dst <- file.path("python", "tests", "fixtures", "fgsea_reference.csv")
write.csv(out, dst, row.names = FALSE)
cat("Wrote", nrow(out), "rows to", dst, "| fgsea", as.character(packageVersion("fgsea")), "\n")
