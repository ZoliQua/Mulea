# python/tests/fixtures/generate_fgsea_posneg_reference.R
# Independent reference for the *configurable* GSEA weighting (web/src/gseaWeighting.ts):
# fgsea::calcGseaStat over scoreType in {pos, neg} x gseaParam in {1, 1.5}. calcGseaStat is the
# canonical, deterministic enrichment score (no permutation), so the web port must match it exactly.
# Mirrors generate_fgsea_reference.R (same ordered_set + filtered RegulonDB GMT inputs).
#
# Usage (from repo root): Rscript python/tests/fixtures/generate_fgsea_posneg_reference.R
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
ss <- sort(stats, decreasing = TRUE)

grid <- expand.grid(
  scoreType = c("pos", "neg"),
  gseaParam = c(1, 1.5),
  stringsAsFactors = FALSE)

rows <- list()
for (i in seq_len(nrow(grid))) {
  st <- grid$scoreType[i]
  gp <- grid$gseaParam[i]
  for (p in names(pathways)) {
    pos <- match(intersect(pathways[[p]], names(ss)), names(ss))
    es <- fgsea::calcGseaStat(ss, selectedStats = pos, gseaParam = gp, scoreType = st)
    rows[[length(rows) + 1L]] <- data.frame(
      pathway = p, scoreType = st, gseaParam = gp, ES = es,
      stringsAsFactors = FALSE)
  }
}
out <- do.call(rbind, rows)
out <- out[order(out$scoreType, out$gseaParam, out$pathway), ]

dst <- file.path("python", "tests", "fixtures", "fgsea_posneg_reference.csv")
write.csv(out, dst, row.names = FALSE)
cat("Wrote", nrow(out), "rows to", dst, "| fgsea", as.character(packageVersion("fgsea")), "\n")
