# python/tests/fixtures/generate_efdr_reference.R
# Regenerate the eFDR golden fixture from the mulea R package in this repo.
# Usage (from repo root): Rscript python/tests/fixtures/generate_efdr_reference.R
# Requires R + mulea deps. High permutation count keeps Monte-Carlo noise low so the
# exact Python eFDR can be compared within tolerance.
suppressMessages(devtools::load_all("."))

gmt <- read_gmt(system.file(
  package = "mulea", "extdata",
  "Transcription_factor_RegulonDB_Escherichia_coli_GeneSymbol.gmt"))
gmt_f <- filter_ontology(gmt, min_nr_of_elements = 3, max_nr_of_elements = 400)

target <- readLines(system.file(package = "mulea", "extdata", "target_set.txt"))
background <- readLines(system.file(package = "mulea", "extdata", "background_set.txt"))

model <- ora(gmt = gmt_f, element_names = target,
             background_element_names = background,
             p_value_adjustment_method = "eFDR",
             number_of_permutations = 100000,
             random_seed = 42,
             nthreads = 1)   # nthreads=1: single-threaded so devtools::load_all works
res <- run_test(model)
res <- res[, c("ontology_id", "ontology_name",
               "nr_common_with_tested_elements", "nr_common_with_background_elements",
               "p_value", "eFDR")]
res <- res[order(res$ontology_id), ]

out <- file.path("python", "tests", "fixtures", "ora_efdr_reference.csv")
write.csv(res, out, row.names = FALSE)
cat("Wrote", nrow(res), "rows to", out, "\n")
