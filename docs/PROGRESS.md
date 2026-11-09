# Progress

Where the build of matra stands, and what comes next. The spec is the build brief, a Claude Doc: [matra: build brief](https://claude.ai/artifact/VpUXEs4hG1A9nVCmackrwr). This file follows its work order (section 8), so that a session can start without opening the brief. Open the brief only for detail that is not here, such as the public API (section 5) and how each part works (section 6).

**Update this file in the same commit as each item.**

## Next

**M1 item 8: `wrap`.** From the brief: get break points from linebreak, and remove each one that is inside a grapheme, or inside a syllable in a Brahmic script (done: `src/layout/breaks.ts`). Shape each paragraph one time, and get the width of each segment from the sum of its cluster advances. Put as many segments on each line as fit. If a break point is on a glyph with the `UNSAFE_TO_BREAK` flag, shape that line again to get its true width. A unit that is wider than the line breaks at grapheme boundaries, and that line gets the reason `emergency`.

Then 9 `fit`, 10 CLI, 11 golden files, 12 README. At the end of M1: stop, report, wait for the owner.

## How work is done

From the brief, section 3:

1. Take the next item in the order below.
2. From M2, write a short design note in `docs/decisions/` before the code.
3. Write the tests first, then the code.
4. Run `pnpm lint`, `pnpm typecheck` and `pnpm test`. All must pass.
5. Make one commit for each item (`<area>: <change>`), with a changeset.
6. At the end of each milestone, stop. Report what is done, what is open, and what the owner must do. Give the benchmark change against the M0 baseline. Wait for the owner.

Rules: write all code from public specifications and the docs of the dependencies; copy no code from other projects. Read no files from outside the repo. Test text only from the sources in `fixtures/SOURCES.md`, each recorded there. No secrets. Commit with the owner's git identity. Never publish to npm. Add a runtime dependency only if the brief lists it or the owner approves it.

Stop and ask the owner before you:

- change the public API or a finding code after a release;
- add a dependency or data file with a licence that is not MIT, BSD, ISC, Apache-2.0, OFL or Unicode;
- approve a golden file for a script that only a native reader can check.

Git: work on a branch, push the branch, and open a pull request. Never push to `main`. The owner merges.

## Milestones

| Milestone                 | Status                     | Done when                                                         |
| ------------------------- | -------------------------- | ----------------------------------------------------------------- |
| M0 Setup                  | Done (PR #1)               | CI passes. The owner publishes 0.0.0.                             |
| M1 Core (0.1.0)           | In progress (PR #2, draft) | All tests pass. The owner publishes 0.1.0.                        |
| M2 Adapters (0.2.0)       | Not started                | The round-trip tests and the image tests pass. Owner publishes.   |
| M3 Tier 1 breadth (0.3.0) | Not started                | Golden tests for ar, he, th, zh-Hans, zh-Hant and ja pass.        |
| M4 Print (`matra-print`)  | Not started                | A sample book gives a PDF that a print vendor's file check takes. |
| 1.0                       | Not started                | The owner publishes 1.0.0.                                        |

### M1 Core

| #   | Item                                                  | Status | Commit                           |
| --- | ----------------------------------------------------- | ------ | -------------------------------- |
| 2   | Font loading                                          | Done   | `88c74a6`                        |
| 3   | Font runs and `shape`                                 | Done   | `0c70de7`                        |
| 4   | `missing-glyph`, `broken-cluster` and `font-fallback` | Done   | `395b6c2`                        |
| 5   | `segment`, with syllables for hi, mr, bn and ta       | Done   | `75449ba`, `02d8b23` (bad-break) |
| 6   | Unicode conformance in CI                             | Done   | `1a53d35`                        |
| 7   | `measure`                                             | Done   | `f162e7c`                        |
| 8   | `wrap`                                                | Next   |                                  |
| 9   | `fit`                                                 |        |                                  |
| 10  | CLI                                                   |        |                                  |
| 11  | Golden files for the M1 languages                     |        |                                  |
| 12  | README with examples in six scripts                   |        |                                  |

M1 languages (Tier 1): Latin (en, nl, de, fr, pl, tr, vi), Greek (el), Cyrillic (ru, sr, uk), Devanagari (hi, mr), Bengali (bn), Tamil (ta).

### Later milestones, in short

- **M2 Adapters.** `matra/captions`: SRT, WebVTT and ASS, with cue splits only at legal break points. For ASS, `Fontsize` = em size × (usWinAscent + usWinDescent) / upem, checked against libass through ffmpeg in a test. `matra/svg`: glyph paths from `font.glyphToPath`, for engines that do not shape complex scripts (satori). Visual tests with resvg and pixelmatch; a browser smoke test with Playwright. Dev dependencies: `@resvg/resvg-js`, `pixelmatch`, Playwright.
- **M3 Tier 1 breadth.** Bidi with `bidi-js` (ar, he). Thai word breaks from `Intl.Segmenter`. CJK line-start and line-end rules, CSS `line-break` strict, normal and loose. Hyphenation with `hyphen`, permissive pattern licences only. Case rules: tr and az i, nl IJ, el accents in uppercase, de ß. `locl` checks: sr and ru, bg, mr and hi, zh and ja.
- **M4 Print.** A separate package, `matra-print`: HTML to a book PDF through Paged.js, with bleed, crop marks, and a spine width from the page count and the paper. It runs `check` on all text first. It may use a headless browser. Vivliostyle CLI (AGPL-3.0) only as an external program.
- **1.0.** Freeze the API and the finding codes under semantic versioning. Publish a docs site.

## Decisions in M1

Choices the brief does not spell out. Each is also in its commit message.

- **Runs split by script too** (item 3). Noto Sans covers Devanagari and the Indic Noto fonts cover Latin, so one font often holds two scripts; each script is shaped with its own HarfBuzz shaper. The public `GlyphRun` still joins neighbors with the same font.
- **`check` shapes each line on its own** (item 4), split at mandatory breaks, so a mark at the start of a line is found. Controls (newline, tab) never count as missing glyphs. Neighbor tofu clusters join into one finding. A `broken-cluster` finding spans the HarfBuzz cluster, which can include a space before the mark.
- **`bad-break` in `check`** (after item 5): a newline inside a grapheme or a Brahmic syllable.
- **A syllable is always one or more whole graphemes** (item 5). Tamil க்ஷ is one syllable and two graphemes.
- **Unicode test files are downloaded, not committed** (item 6), by `pnpm fixtures`, like the fonts. LineBreakTest: 2,193 of 19,338 cases differ, listed with reasons in `test/conformance/known-differences.json`. 1,170 are matra's rule (no break inside a grapheme); 1,023 are because linebreak 2.0.0 has the Unicode 13 rules.
- **`measure`** (item 7): ascent and descent are positive; ink is positive above and below the baseline. Controls get no width.
- **Test strings** write invisible characters (ZWJ, ZWNJ, NBSP, marks with no base) as `\u` escapes.

## Open questions for the owner

- Golden files for bn and ta (and hi, mr) need the approval of a native reader (rule above). They come in item 11.
- linebreak 2.0.0 implements UAX #14 for Unicode 13 (1,023 LineBreakTest differences, mostly in Tier 2 scripts). Keep it, or plan a replacement?

## Owner steps (brief, section 1)

Not checked in the brief yet: the trademark search for "matra" in class 9; publish 0.0.0 to reserve the name (npm had no `matra` package on 2026-11-09); the application.
