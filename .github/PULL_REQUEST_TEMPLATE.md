## What and why

<!-- One item per pull request. Link the issue: Closes #123 -->

## Checklist

- [ ] There is an issue for this change, and the maintainer replied to it.
- [ ] The tests came first, and `pnpm lint`, `pnpm typecheck` and `pnpm test` pass.
- [ ] The commit message is `<area>: <change>`.
- [ ] There is a changeset (`pnpm changeset`, or `pnpm changeset --empty` when no release is needed).
- [ ] I wrote the code myself, from public specifications and dependency docs. Nothing is copied from other projects.
- [ ] Each new fixture is in `fixtures/SOURCES.md`, with its source and licence. No personal data.
- [ ] Golden files changed only through `pnpm golden:update`, and the commit message says why.
