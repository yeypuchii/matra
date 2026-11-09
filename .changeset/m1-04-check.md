---
'matra': minor
---

`check()` reports `missing-glyph` (tofu), `broken-cluster` (a dotted circle that HarfBuzz inserted) and `font-fallback` (a run in a font that is not font 0). Each line of the input is checked as a text of its own. Controls such as newline and tab never count as missing glyphs.
