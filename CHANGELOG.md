# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.3.1] - 2026-05-28

### Changed

- Updated Docker image references from `carlosmoraesrodrigues` to `robmoraes`
  in GitHub Actions workflow
- Updated Docker image metadata namespace from `dev.carlosmoraesrodrigues` to `dev.robmoraes`
- Updated maintainer contact details

## [0.3.0] - 2026-05-28

### Added

- Add repository-local agent guidance for project structure, build validation,
  content synchronization and release handling.

### Changed

- Update the web application version to `0.3.0`.
- Pin the build-time documentation source to `engineering-playbook@v0.3.0`.

## [0.2.0] - 2026-05-25

### Added

- Add modal search over the generated static documentation snapshot.

### Changed

- Pin the build-time documentation source through `content-source.json` and
  update the generated snapshot to `engineering-playbook@v0.2.0`.
- Publish Docker release tags by promoting the SHA-identified candidate digest
  instead of rebuilding the static application on a Git tag push.
- Record web source, documentation source and image digest evidence in the
  release workflow summary and procedure.

## [0.1.0] - 2026-05-24

### Added

- Initial static SPA foundation.
- Static content rendering architecture.
- Docker container support.
- GitHub Actions Docker pipeline.
- Trunk-based development workflow.
- Static content generation strategy.

[Unreleased]: https://github.com/robmoraes/engineering-playbook-web/compare/v0.3.0...HEAD
[0.3.0]: https://github.com/robmoraes/engineering-playbook-web/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/robmoraes/engineering-playbook-web/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/robmoraes/engineering-playbook-web/releases/tag/v0.1.0
