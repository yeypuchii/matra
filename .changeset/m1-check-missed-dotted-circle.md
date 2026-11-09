---
'matra': patch
---

`check()` finds a second broken cluster in a line even when HarfBuzz leaves it without a dotted circle. Before, a Tamil vowel sign with no base that came exactly 15 syllables after another one was not reported.
