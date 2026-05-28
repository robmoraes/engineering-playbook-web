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

`content-source.json` is the source of truth for the documentation edition
embedded in the static application. Release candidates MUST configure an
immutable `engineering-playbook` tag or full commit SHA rather than a moving
branch.

## Development Flow

The repository follows trunk-based development:

1. Implement changes on a short-lived branch.
2. Open a pull request targeting `main`.
3. Let GitHub Actions build the Docker image for validation.
4. Merge accepted changes into `main`.

A pull request never publishes an image. A successful push to `main` builds
and publishes the current trunk candidate once with:

```text
robmoraes/engineering-playbook-web:latest
robmoraes/engineering-playbook-web:sha-<commit-sha>
```

`latest` identifies the current integrated state. The `sha-*` tag is immutable
and allows a container image to be traced back to an exact web commit and
pinned documentation source.

## Preparing a Release

When the integrated application is ready for a versioned release:

1. Choose the next semantic version.
2. Update `version` in `package.json`.
3. Update `content-source.json` to the immutable documentation edition to
   publish, when the content snapshot changes.
4. Move relevant notes from `[Unreleased]` into a versioned section in
   `CHANGELOG.md`, including the release date.
5. Submit and merge those changes to `main`; the workflow publishes the
   SHA-identified candidate digest.
6. Record that candidate digest and verify the expected content ref.
7. Create a Git tag matching the committed package version from the same
   merged commit.
8. Push the Git tag to GitHub; the workflow promotes the existing candidate
   digest under the version tag.

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

| GitHub event                              | Docker behavior                       | Published tags               |
| ----------------------------------------- | ------------------------------------- | ---------------------------- |
| Pull request targeting `main`             | Build validation only                 | None                         |
| Push to `main`                            | Build/publish release candidate once  | `latest`, `sha-<commit-sha>` |
| Push of matching tag `v<package-version>` | Promote existing SHA candidate digest | `v<package-version>`         |

For example, pushing `v0.1.0` while `package.json` declares `0.1.0` publishes:

```text
robmoraes/engineering-playbook-web:v0.1.0
```

If the pushed Git tag and `package.json` version differ, or if its
`sha-<commit-sha>` candidate cannot be found, the workflow fails without
building a replacement image. The resulting version tag must resolve to the
same digest as that candidate.

## Release Evidence

Record the artifact identity after a version promotion:

```text
web version:         v0.2.0
web source commit:   <full commit SHA>
content repository:  robmoraes/engineering-playbook
content source ref:  <immutable tag or full commit SHA>
candidate tag:       sha-<web source SHA>
image digest:        sha256:<digest>
release tag:         v0.2.0 -> sha256:<same digest>
workflow run:        <GitHub Actions run URL>
```

The workflow job summary supplies the candidate and promoted digest data. The
release record preserves the complete relationship between web source,
documentation source and public container artifact.

## Image Metadata

Published images include OCI labels generated during the GitHub Actions build:

- `org.opencontainers.image.title`;
- `org.opencontainers.image.description`;
- `org.opencontainers.image.source`;
- `org.opencontainers.image.version`.
- `dev.robmoraes.engineering-playbook.content.ref`.

The version label is derived from `package.json`, and the content label is
derived from `content-source.json`, keeping artifact metadata consistent with
the release record.

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
