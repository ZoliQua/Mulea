#ifndef MULEA_EXAMPLE_DATA_H
#define MULEA_EXAMPLE_DATA_H

namespace efdr_test {

// Fixture A (hand-checkable): pool={0,1}, one category {0,1}, selectSize=1.
// Any single-gene sample intersects the category in exactly 1 element, regardless of RNG.
inline const int A_categoryGenes[] = {0, 1};
inline const int A_categoryOffsets[] = {0, 2};
inline const int A_nCategories = 1;
inline const int A_poolIds[] = {0, 1};
inline const int A_poolSize = 2;
inline const int A_selectSize = 1;
inline const int A_nGenes = 2;

// Fixture B (invariant/determinism): pool={0..4}, cats {0,1,2} and {2,3,4}, selectSize=2.
inline const int B_categoryGenes[] = {0, 1, 2, 2, 3, 4};
inline const int B_categoryOffsets[] = {0, 3, 6};
inline const int B_nCategories = 2;
inline const int B_poolIds[] = {0, 1, 2, 3, 4};
inline const int B_poolSize = 5;
inline const int B_selectSize = 2;
inline const int B_nGenes = 5;

}  // namespace efdr_test

#endif
