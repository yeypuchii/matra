# Progress

Where the build of matra stands, and what comes next. The spec is the build brief, a Claude Doc: [matra: build brief](https://claude.ai/artifact/VpUXEs4hG1A9nVCmackrwr). This file follows its work order (section 8), so that a session can start without opening the brief. Open the brief only for detail that is not here, such as the public API (section 5) and how each part works (section 6).

**Update this file in the same commit as each item.**

## Next

**M1 is done. Waiting for the owner** (brief, section 3: stop at the end of each milestone):

1. Review and merge PR #2 (the owner approved the hi, mr, bn and ta golden files and kept linebreak on 2026-11-09).
2. Publish 0.1.0 (`pnpm changeset version`, review, `pnpm release`).

Then **M2 item 1: `matra/captions`** (SRT, WebVTT, ASS), with a design note in `docs/decisions/` before the code (required from M2 on).

M1 benchmark (`pnpm bench`, 2026-11-09, node v24.22.1, AMD EPYC 7B12; 1,030-character Hindi paragraph, 16 px, width 400 px): HarfBuzz shaping 934 µs (the reference), `check` 2,933 µs (3.1 × shaping), `wrap` 1,906 µs (2.0 ×), `fit` 3,818 µs (4.1 ×). The M0 baseline has only the reference, on another CPU (Intel Xeon, 1,601 µs), so the × shape column is the one to compare. The baseline file is not changed.

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

| Milestone                 | Status                              | Done when                                                         |
| ------------------------- | ----------------------------------- | ----------------------------------------------------------------- |
| M0 Setup                  | Done (PR #1)                        | CI passes. The owner publishes 0.0.0.                             |
| M1 Core (0.1.0)           | Done, waiting for the owner (PR #2) | All tests pass. The owner publishes 0.1.0.                        |
| M2 Adapters (0.2.0)       | Not started                         | The round-trip tests and the image tests pass. Owner publishes.   |
| M3 Tier 1 breadth (0.3.0) | Not started                         | Golden tests for ar, he, th, zh-Hans, zh-Hant and ja pass.        |
| M4 Print (`matra-print`)  | Not started                         | A sample book gives a PDF that a print vendor's file check takes. |
| 1.0                       | Not started                         | The owner publishes 1.0.0.                                        |

### M1 Core

| #   | Item                                                  | Status | Commit                           |
| --- | ----------------------------------------------------- | ------ | -------------------------------- |
| 2   | Font loading                                          | Done   | `88c74a6`                        |
| 3   | Font runs and `shape`                                 | Done   | `0c70de7`                        |
| 4   | `missing-glyph`, `broken-cluster` and `font-fallback` | Done   | `395b6c2`, `a9ee9a2` (fix)       |
| 5   | `segment`, with syllables for hi, mr, bn and ta       | Done   | `75449ba`, `02d8b23` (bad-break) |
| 6   | Unicode conformance in CI                             | Done   | `1a53d35`                        |
| 7   | `measure`                                             | Done   | `f162e7c`                        |
| 8   | `wrap`                                                | Done   | `389d38e`                        |
| 9   | `fit`                                                 | Done   | `e03d827`                        |
| 10  | CLI                                                   | Done   | `eb0e058`                        |
| 11  | Golden files for the M1 languages                     | Done   | `580a36a`                        |
| 12  | README with examples in six scripts                   | Done   | the last M1 commit               |

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
- **`wrap`** (item 8): spaces and controls at the end of a line hang (not in its width; no-break spaces do not hang). A word wider than the line breaks between syllables first, then between graphemes. A line is shaped again when it starts or ends where HarfBuzz marks a break unsafe, inside a cluster (a ligature), at the edge between two shaping items, or at a mark (alone, it gets a dotted circle). A fast-check property checks that each line has the width it has when shaped on its own. Layout runs at size 1 (em) and scales, so one shaping serves every size in `fit`.
- **`fit`** (item 9): a size fits only when no word must break inside (no `emergency` line). The search tries `maxSize` first, then a binary search over `minSize` + k × 0.25. Ink is not part of the search: lines stack from the top of the box with the CSS half-leading model, and ink above the top or below the bottom gives an `overflow-y` finding and counts in `overflowY`, even when `fits` is true (Vietnamese Ở in Noto Sans at lineHeight 1.2 pokes 0.011 em above). `overflowY` is the height the lines need beyond the box, or the height of the lines beyond `maxLines`. `findings` include the `check` findings.
- **Golden files** (item 11): two extracts and one to three hand-written edge cases for each language, in `fixtures/text/golden-<lang>.txt`. Each case holds the findings (without messages, so a reworded message does not change a golden file), the lines at 80, 160 and 320 px at 16 px, and a fit into 240 × 96 px from 8 to 48 px. Numbers have three decimals. Most fits that fill the height give an ink `overflow-y`: descenders of the last line, or tall Devanagari signs on the first, go past the box at lineHeight 1.2. The smoke test runs the first two cases of each language on Node, Bun and Deno. Building the Tamil file found a HarfBuzz quirk, fixed in `a9ee9a2`: in a line with two broken clusters, HarfBuzz may put a dotted circle on the first only.
- **Test strings** write invisible characters (ZWJ, ZWNJ, NBSP, marks with no base) as `\u` escapes.

## Open questions for the owner

None open. Answered by the owner on 2026-11-09:

- The golden files for hi, mr, bn and ta are approved.
- linebreak stays. Its Unicode 13 differences are listed in `test/conformance/known-differences.json`; rerun `pnpm conformance:update` when linebreak or the runtime Unicode version changes.

## Owner steps (brief, section 1)

Not checked in the brief yet: the trademark search for "matra" in class 9; publish 0.0.0 to reserve the name (npm had no `matra` package on 2026-11-09); the application.
