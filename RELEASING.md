# Releasing Engineering Playbook Web

This project uses an explicit, lightweight release process aligned with
trunk-based development. Releases are prepared deliberately; version bumping
and changelog generation are not automated.

## Source of Truth

The `version` field in `package.json` is the single source of truth for a
release version. The same version must be represented by:

- the release section in `CHANGELOG.md`;
- the Git tag prefixed with `v`, for example `v0.1.0`;
- the versioned Docker image tag, for example `v0.1.0`;
- a future GitHub Release created from that Git tag.

Do not create a release tag that does not match the version already committed
to `package.json`. The GitHub Actions workflow validates this rule before
publishing a versioned image.

## Development Flow

The repository follows trunk-based development:

1. Implement changes on a short-lived branch.
2. Open a pull request targeting `main`.
3. Let GitHub Actions build the Docker image for validation.
4. Merge accepted changes into `main`.

A pull request never publishes an image. A successful push to `main` publishes
A successful push to main publishes the current trunk state with:

```text
carlosmoraesrodrigues/engineering-playbook-web:latest
carlosmoraesrodrigues/engineering-playbook-web:sha-<commit-sha>
```

`latest` identifies the current integrated state. The `sha-*` tag is immutable
and allows a container image to be traced back to an exact commit.

## Preparing a Release

When the integrated application is ready for a versioned release:

1. Choose the next semantic version.
2. Update `version` in `package.json`.
3. Move relevant notes from `[Unreleased]` into a versioned section in
   `CHANGELOG.md`, including the release date.
4. Submit and merge those changes to `main`.
5. Create a Git tag matching the committed package version.
6. Push the Git tag to GitHub.

### Updating the Package Version

Use either Yarn or npm to update `package.json` without creating a Git tag
during release preparation. The tag is intentionally created only after the
version and changelog changes have been reviewed and merged to `main`.

With Yarn:

```bash
yarn version --patch --no-git-tag-version
yarn version --minor --no-git-tag-version
yarn version --major --no-git-tag-version
```

With npm:

```bash
npm version patch --no-git-tag-version
npm version minor --no-git-tag-version
npm version major --no-git-tag-version
```

Use the command matching the release impact:

| Increment | When to use                                                     | Example            |
| --------- | --------------------------------------------------------------- | ------------------ |
| `patch`   | Backward-compatible fix                                         | `0.1.0` to `0.1.1` |
| `minor`   | Backward-compatible capability or meaningful delivery increment | `0.1.0` to `0.2.0` |
| `major`   | Breaking public contract or intentionally incompatible change   | `0.1.0` to `1.0.0` |

For a deliberate exact version, use:

```bash
yarn version --new-version 0.1.0 --no-git-tag-version
# or
npm version 0.1.0 --no-git-tag-version
```

Run one package-manager command only; do not run both alternatives for the
same release.

Example for version `0.1.0`:

```bash
git switch main
git pull --ff-only origin main
git tag -a v0.1.0 -m "Release v0.1.0"
git push origin v0.1.0
```

Before creating the tag, verify the committed version:

```bash
node --print "require('./package.json').version"
```

The expected output for tag `v0.1.0` is `0.1.0`.

## Docker Publication

The workflow in `.github/workflows/docker-image.yml` handles container builds
and publication.

| GitHub event                              | Docker behavior                    | Published tags               |
| ----------------------------------------- | ---------------------------------- | ---------------------------- |
| Pull request targeting `main`             | Build validation only              | None                         |
| Push to `main`                            | Build and publish integrated state | `latest`, `sha-<commit-sha>` |
| Push of matching tag `v<package-version>` | Build and publish release          | `v<package-version>`         |

For example, pushing `v0.1.0` while `package.json` declares `0.1.0` publishes:

```text
carlosmoraesrodrigues/engineering-playbook-web:v0.1.0
```

If the pushed Git tag and `package.json` version differ, the workflow fails
before publishing the versioned image.

## Image Metadata

Published images include OCI labels generated during the GitHub Actions build:

- `org.opencontainers.image.title`;
- `org.opencontainers.image.description`;
- `org.opencontainers.image.source`;
- `org.opencontainers.image.version`.

The version label is derived from `package.json`, keeping the artifact metadata
consistent with the release record.

## Required Repository Secrets

Docker Hub publishing requires these GitHub Actions repository secrets:

- `DOCKERHUB_USERNAME`;
- `DOCKERHUB_TOKEN`.

These credentials are used only by the publication workflow. They are not
required by the static SPA runtime.

## Future GitHub Releases

When GitHub Releases are introduced, each release should use the already
published matching Git tag and the associated `CHANGELOG.md` section. This
preserves one explicit release identity across source control, documentation,
container artifacts and release notes.
