# python/tests/fixtures/generate_fgsea_multilevel_reference.R
# Reference for the fgsea MULTILEVEL p-value (Korotkevich et al. 2021) on the E. coli example,
# so the TypeScript multilevel port (web/src/gseaMultilevel.ts) can be validated against it.
# fgseaMultilevel is stochastic (draws its own internal seed), so we average log(pval) over many
# seeds to get a stable target, and keep the seed-1 log2err as fgsea's own uncertainty band.
#
# Usage (from repo root): Rscript python/tests/fixtures/generate_fgsea_multilevel_reference.R
# Requires R + fgsea.
suppressMessages(library(fgsea))

gmt_lines <- readLines(file.path("inst", "extdata",
  "Transcription_factor_RegulonDB_Escherichia_coli_GeneSymbol.gmt"))
fields <- strsplit(gmt_lines, "\t", fixed = TRUE)
pathways <- lapply(fields, function(f) f[-(1:2)])
names(pathways) <- vapply(fields, `[`, character(1), 1)
sz <- vapply(pathways, length, integer(1))
pathways <- pathways[sz > 3 & sz < 400]

ord <- read.delim(file.path("inst", "extdata", "ordered_set.tsv"))
stats <- ord$logFC
names(stats) <- ord$Gene.symbol

seeds <- 1:25
logp <- sapply(seeds, function(s) {
  set.seed(s)
  res <- fgseaMultilevel(pathways, stats, sampleSize = 101, eps = 0,
                         nPermSimple = 1000, scoreType = "std", gseaParam = 1)
  res <- res[order(res$pathway), ]
  log(res$pval)
})
mean_logp <- rowMeans(logp)              # stable target = mean of log p over seeds
sd_logp <- apply(logp, 1, sd)            # empirical seed-to-seed spread of log p

set.seed(1)
ref <- fgseaMultilevel(pathways, stats, sampleSize = 101, eps = 0,
                       nPermSimple = 1000, scoreType = "std", gseaParam = 1)
ref <- ref[order(ref$pathway), ]

out <- data.frame(
  pathway = ref$pathway, size = ref$size, ES = ref$ES, NES = ref$NES,
  mean_log_pval = mean_logp, sd_log_pval = sd_logp, log2err = ref$log2err)
dst <- file.path("python", "tests", "fixtures", "fgsea_multilevel_reference.csv")
write.csv(out, dst, row.names = FALSE)
cat("Wrote", nrow(out), "rows to", dst, "| fgsea", as.character(packageVersion("fgsea")),
    "| smallest mean p ~", format(exp(min(mean_logp)), digits = 3), "\n")
