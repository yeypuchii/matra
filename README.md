# matra

matra is an open-source TypeScript library that tells you if a string will show and fit correctly in a given font, box and language, for any script that HarfBuzz shapes, in Node or the browser with no headless browser. It reports missing glyphs, broken clusters, overflow and bad line breaks with rules for each language, and it gives the result to caption files and SVG engines.

A mātrā is the vowel sign that attaches to a letter in Indian scripts. In Sanskrit, the word also means 'measure'.

> **Status: 0.1.0, the core.** Latin, Greek, Cyrillic, Devanagari, Bengali and Tamil are Tier 1. Caption files and SVG come in 0.2.0. The API can still change before 1.0.

## The problem

A server that makes images, captions or PDFs from multilingual text shows broken text only when a person looks at the output. The faults are missing glyphs (tofu), dotted circles, overflow and wrong line breaks. matra finds them in code first. It returns facts, not pixels. It runs in Node, Bun, Deno and browsers.

## Install

```sh
npm install @yeypuchi/matra
```

The package is scoped because npm keeps the plain name `matra` back (it is too close to other package names). The command it installs is `matra`.

matra never fetches fonts or files: you give it the bytes. In Node, read them from disk; in a browser, fetch them.

```ts
import { readFile } from 'node:fs/promises';
import { check, fit, loadFonts, measure, segment, shape, wrap } from '@yeypuchi/matra';

// The order is the priority: each grapheme uses the first font that has all of it.
const fonts = await loadFonts([
  await readFile('NotoSansDevanagari-Regular.ttf'),
  await readFile('NotoSans-Regular.ttf'),
]);
```

`loadFonts` takes TTF, OTF, TTC (as `{ data, index }`) and WOFF2. It is async, because the HarfBuzz WASM must start. All other functions are sync.

## Examples in six scripts

The fonts are the Noto fonts in [fixtures/fonts.json](fixtures/fonts.json). The outputs are what matra 0.1.0 gives.

### Devanagari: a vowel sign with no base

```ts
check('नमस्ते दुनिया', { fonts, lang: 'hi' });
// → []

check('नमस्ते ि दुनिया', { fonts, lang: 'hi' });
// → [{ code: 'broken-cluster', start: 6, end: 8, font: 0,
//      message: '" ि" (U+0020, U+093F) has no valid base, so it shows with a dotted circle (◌).' }]
```

### Tamil: syllables, and a font that has no Tamil

A Tamil conjunct such as க்க is one orthographic syllable but two graphemes, so matra never breaks a line inside it when the syllable fits.

```ts
segment('வணக்கம்', { lang: 'ta', unit: 'grapheme' }); // வ | ண | க் | க | ம்
segment('வணக்கம்', { lang: 'ta', unit: 'syllable' }); // வ | ண | க்க | ம்

const latinOnly = await loadFonts([await readFile('NotoSans-Regular.ttf')]);
check('வணக்கம் உலகம்', { fonts: latinOnly, lang: 'ta' });
// → [{ code: 'missing-glyph', start: 0, end: 7, font: 0, message: 'No font in the stack has glyphs
//      for all of "வணக்கம்". Missing in font 0: U+0BB5, U+0BA3, U+0B95, U+0BCD, U+0BAE.' },
//    { code: 'missing-glyph', start: 8, end: 13, ... }]
```

### Bengali: font fallback

```ts
const stack = await loadFonts([notoSans, notoSansBengali]);
check('Hello বাংলা', { fonts: stack, lang: 'bn' });
// → [{ code: 'font-fallback', start: 6, end: 11, font: 1,
//      message: '"বাংলা" uses font 1, not font 0.' }]
```

### Latin (Vietnamese): stacked accents above the box

```ts
fit('Ở Việt Nam', {
  fonts: notoSans,
  lang: 'vi',
  box: { width: 200, height: 60 },
  minSize: 10,
  maxSize: 40,
});
// → { size: 37.25, fits: true, overflowX: 0, overflowY: 0.41,
//     lines: [{ start: 0, end: 10, width: 199.03, reason: 'mandatory' }],
//     findings: [{ code: 'overflow-y', start: 0, end: 10, message: 'Ink goes 0.41 px above the top
//       of the box at 37.25 px (for example stacked accents). A larger lineHeight gives it room.' }] }
```

`fits` is about the lines: each fits the width with no word broken inside, there are no more than `maxLines`, and they fit the height at `lineHeight` (default 1.2). Ink outside the box is a finding of its own.

### Cyrillic (Russian, Serbian): lines, and the language in shaping

```ts
wrap('Съешь же ещё этих мягких французских булок', {
  fonts: notoSans,
  lang: 'ru',
  size: 16,
  width: 120,
});
// → 4 lines: "Съешь же ещё " (112.99 px), "этих мягких " (92.59 px),
//   "французских " (100.48 px), "булок" (43.81 px, reason 'mandatory')

// lang goes to HarfBuzz: Noto Sans has a Serbian б.
shape('б', { fonts: notoSans, lang: 'ru' })[0].glyphs[0].id; // 457
shape('б', { fonts: notoSans, lang: 'sr' })[0].glyphs[0].id; // 2092
```

Spaces at the end of a line hang: they are not in its width.

### Greek: measure

```ts
measure('Ἀθῆναι', { fonts: notoSans, lang: 'el', size: 32 });
// → { width: 107.26, ascent: 34.21, descent: 9.38, inkTop: 24.48, inkBottom: 7.68 }
```

`ascent` and `descent` come from the font; `inkTop` and `inkBottom` from the glyphs, with the offsets of their marks. All are positive above and below the baseline.

## API

| Function                                                                    | What it does                                                                                                                                               |
| --------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `loadFonts(fonts)`                                                          | Loads TTF, OTF, TTC or WOFF2 bytes into a font stack. The order is the priority.                                                                           |
| `check(text, { fonts, lang })`                                              | Finds text that will not show correctly: missing glyphs, broken clusters, font fallback, and line breaks inside a grapheme or syllable.                    |
| `shape(text, { fonts, lang, features? })`                                   | Glyph runs from HarfBuzz, one run for each stretch of text in one font. Positions in font units.                                                           |
| `segment(text, { lang, unit })`                                             | Graphemes, words or sentences (`Intl.Segmenter`), or orthographic syllables in Devanagari, Bengali and Tamil.                                              |
| `measure(text, { fonts, lang, size })`                                      | Advance width, ascent, descent and ink extents of one line.                                                                                                |
| `wrap(text, { fonts, lang, size, width })`                                  | Lines that fit the width, broken at UAX #14 break points that are not inside a grapheme or a syllable. A word wider than the line gets `emergency` breaks. |
| `fit(text, { fonts, lang, box, minSize, maxSize, maxLines?, lineHeight? })` | The largest size, in steps of 0.25 px, at which the text fits the box; or the `minSize` result with the overflow.                                          |

Offsets are UTF-16 indexes into the input string. Sizes are in pixels. `lang` is a BCP 47 tag; it goes to HarfBuzz and to `Intl.Segmenter`.

### Finding codes

| Code                       | Meaning                                                                                                |
| -------------------------- | ------------------------------------------------------------------------------------------------------ |
| `missing-glyph`            | No font in the stack has a glyph for the text (the font shows .notdef, or "tofu").                     |
| `broken-cluster`           | HarfBuzz inserted a dotted circle (U+25CC), because a mark has no valid base.                          |
| `font-fallback`            | A run uses a font that is not the first font in the stack.                                             |
| `overflow-x`, `overflow-y` | The text does not fit the box. `overflow-y` includes ink outside the box, for example stacked accents. |
| `bad-break`                | A line break in the input (a newline, or a cue edge in captions) is inside a grapheme or a syllable.   |

## CLI

```sh
matra check --font NotoSans-Regular.ttf --font NotoSansBengali-Regular.ttf --lang bn --text 'Hello বাংলা தமிழ் ि'
```

```text
"Hello বাংলা தமிழ் ि"
  font-fallback 6–11 (font 1): "বাংলা" uses font 1, not font 0.
  missing-glyph 12–17 (font 0): No font in the stack has glyphs for all of "தமிழ்". Missing in font 0: U+0BA4, U+0BAE, U+0BBF, U+0BB4, U+0BCD.
  broken-cluster 17–19 (font 0): " ि" (U+0020, U+093F) has no valid base, so it shows with a dotted circle (◌).

3 findings in 1 of 1 string.
```

`--file <path>` checks each line of a file; `--json` prints JSON. Exit code 0 means no findings, 1 means findings, and 2 means a usage error.

## Scripts and languages

| Tier              | Scripts and languages                                                                                                | Support                                            |
| ----------------- | -------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| Tier 1 from 0.1.0 | Latin (en, nl, de, fr, pl, tr, vi), Greek (el), Cyrillic (ru, sr, uk), Devanagari (hi, mr), Bengali (bn), Tamil (ta) | All functions, with golden tests for each language |
| Tier 1 from 0.3.0 | Arabic (ar), Hebrew (he), Thai (th), Chinese (zh-Hans, zh-Hant), Japanese (ja)                                       | The same                                           |
| Tier 2            | All other scripts that HarfBuzz shapes                                                                               | `check`, `shape` and `measure` only                |

Brahmic scripts are the depth area. Out of scope: bitmaps, PDFs, translation, transliteration, spell check, font-file QA, and storage of input text.

Line breaking uses [linebreak](https://github.com/devongovett/linebreaker), which implements UAX #14 for Unicode 13. The differences from the Unicode 17 test file are listed, with reasons, in [test/conformance/known-differences.json](test/conformance/known-differences.json).

## Roadmap

| Version       | Adds                                                                                                                                 |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| 0.1.0         | The core: font loading, `shape`, `check`, `segment`, `measure`, `wrap`, `fit`, and the CLI.                                          |
| 0.2.0         | `@yeypuchi/matra/captions` (SRT, WebVTT, ASS) and `@yeypuchi/matra/svg` (glyph paths for engines that do not shape complex scripts). |
| 0.3.0         | Bidi, Thai, CJK line breaking, hyphenation, language case rules, `locl` checks.                                                      |
| `matra-print` | A separate package: HTML to a print-ready book PDF.                                                                                  |
| 1.0.0         | A frozen API and finding codes under semantic versioning, and a docs site.                                                           |

## Contributing

Bug reports about text that matra gets wrong are the most useful help. See [CONTRIBUTING.md](CONTRIBUTING.md).

## Licence

[MIT](LICENSE). The test fonts are under the SIL Open Font License, and they are downloaded, not committed. See [fixtures/SOURCES.md](fixtures/SOURCES.md).
