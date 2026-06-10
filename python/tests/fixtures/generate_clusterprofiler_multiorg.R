# python/tests/fixtures/generate_clusterprofiler_multiorg.R
# Multi-organism extension of generate_clusterprofiler_reference.R: an independent ORA reference
# from clusterProfiler::enricher (Bioconductor) on HUMAN and MOUSE TRRUST transcription-factor
# GMTs, proving muleaLab's hypergeometric/BH parity is not E. coli-specific.
#
# The target/background are SYNTHETIC but fully deterministic (seeded), so the fixtures replay
# exactly. Construction per organism (seed = 42):
#   1. filter GMT terms to 3 < full_term_size < 400 (mulea filter_ontology, strict/exclusive).
#   2. background = union of all genes in the filtered terms (the annotated universe).
#   3. pick 2 "planted" terms (the 1st and 2nd largest filtered terms) and force-include ALL
#      their genes in the target -> guarantees a couple of strongly enriched terms.
#   4. add a seeded random 10% sample of the remaining background genes as noise.
# The target is therefore a subset of the background, enriched for the 2 planted terms.
#
# Usage (from repo root): Rscript python/tests/fixtures/generate_clusterprofiler_multiorg.R
# Requires R + clusterProfiler. clusterProfiler has no eFDR; this validates the ORA core only.
suppressMessages(library(clusterProfiler))

fixtures <- file.path("python", "tests", "fixtures")
SEED <- 42L

run_one <- function(tag, gmt_file, target_file, background_file, out_csv) {
  gmt_path <- file.path(fixtures, gmt_file)
  t2g_all <- read.gmt(gmt_path)  # data.frame: term, gene

  # The TRRUST GMTs contain duplicate genes WITHIN a term. clusterProfiler's enricher works on
  # unique (term, gene) pairs (set semantics), whereas mulea's C++ core counts a term's gene list
  # as-is (a duplicate gene is counted twice — see src/set-based-enrichment-test.cpp). To keep the
  # external-tool comparison about the hypergeometric math (not a GMT-cleaning policy difference),
  # we deduplicate genes within each term up front, in BOTH tools (the web test does the same).
  t2g_all <- unique(t2g_all)

  # mulea's filter_ontology on FULL term size, STRICT/exclusive: 3 < size < 400.
  term_sizes <- table(t2g_all$term)
  keep <- names(term_sizes)[term_sizes > 3 & term_sizes < 400]
  t2g <- t2g_all[t2g_all$term %in% keep, ]

  # background = union of genes across the filtered terms (clusterProfiler's annotated universe).
  background <- sort(unique(t2g$gene))

  # planted terms: the two largest filtered terms (deterministic ordering by size then name).
  ks <- keep[order(-as.integer(term_sizes[keep]), keep)]
  planted <- ks[1:2]
  planted_genes <- unique(t2g$gene[t2g$term %in% planted])

  # noise: seeded 10% sample of the remaining background.
  set.seed(SEED)
  rest <- setdiff(background, planted_genes)
  noise <- sample(rest, size = floor(length(rest) * 0.10))
  target <- sort(unique(c(planted_genes, noise)))

  writeLines(target, file.path(fixtures, target_file))
  writeLines(background, file.path(fixtures, background_file))

  # pvalueCutoff/qvalueCutoff = 1 -> return every tested term; minGSSize/maxGSSize disabled
  # (size filter already applied above on the full term size). pAdjustMethod = BH.
  res <- enricher(
    gene = target, universe = background, TERM2GENE = t2g,
    pvalueCutoff = 1, qvalueCutoff = 1, minGSSize = 1, maxGSSize = 1e9,
    pAdjustMethod = "BH")

  df <- as.data.frame(res)
  out <- df[, c("ID", "pvalue", "p.adjust")]
  out <- out[order(out$ID), ]
  write.csv(out, file.path(fixtures, out_csv), row.names = FALSE)
  cat(sprintf("[%s] wrote %d rows | target=%d background=%d planted=%s | %s\n",
      tag, nrow(out), length(target), length(background),
      paste(planted, collapse = ","), out_csv))
}

run_one("human", "gmt_human.gmt", "target_human.txt", "background_human.txt",
        "clusterprofiler_human.csv")
run_one("mouse", "gmt_mouse.gmt", "target_mouse.txt", "background_mouse.txt",
        "clusterprofiler_mouse.csv")
cat("clusterProfiler", as.character(packageVersion("clusterProfiler")), "\n")
