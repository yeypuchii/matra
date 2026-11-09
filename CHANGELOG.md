# matra

## 0.1.0

### Minor Changes

- 88c74a6: `loadFonts()` loads TTF, OTF, TTC and WOFF2 bytes into a font stack. It gives a clear error for WOFF 1, for bytes that are not a font, and for a TTC index that is not in the collection.
- 0c70de7: `shape()` shapes text with HarfBuzz. Each grapheme goes to the first font in the stack that has all its code points, and neighbor graphemes with the same font form one run. Inside a run, each script is shaped with its own HarfBuzz shaper. Positions are in font units, and clusters are UTF-16 offsets into the input.
- 395b6c2: `check()` reports `missing-glyph` (tofu), `broken-cluster` (a dotted circle that HarfBuzz inserted) and `font-fallback` (a run in a font that is not font 0). Each line of the input is checked as a text of its own. Controls such as newline and tab never count as missing glyphs.
- 75449ba: `segment()` splits text into graphemes, words or sentences with `Intl.Segmenter`, or into orthographic syllables for Devanagari (hi, mr), Bengali (bn) and Tamil (ta). A syllable is one or more whole graphemes; text in other scripts falls back to graphemes.
- 02d8b23: `check()` reports `bad-break` for a newline in the input that falls inside a grapheme or, in Devanagari, Bengali and Tamil, inside a syllable.
- f162e7c: `measure()` gives the width, ascent, descent and ink extents of a line of text in pixels. Ascent and descent are the largest of the fonts that the text uses; ink includes the y offsets of stacked marks. Control characters add no width.
- 389d38e: `wrap()` breaks text into lines that fit a width, at UAX #14 break points that are not inside a grapheme or a Brahmic syllable. Spaces at the end of a line hang. A word wider than the line breaks between syllables, then between graphemes, with the reason `emergency`. Each line has its true width, as if shaped on its own.
- e03d827: `fit()` finds the largest size, in steps of 0.25 px, at which text fits a box: each line in the width with no word broken inside, at most `maxLines` lines, and the lines in the height. When nothing fits it gives the `minSize` result with the overflow in pixels and `overflow-x` and `overflow-y` findings. Ink outside the box, such as stacked accents, is an `overflow-y` finding.
- eb0e058: The `matra check` command checks text from `--text` or from each line of a `--file` against one or more `--font` files. It prints the findings, or JSON with `--json`. Exit code 0: no findings; 1: findings; 2: a usage error, such as a missing option, a file that cannot be read, or a font file that is not a font.
- 69f5c18: The README shows the 0.1.0 API with examples in six scripts (Devanagari, Tamil, Bengali, Latin, Cyrillic and Greek), with the outputs that matra gives.

### Patch Changes

- a9ee9a2: `check()` finds a second broken cluster in a line even when HarfBuzz leaves it without a dotted circle. Before, a Tamil vowel sign with no base that came exactly 15 syllables after another one was not reported.
