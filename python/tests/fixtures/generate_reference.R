# Regenerate the ORA golden fixture from the mulea R package in this repo.
# Usage (from repo root):  Rscript python/tests/fixtures/generate_reference.R
# Requires: R, devtools, and mulea's dependencies installed.
suppressMessages(devtools::load_all("."))

gmt <- read_gmt(system.file(
  package = "mulea", "extdata",
  "Transcription_factor_RegulonDB_Escherichia_coli_GeneSymbol.gmt"))
gmt_f <- filter_ontology(gmt, min_nr_of_elements = 3, max_nr_of_elements = 400)

target <- readLines(system.file(package = "mulea", "extdata", "target_set.txt"))
background <- readLines(system.file(package = "mulea", "extdata", "background_set.txt"))

model <- ora(gmt = gmt_f, element_names = target,
             background_element_names = background,
             p_value_adjustment_method = "BH",
             nthreads = 1)
res <- run_test(model)
res <- res[, c("ontology_id", "ontology_name", "p_value", "adjusted_p_value")]
res <- res[order(res$ontology_id), ]

out <- file.path("python", "tests", "fixtures", "ora_bh_reference.csv")
write.csv(res, out, row.names = FALSE)
cat("Wrote", nrow(res), "rows to", out, "\n")
