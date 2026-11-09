---
'matra': minor
---

`shape()` shapes text with HarfBuzz. Each grapheme goes to the first font in the stack that has all its code points, and neighbor graphemes with the same font form one run. Inside a run, each script is shaped with its own HarfBuzz shaper. Positions are in font units, and clusters are UTF-16 offsets into the input.
