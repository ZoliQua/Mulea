// Dependency-free native test driver for the pure-C++ eFDR core.
// Build/run via ./build-native.sh. Exits nonzero if any check fails.
#include <clocale>
#include <cmath>
#include <cstddef>
#include <cstdio>
#include <fstream>
#include <map>
#include <set>
#include <sstream>
#include <string>
#include <unordered_map>
#include <vector>

#include "efdr_convert.h"
#include "efdr_core.h"
#include "example_data.h"
#include "hyper.h"

static int g_failures = 0;
static int g_checks = 0;

#define CHECK(cond)                                                                \
  do {                                                                             \
    ++g_checks;                                                                    \
    if (!(cond)) {                                                                 \
      ++g_failures;                                                                \
      std::fprintf(stderr, "FAIL %s:%d: %s\n", __FILE__, __LINE__, #cond);         \
    }                                                                              \
  } while (0)

#define CHECK_NEAR(a, b, tol)                                                      \
  do {                                                                             \
    ++g_checks;                                                                    \
    double _ca = (double)(a);                                                      \
    double _cb = (double)(b);                                                      \
    double _d = std::fabs(_ca - _cb);                                              \
    if (_d > (tol)) {                                                              \
      ++g_failures;                                                                \
      std::fprintf(stderr, "FAIL %s:%d: |%.12g - %.12g| = %.3g > %.3g\n",          \
                   __FILE__, __LINE__, _ca, _cb, _d, (double)(tol));               \
    }                                                                              \
  } while (0)

static void test_hyper() {
  using efdr::logChoose;
  CHECK_NEAR(logChoose(0, 0), 0.0, 1e-12);
  CHECK_NEAR(logChoose(5, 2), std::log(10.0), 1e-12);   // C(5,2)=10
  CHECK(std::isinf(logChoose(5, 6)) && logChoose(5, 6) < 0.0);  // k>n -> -inf

  using efdr::hyperUpperTail;
  // P(X>=0) == 1 always (web early-return on commonInSelect==0).
  CHECK_NEAR(hyperUpperTail(0, 5, 10, 5), 1.0, 1e-12);
  // commonInPool==0 or selectSize==0 -> 1.
  CHECK_NEAR(hyperUpperTail(1, 0, 10, 5), 1.0, 1e-12);
  CHECK_NEAR(hyperUpperTail(1, 5, 10, 0), 1.0, 1e-12);
  // N=10, m=5, n=5: P(X>=5) = C(5,5)C(5,0)/C(10,5) = 1/252.
  CHECK_NEAR(hyperUpperTail(5, 5, 10, 5), 1.0 / 252.0, 1e-12);
  // P(X>=1) with N=10,m=5,n=5 = 1 - C(5,0)C(5,5)/C(10,5) = 1 - 1/252.
  CHECK_NEAR(hyperUpperTail(1, 5, 10, 5), 1.0 - 1.0 / 252.0, 1e-12);
  // Impossible overlap (commonInSelect > min(m,n)) -> 0.
  CHECK_NEAR(hyperUpperTail(6, 5, 10, 5), 0.0, 1e-12);
}

static long long total_count(const std::vector<efdr::SimBin>& h) {
  long long s = 0;
  for (const auto& b : h) s += b.count;
  return s;
}

static void test_simulate() {
  using namespace efdr_test;
  const int steps = 1000;

  // Fixture A: single bin (poolIntersect=2, selectIntersect=1), count==steps, RNG-independent.
  auto a = efdr::simulate(A_categoryGenes, A_categoryOffsets, A_nCategories,
                          A_poolIds, A_poolSize, A_selectSize, steps, 42u, A_nGenes);
  CHECK(a.size() == 1);
  if (a.size() == 1) {
    CHECK(a[0].poolIntersect == 2);
    CHECK(a[0].selectIntersect == 1);
    CHECK(a[0].count == steps);
  }

  // Fixture B: histogram count invariant sum == steps * nCategories.
  auto b = efdr::simulate(B_categoryGenes, B_categoryOffsets, B_nCategories,
                          B_poolIds, B_poolSize, B_selectSize, steps, 7u, B_nGenes);
  CHECK(total_count(b) == (long long)steps * B_nCategories);
  // No bin violates the support: selectIntersect <= selectSize and <= poolIntersect.
  for (const auto& bin : b) {
    CHECK(bin.selectIntersect <= B_selectSize);
    CHECK(bin.selectIntersect <= bin.poolIntersect);
  }

  // Zero steps -> empty histogram (guards against poolSize==0 / empty-input UB).
  auto empty = efdr::simulate(B_categoryGenes, B_categoryOffsets, B_nCategories,
                              B_poolIds, B_poolSize, B_selectSize, 0, 7u, B_nGenes);
  CHECK(empty.empty());

  // Determinism: same seed -> identical histogram; different seed may differ but stays valid.
  auto b2 = efdr::simulate(B_categoryGenes, B_categoryOffsets, B_nCategories,
                           B_poolIds, B_poolSize, B_selectSize, steps, 7u, B_nGenes);
  CHECK(b.size() == b2.size());
  bool identical = b.size() == b2.size();
  for (size_t i = 0; identical && i < b.size(); ++i) {
    identical = b[i].poolIntersect == b2[i].poolIntersect &&
                b[i].selectIntersect == b2[i].selectIntersect && b[i].count == b2[i].count;
  }
  CHECK(identical);
}

static void test_efdr_convert() {
  // round15 basic.
  CHECK_NEAR(efdr::round15(1.0 + 1e-16), 1.0, 0.0);

  // rObsRanks: ties take the max rank. p = {0.1, 0.1, 0.2} -> ranks {2,2,3}.
  auto r = efdr::rObsRanks({0.1, 0.1, 0.2});
  CHECK(r.size() == 3 && r[0] == 2 && r[1] == 2 && r[2] == 3);

  // Conversion sanity on Fixture B's simulation: every eFDR in [0,1]; a term with no
  // observed overlap (pObs==1) gets eFDR == 1 (R_exp == steps*nCat at p<=1, R_obs == nTerms).
  using namespace efdr_test;
  const long long steps = 2000;
  auto hist = efdr::simulate(B_categoryGenes, B_categoryOffsets, B_nCategories,
                             B_poolIds, B_poolSize, B_selectSize, (int)steps, 7u, B_nGenes);
  // Two observed terms: term0 fully overlaps select (cs=cp=2), term1 has no overlap (cs=0,cp=3).
  std::vector<int> cs = {2, 0};
  std::vector<int> cp = {2, 3};
  auto e = efdr::efdrFromSimulation(cs, cp, hist, B_poolSize, B_selectSize, steps);
  CHECK(e.size() == 2);
  for (double v : e) CHECK(v >= 0.0 && v <= 1.0);
  CHECK_NEAR(e[1], 1.0, 1e-12);  // pObs=1 term -> eFDR clamps to 1
}

static void test_efdr_convert_edge() {
  // Hand-crafted histogram with two known null-p bins; one term's pObs lands between them.
  // poolSize=10, selectSize=5, steps=100.
  //   bin (poolIntersect=5, selectIntersect=5): null-p = hyperUpperTail(5,5,10,5) = 1/252  (count 10)
  //   bin (poolIntersect=5, selectIntersect=1): null-p = hyperUpperTail(1,5,10,5) = 1-1/252 (count 90)
  // term (commonInSelect=4, commonInPool=5): pObs = hyperUpperTail(4,5,10,5) = 26/252 ≈ 0.10317,
  //   which is between 1/252 and 1-1/252, so R_exp = first bin's cumcount = 10; R_obs = 1.
  //   eFDR = (10/100)/1 = 0.1.
  std::vector<efdr::SimBin> hist = {{5, 5, 10}, {5, 1, 90}};
  auto e = efdr::efdrFromSimulation({4}, {5}, hist, 10, 5, 100);
  CHECK(e.size() == 1);
  CHECK_NEAR(e[0], 0.1, 1e-9);

  // steps==0 -> NaN per term.
  auto z = efdr::efdrFromSimulation({4}, {5}, hist, 10, 5, 0);
  CHECK(z.size() == 1 && std::isnan(z[0]));

  // empty histogram with nonzero steps -> R_exp 0 -> eFDR 0 (documents the no-bins behaviour).
  auto empty = efdr::efdrFromSimulation({4}, {5}, {}, 10, 5, 100);
  CHECK(empty.size() == 1);
  CHECK_NEAR(empty[0], 0.0, 1e-12);
}

struct GmtTerm {
  std::string id;
  std::vector<std::string> genes;  // raw gene fields (no dedupe), as mulea reads them
};

// Parse a GMT: lines of "id<TAB>name<TAB>gene1<TAB>gene2...". Genes are fields[2:].
static std::vector<GmtTerm> parse_gmt(const std::string& path) {
  std::vector<GmtTerm> terms;
  std::ifstream in(path);
  std::string line;
  while (std::getline(in, line)) {
    if (line.empty()) continue;
    std::vector<std::string> fields;
    std::string f;
    std::stringstream ss(line);
    while (std::getline(ss, f, '\t')) fields.push_back(f);
    if (fields.size() < 3) continue;  // need id, name, >=1 gene
    GmtTerm t;
    t.id = fields[0];
    for (size_t i = 2; i < fields.size(); ++i) {
      if (!fields[i].empty()) t.genes.push_back(fields[i]);
    }
    terms.push_back(std::move(t));
  }
  return terms;
}

// Read a newline-delimited gene list (target/background), trimming trailing CR/whitespace.
static std::vector<std::string> read_lines(const std::string& path) {
  std::vector<std::string> out;
  std::ifstream in(path);
  std::string line;
  while (std::getline(in, line)) {
    while (!line.empty() && (line.back() == '\r' || line.back() == ' ' || line.back() == '\t'))
      line.pop_back();
    if (!line.empty()) out.push_back(line);
  }
  return out;
}

// Split a CSV line honoring simple double-quoted fields (no embedded commas expected here).
static std::vector<std::string> split_csv(const std::string& line) {
  std::vector<std::string> out;
  std::string cur;
  bool inq = false;
  for (char c : line) {
    if (c == '"') inq = !inq;
    else if (c == ',' && !inq) { out.push_back(cur); cur.clear(); }
    else cur.push_back(c);
  }
  out.push_back(cur);
  return out;
}

static void test_ecoli_parity(const std::string& root) {
  std::setlocale(LC_NUMERIC, "C");  // fixture floats use '.' decimals; stod must not honour a comma locale
  const std::string ext = root + "/inst/extdata/";
  auto terms = parse_gmt(ext + "Transcription_factor_RegulonDB_Escherichia_coli_GeneSymbol.gmt");
  auto target = read_lines(ext + "target_set.txt");
  auto background = read_lines(ext + "background_set.txt");

  if (terms.empty() || background.empty()) {
    std::fprintf(stderr, "SKIP parity: example data not found under %s\n", ext.c_str());
    ++g_failures;  // treat missing data as a failure so it is never silently skipped
    return;
  }

  // filter_ontology(min=3, max=400): STRICT inequalities -> keep raw gene count in (3, 400).
  std::vector<GmtTerm> filtered;
  for (auto& t : terms) {
    int n = (int)t.genes.size();
    if (n > 3 && n < 400) filtered.push_back(t);
  }

  // pool = background; select = intersect(target, pool); ids over union(term genes, pool).
  std::set<std::string> poolSet(background.begin(), background.end());
  std::set<std::string> targetSet(target.begin(), target.end());
  std::set<std::string> selectSet;
  for (const auto& g : targetSet) if (poolSet.count(g)) selectSet.insert(g);

  std::unordered_map<std::string, int> geneId;
  auto idOf = [&](const std::string& g) -> int {
    auto it = geneId.find(g);
    if (it != geneId.end()) return it->second;
    int id = (int)geneId.size();
    geneId.emplace(g, id);
    return id;
  };
  // assign ids: pool first, then any term-only genes
  for (const auto& g : background) idOf(g);
  for (const auto& t : filtered) for (const auto& g : t.genes) idOf(g);
  const int nGenes = (int)geneId.size();

  // CSR category arrays (raw term genes); assert no intra-term duplicate genes.
  std::vector<int> categoryGenes, categoryOffsets = {0};
  for (const auto& t : filtered) {
    std::set<std::string> uniq(t.genes.begin(), t.genes.end());
    CHECK(uniq.size() == t.genes.size());  // dataset assumption: no duplicate genes in a term
    for (const auto& g : t.genes) categoryGenes.push_back(idOf(g));
    categoryOffsets.push_back((int)categoryGenes.size());
  }
  std::vector<int> poolIds;
  for (const auto& g : background) poolIds.push_back(idOf(g));
  const int poolSize = (int)poolIds.size();
  const int selectSize = (int)selectSet.size();
  const int nCategories = (int)filtered.size();

  // observed overlaps per term (set intersection, like R initialize_result_df)
  std::vector<int> cs(nCategories), cp(nCategories);
  for (int i = 0; i < nCategories; ++i) {
    std::set<std::string> tg(filtered[i].genes.begin(), filtered[i].genes.end());
    int a = 0, b = 0;
    for (const auto& g : tg) { if (poolSet.count(g)) ++b; if (selectSet.count(g)) ++a; }
    cs[i] = a; cp[i] = b;
  }

  // Load the R fixture: ontology_id -> (nr_tested, nr_background, p_value, eFDR)
  std::ifstream fx(root + "/python/tests/fixtures/ora_efdr_reference.csv");
  CHECK(fx.good());
  if (!fx.good()) { return; }  // single actionable failure instead of 154 cascaded ones
  struct Ref { int tested, background; double p, efdr; };
  std::map<std::string, Ref> ref;
  std::string line;
  std::getline(fx, line);  // header
  while (std::getline(fx, line)) {
    if (line.empty()) continue;
    auto c = split_csv(line);
    if (c.size() < 6) continue;
    ref[c[0]] = Ref{std::stoi(c[2]), std::stoi(c[3]), std::stod(c[4]), std::stod(c[5])};
  }
  CHECK(ref.size() == (size_t)nCategories);  // filter must reproduce the fixture's term set

  // (a) DETERMINISTIC check first: counts + observed p-value must match the fixture exactly.
  for (int i = 0; i < nCategories; ++i) {
    auto it = ref.find(filtered[i].id);
    CHECK(it != ref.end());
    if (it == ref.end()) continue;
    if (cs[i] != it->second.tested || cp[i] != it->second.background) {
      ++g_failures;
      std::fprintf(stderr, "FAIL %s:%d: term %s cs=%d/%d cp=%d/%d (got/expected)\n",
                   __FILE__, __LINE__, filtered[i].id.c_str(),
                   cs[i], it->second.tested, cp[i], it->second.background);
    } else {
      g_checks += 2;  // count the two equality checks that passed
    }
    // p-value: log-space hypergeometric; double round-trip error is well below 1e-9 per term
    double pObs = efdr::hyperUpperTail(cs[i], cp[i], poolSize, selectSize);
    CHECK_NEAR(pObs, it->second.p, 1e-9);
  }

  // (b) MC parity: simulate 100k steps, convert, compare eFDR within tolerance.
  const long long steps = 100000;
  auto hist = efdr::simulate(categoryGenes.data(), categoryOffsets.data(), nCategories,
                             poolIds.data(), poolSize, selectSize, (int)steps, 42u, nGenes);
  auto efdr = efdr::efdrFromSimulation(cs, cp, hist, poolSize, selectSize, steps);

  double maxDiff = 0.0;
  for (int i = 0; i < nCategories; ++i) {
    auto it = ref.find(filtered[i].id);
    if (it == ref.end()) continue;
    maxDiff = std::max(maxDiff, std::fabs(efdr[i] - it->second.efdr));
  }
  std::fprintf(stderr, "ecoli parity: %d terms, max |eFDR_cpp - eFDR_R| = %.4f\n", nCategories, maxDiff);
  CHECK(maxDiff <= 0.01);  // MC-to-MC at 100k steps (noise ~0.003); tighten in README if better
}

int main(int argc, char** argv) {
  std::string root = argc > 1 ? argv[1] : ".";
  test_hyper();
  test_simulate();
  test_efdr_convert();
  test_efdr_convert_edge();
  test_ecoli_parity(root);
  std::fprintf(stderr, "%d checks, %d failures\n", g_checks, g_failures);
  return g_failures ? 1 : 0;
}
