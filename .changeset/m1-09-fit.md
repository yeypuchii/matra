---
'matra': minor
---

`fit()` finds the largest size, in steps of 0.25 px, at which text fits a box: each line in the width with no word broken inside, at most `maxLines` lines, and the lines in the height. When nothing fits it gives the `minSize` result with the overflow in pixels and `overflow-x` and `overflow-y` findings. Ink outside the box, such as stacked accents, is an `overflow-y` finding.
