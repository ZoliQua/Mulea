# python/tests/fixtures/generate_clusterprofiler_reference.R
# Independent ORA reference from clusterProfiler::enricher (Bioconductor) — an external,
# published tool — on the SAME E. coli RegulonDB inputs muleaLab uses. Validates muleaLab's
# hypergeometric p-value (+ BH) against a second implementation (apples-to-apples).
#
# Usage (from repo root): Rscript python/tests/fixtures/generate_clusterprofiler_reference.R
# Requires R + clusterProfiler. clusterProfiler has no eFDR; this validates the ORA core only.
suppressMessages(library(clusterProfiler))

gmt_path <- file.path("inst", "extdata",
  "Transcription_factor_RegulonDB_Escherichia_coli_GeneSymbol.gmt")
t2g_all <- read.gmt(gmt_path)  # data.frame: term, gene

# mulea's filter_ontology is on the FULL term size, STRICT/exclusive: 3 < size < 400.
# Apply it here (NOT enricher's universe-intersected min/maxGSSize) so the tested term set
# matches muleaLab exactly.
term_sizes <- table(t2g_all$term)
keep <- names(term_sizes)[term_sizes > 3 & term_sizes < 400]
t2g <- t2g_all[t2g_all$term %in% keep, ]

target <- readLines(file.path("inst", "extdata", "target_set.txt"))
background <- readLines(file.path("inst", "extdata", "background_set.txt"))

# pvalueCutoff/qvalueCutoff = 1 → return every tested term; minGSSize/maxGSSize disabled
# (the size filter is already applied above on the full term size).
res <- enricher(
  gene = target, universe = background, TERM2GENE = t2g,
  pvalueCutoff = 1, qvalueCutoff = 1, minGSSize = 1, maxGSSize = 1e9,
  pAdjustMethod = "BH")

df <- as.data.frame(res)
out <- df[, c("ID", "pvalue", "p.adjust")]
out <- out[order(out$ID), ]

dst <- file.path("python", "tests", "fixtures", "clusterprofiler_reference.csv")
write.csv(out, dst, row.names = FALSE)
cat("Wrote", nrow(out), "rows to", dst,
    "| clusterProfiler", as.character(packageVersion("clusterProfiler")), "\n")
