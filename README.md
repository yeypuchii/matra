# matra

matra is an open-source TypeScript library that tells you if a string will show and fit correctly in a given font, box and language, for any script that HarfBuzz shapes, in Node or the browser with no headless browser. It reports missing glyphs, broken clusters, overflow and bad line breaks with rules for each language, and it gives the result to caption files and SVG engines.

A mātrā is the vowel sign that attaches to a letter in Indian scripts. In Sanskrit, the word also means 'measure'.

> **Status: under construction.** Version 0.0.0 only reserves the name. Every function below is a stub that throws until **0.1.0**. The API in this file is the plan for 0.1.0, and it can change before then.

## The problem

A server that makes images, captions or PDFs from multilingual text shows broken text only when a person looks at the output. The faults are missing glyphs (tofu), dotted circles, overflow and wrong line breaks. matra finds them in code first. It returns facts, not pixels. It runs in Node, Bun, Deno and browsers.

## Planned API

```ts
import { check, fit, loadFonts } from 'matra';

const fonts = await loadFonts([notoSans, notoSansDevanagari]); // order = priority

check('नमस्ते दुनिया', { fonts, lang: 'hi' });
// → Finding[]: missing glyphs, broken clusters, font fallback

fit('नमस्ते दुनिया', {
  fonts,
  lang: 'hi',
  box: { width: 320, height: 80 },
  minSize: 12,
  maxSize: 48,
});
// → { size, lines, fits, overflowX, overflowY, findings }
```

| Function                                                                    | What it does                                                                                                   |
| --------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `loadFonts(fonts)`                                                          | Loads TTF, OTF, TTC or WOFF2 bytes. Async, because the HarfBuzz WASM must start. All other functions are sync. |
| `check(text, { fonts, lang })`                                              | Finds text that will not show correctly.                                                                       |
| `shape(text, { fonts, lang, features? })`                                   | Glyph runs from HarfBuzz, one run for each font that the text needs.                                           |
| `segment(text, { lang, unit })`                                             | Graphemes, words, sentences, or orthographic syllables in Brahmic scripts.                                     |
| `measure(text, { fonts, lang, size })`                                      | Advance width, ascent, descent and ink extents.                                                                |
| `wrap(text, { fonts, lang, size, width })`                                  | Lines that fit the width, broken at points that are legal for the language.                                    |
| `fit(text, { fonts, lang, box, minSize, maxSize, maxLines?, lineHeight? })` | The largest size at which the text fits the box.                                                               |

Offsets are UTF-16 indexes into the input string. Sizes are in pixels. `lang` is a BCP 47 tag. matra never fetches fonts or files: you give it the bytes.

A CLI comes with the package:

```sh
matra check --font NotoSansDevanagari-Regular.ttf --font NotoSans-Regular.ttf --lang hi --text 'नमस्ते' --json
```

Exit code 0 means no findings, 1 means findings, and 2 means a usage error.

### Finding codes

| Code                       | Meaning                                                                                                 |
| -------------------------- | ------------------------------------------------------------------------------------------------------- |
| `missing-glyph`            | No font in the stack has a glyph for the text (the font shows .notdef, or "tofu").                      |
| `broken-cluster`           | HarfBuzz inserted a dotted circle (U+25CC), because a mark has no valid base.                           |
| `font-fallback`            | A run uses a font that is not the first font in the stack.                                              |
| `overflow-x`, `overflow-y` | The text does not fit the box. `overflow-y` includes ink outside the line, for example stacked accents. |
| `bad-break`                | A line break in the input (a newline, or a cue edge in captions) is inside a grapheme or a syllable.    |

## Scripts and languages

| Tier              | Scripts and languages                                                                                                | Support                                            |
| ----------------- | -------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| Tier 1 from 0.1.0 | Latin (en, nl, de, fr, pl, tr, vi), Greek (el), Cyrillic (ru, sr, uk), Devanagari (hi, mr), Bengali (bn), Tamil (ta) | All functions, with golden tests for each language |
| Tier 1 from 0.3.0 | Arabic (ar), Hebrew (he), Thai (th), Chinese (zh-Hans, zh-Hant), Japanese (ja)                                       | The same                                           |
| Tier 2            | All other scripts that HarfBuzz shapes                                                                               | `check`, `shape` and `measure` only                |

Brahmic scripts are the depth area. Out of scope: bitmaps, PDFs, translation, transliteration, spell check, font-file QA, and storage of input text.

## Roadmap

| Version       | Adds                                                                                                             |
| ------------- | ---------------------------------------------------------------------------------------------------------------- |
| 0.1.0         | The core: font loading, `shape`, `check`, `segment`, `measure`, `wrap`, `fit`, and the CLI.                      |
| 0.2.0         | `matra/captions` (SRT, WebVTT, ASS) and `matra/svg` (glyph paths for engines that do not shape complex scripts). |
| 0.3.0         | Bidi, Thai, CJK line breaking, hyphenation, language case rules, `locl` checks.                                  |
| `matra-print` | A separate package: HTML to a print-ready book PDF.                                                              |
| 1.0.0         | A frozen API and finding codes under semantic versioning, and a docs site.                                       |

## Contributing

Bug reports about text that matra gets wrong are the most useful help. See [CONTRIBUTING.md](CONTRIBUTING.md).

## Licence

[MIT](LICENSE). The test fonts are under the SIL Open Font License, and they are downloaded, not committed. See [fixtures/SOURCES.md](fixtures/SOURCES.md).
