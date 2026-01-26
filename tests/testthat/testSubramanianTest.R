test_that("GSEA : object creation test.", {
  gmtMock <- data.frame(
    ontology_id = "GO:0000001",
    ontology_name = "Imagin gen ontology to tests.",
    list_of_values = I(list(c("a", "b", "c"))),
    stringsAsFactors = FALSE
  )
  testDataMock <- c("a", "b", "c")
  scoreDataMock <- c(0.1, 0.5, 1)
  
  mulea_ranked_based_test_model <- gsea(
    gmt = gmtMock,
    element_names = testDataMock,
    element_scores = scoreDataMock)

  testthat::expect_equal(mulea_ranked_based_test_model@gmt, gmtMock)
  testthat::expect_equal(
    mulea_ranked_based_test_model@element_names, c("a", "b", "c"))
  testthat::expect_equal(
    mulea_ranked_based_test_model@element_scores, c(0.1, 0.5, 1))
})

test_that("GSEA : no element_scores vector.", {
  gmtMock <- data.frame(
    ontology_id = "GO:0000001",
    ontology_name = "Imagin gen ontology to tests.",
    list_of_values = I(list(c("a", "b", "c"))),
    stringsAsFactors = FALSE
  )
  testDataMock <- c("a", "b", "d")
  
  mulea_ranked_based_test_model <- gsea(
    gmt = gmtMock, element_names = testDataMock)
  testthat::expect_error(muleaTestRes <-
                           run_test(mulea_ranked_based_test_model))
})

test_that("GSEA : result column names are correct.", {
  # Create mock GMT data
  gmtMock <- data.frame(
    ontology_id = c("TF_001", "TF_002", "TF_003"),
    ontology_name = c("TranscriptionFactor1", "TranscriptionFactor2", "TranscriptionFactor3"),
    list_of_values = I(list(
      c("geneA", "geneB", "geneC"),
      c("geneD", "geneE", "geneF"),
      c("geneA", "geneG", "geneH")
    )),
    stringsAsFactors = FALSE
  )
  
  # Create mock gene list with scores (simulating logFC values)
  element_names_mock <- c("geneA", "geneB", "geneC", "geneD", "geneE", 
                          "geneF", "geneG", "geneH", "geneI", "geneJ")
  element_scores_mock <- c(2.5, 1.8, 1.2, 0.9, 0.5, 0.2, -0.3, -0.8, -1.2, -1.5)
  
  # Create GSEA model
  gsea_model <- gsea(
    gmt = gmtMock,
    element_names = element_names_mock,
    element_scores = element_scores_mock,
    element_score_type = "pos",
    number_of_permutations = 100  # Low number for faster testing
  )
  
  # Run the test
  gsea_results <- run_test(gsea_model)
  
  # Check that the result is a data frame
  testthat::expect_s3_class(gsea_results, "data.frame")
  
  # Check the expected column names
  expected_columns <- c("ontology_id", "ontology_name", 
                        "nr_common_with_tested_elements", "p_value", 
                        "enrichment_score", "normalised_enrichment_score", 
                        "adjusted_p_value")
  
  testthat::expect_equal(names(gsea_results), expected_columns)
})

