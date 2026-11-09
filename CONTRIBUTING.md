# Contributing to matra

Thank you for your interest. matra is young: the maintainer builds the core milestone by milestone until 1.0, so the most useful help now is a **report of text that matra gets wrong**, or that a renderer gets wrong and matra should catch. Open an issue with the "Wrong result" form.

For a pull request, open an issue first and wait for a reply. A pull request without an issue can be closed.

## Set up

You need Node 22.18 or later (Node 24 is recommended), and pnpm through Corepack.

```sh
corepack enable
pnpm install
pnpm fixtures   # downloads the test fonts (about 20 MB) and checks their SHA-256
pnpm test
```

| Command                   | What it does                                                                                                  |
| ------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `pnpm lint`               | Biome lint and format check. `pnpm lint:fix` fixes what it can.                                               |
| `pnpm typecheck`          | TypeScript, strict.                                                                                           |
| `pnpm test`               | The Vitest suite. `pnpm test:watch` reruns it on each change.                                                 |
| `pnpm build`              | Builds `dist/` with tsdown.                                                                                   |
| `pnpm smoke`              | Runs the built package. Also run `bun test/smoke/smoke.mjs` and `deno run --allow-read test/smoke/smoke.mjs`. |
| `pnpm bench`              | Times `check`, `wrap` and `fit` on a 1,000-character paragraph, and compares with `test/bench/baseline.json`. |
| `pnpm fixtures`           | Downloads the fonts in `fixtures/fonts.json` and the Unicode test files in `test/conformance/files.json`.     |
| `pnpm golden:update`      | Rewrites `test/golden/<lang>.json` from `fixtures/text/golden-<lang>.txt`. Say why in the commit message.     |
| `pnpm conformance:update` | Rewrites the lists in `test/conformance/known-differences.json` and keeps the reasons.                        |
| `pnpm changeset`          | Adds a changeset.                                                                                             |

## How work is done

1. Take one item. From the M2 milestone on, write a short design note in [`docs/decisions/`](docs/decisions/) before the code.
2. Write the tests first, then the code.
3. Run `pnpm lint`, `pnpm typecheck` and `pnpm test`. All must pass.
4. Make one commit for each item. The message is `<area>: <change>`, for example `wrap: keep Tamil syllables on one line`. The area is a folder in `src/` (`font`, `shape`, `segment`, `check`, `layout`, `cli`), or `repo`, `ci`, `docs`, `test` or `fixtures`.
5. Add a changeset to the commit with `pnpm changeset`. A change that needs no release (docs, CI, tests only) gets an empty one: `pnpm changeset --empty`. CI fails a pull request with no changeset.

### Rules

- **Write all code yourself**, from public specifications (Unicode, OpenType, CSS) and from the docs of the dependencies. Do not copy code from other projects, even with a compatible licence.
- **Test text comes only from the sources in [`fixtures/SOURCES.md`](fixtures/SOURCES.md).** Record the source and the licence of each new fixture there, in the same commit. Use no personal data. Invented names are fine.
- **Do not commit font files.** Add the URL (pinned to a commit) and the SHA-256 to `fixtures/fonts.json`.
- **Put no secrets** in code, config, logs or commits.
- **Dependencies.** A new runtime dependency needs the maintainer's approval first. Each dependency and each data file must have one of these licences: MIT, BSD, ISC, Apache-2.0, OFL, or the Unicode licence.
- **HarfBuzz is pinned to an exact version** (`harfbuzzjs` 1.6.4), because the golden results depend on it. An upgrade is its own commit, with the golden changes it causes.
- **The library runs in browsers.** Code in `src/` may not use Node APIs. Only `src/cli/` may. Biome enforces this.
- **Golden files** (from 0.1.0) change only with `pnpm golden:update`, and the commit message says why. A golden file for a script that only a native reader can check needs the maintainer's approval.
- **Fault tests.** Each bug becomes one test, with the shortest string that shows the bug.

## Layout

```text
src/
  index.ts          public API
  font/             bytes, WOFF2, HarfBuzz face and font, font runs
  shape/
  segment/          graphemes, words, sentences, syllables
  check/            findings
  layout/           measure, wrap, fit
  captions/         from 0.2.0
  svg/              from 0.2.0
  cli/
test/
  conformance/      Unicode test files and known-differences.json (from 0.1.0)
  golden/           <lang>.json (from 0.1.0)
  property/         fast-check tests (from 0.1.0)
  smoke/            the Bun and Deno smoke script
  bench/            the benchmark and its baseline
fixtures/
  fonts.json        URL and SHA-256 of each font
  text/
  SOURCES.md
scripts/fetch-fixtures.ts
docs/decisions/
```

## Releases

Only the maintainer releases. The steps: `pnpm changeset version`, review and commit the version bump and the CHANGELOG, then `pnpm release`. That builds the package and publishes it to npm.

## Conduct

Everyone who takes part follows the [Code of Conduct](CODE_OF_CONDUCT.md). To report a security problem, see [SECURITY.md](SECURITY.md). Do not open a public issue for it.
