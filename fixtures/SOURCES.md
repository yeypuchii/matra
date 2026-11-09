# Fixture sources and licences

Every fixture file is listed here, with its source and licence. Add the entry in the same commit as the file. `test/fixtures.test.ts` fails when a file has no entry.

Allowed sources for test text:

- [UDHR in Unicode](https://www.unicode.org/udhr/), for Tier 2 smoke tests only. Read its terms first.
- Short extracts from Project Gutenberg. Remove the Project Gutenberg name and header.
- Wikisource transcriptions of authors who died more than 70 years ago.
- Hand-written edge cases.

Use no personal data. Invented names are fine.

## Fonts

`pnpm fixtures` downloads the fonts into `fixtures/fonts/` and checks the SHA-256 of each file. The URLs and hashes are in `fonts.json`. Each URL names a commit, so the bytes cannot change. Font files are not committed.

| File                             | Family               | Source                                                                                         | Licence |
| -------------------------------- | -------------------- | ---------------------------------------------------------------------------------------------- | ------- |
| `NotoSans-Regular.ttf`           | Noto Sans            | [notofonts/notofonts.github.io](https://github.com/notofonts/notofonts.github.io) at `4cf7835` | OFL-1.1 |
| `NotoSansDevanagari-Regular.ttf` | Noto Sans Devanagari | notofonts/notofonts.github.io at `4cf7835`                                                     | OFL-1.1 |
| `NotoSansBengali-Regular.ttf`    | Noto Sans Bengali    | notofonts/notofonts.github.io at `4cf7835`                                                     | OFL-1.1 |
| `NotoSansTamil-Regular.ttf`      | Noto Sans Tamil      | notofonts/notofonts.github.io at `4cf7835`                                                     | OFL-1.1 |
| `NotoSansArabic-Regular.ttf`     | Noto Sans Arabic     | notofonts/notofonts.github.io at `4cf7835`                                                     | OFL-1.1 |
| `NotoSansHebrew-Regular.ttf`     | Noto Sans Hebrew     | notofonts/notofonts.github.io at `4cf7835`                                                     | OFL-1.1 |
| `NotoSansThai-Regular.ttf`       | Noto Sans Thai       | notofonts/notofonts.github.io at `4cf7835`                                                     | OFL-1.1 |
| `NotoSansSC-Regular.otf`         | Noto Sans SC         | [notofonts/noto-cjk](https://github.com/notofonts/noto-cjk) at `f8d1575`, SubsetOTF            | OFL-1.1 |
| `NotoSansTC-Regular.otf`         | Noto Sans TC         | notofonts/noto-cjk at `f8d1575`, SubsetOTF                                                     | OFL-1.1 |
| `NotoSansJP-Regular.otf`         | Noto Sans JP         | notofonts/noto-cjk at `f8d1575`, SubsetOTF                                                     | OFL-1.1 |

## Unicode test files

`pnpm fixtures` also downloads the Unicode break tests into `test/conformance/data/<version>/` and checks their SHA-256. The URLs and hashes are in `test/conformance/files.json`. They are not committed.

| File                    | Source                                                                                               | Licence                                                                 |
| ----------------------- | ---------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `GraphemeBreakTest.txt` | [Unicode Character Database 17.0.0](https://www.unicode.org/Public/17.0.0/ucd/auxiliary/), auxiliary | [Unicode License v3](https://www.unicode.org/license.txt) (Unicode-3.0) |
| `WordBreakTest.txt`     | the same                                                                                             | Unicode-3.0                                                             |
| `LineBreakTest.txt`     | the same                                                                                             | Unicode-3.0                                                             |

## Text

| File                | Content                                                                                                                  | Source                                                                                                                                                                                | Licence                                |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| `text/bench-hi.txt` | Benchmark paragraph, Hindi, 1,030 UTF-16 code units. One paragraph, cut at the sentence end nearest to 1,000 characters. | Premchand, "शतरंज के खिलाड़ी" (1924), from the collection प्रेम-द्वादशी. [Hindi Wikisource, revision 491096](https://hi.wikisource.org/w/index.php?oldid=491096), paragraph 77 of the page. | Public domain. Premchand died in 1936. |
