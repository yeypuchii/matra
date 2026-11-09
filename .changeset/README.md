# Changesets

Each commit that changes the package adds one changeset: a short Markdown file in this folder that says what changed and how the version moves. Make one with `pnpm changeset`. For a change that needs no release (docs, CI, tests only), use `pnpm changeset --empty`.

The maintainer turns the changesets into a version bump and a CHANGELOG entry with `pnpm changeset version`, then publishes. See CONTRIBUTING.md.
