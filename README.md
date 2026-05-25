# Engineering Playbook Web

Static SPA presentation layer for the
[`engineering-playbook`](https://github.com/robmoraes/engineering-playbook)
documentation repository.

This is a portfolio project by **Carlos R Moraes Rodrigues**. The source
repository contains the personal professional standards, conventions and
operational practices that guide my work as a software engineer. This
repository owns only the web experience, generated content snapshot and static
delivery runtime.

## Author

- Site: [about.carlosmoraesrodrigues.dev.br](https://about.carlosmoraesrodrigues.dev.br)
- Email: [carlos.moraes.as@gmail.com](mailto:carlos.moraes.as@gmail.com)
- GitHub: [robmoraes](https://github.com/robmoraes)
- Docker Hub: [carlosmoraesrodrigues](https://hub.docker.com/u/carlosmoraesrodrigues)
- LinkedIn: [carlosmoraesjr](https://www.linkedin.com/in/carlosmoraesjr/)

## Architecture

This application deliberately does **not** fetch GitHub or another content API
in the browser. The build-time synchronization step downloads the public
`engineering-playbook` source snapshot from GitHub, reads its root navigation,
converts the selected Markdown documents to sanitized HTML and generates JSON
assets that are served with the compiled application:

```text
github.com/robmoraes/engineering-playbook (main archive)
        |
        | yarn content:sync (build time only)
        v
src/content/generated/manifest.json
public/content/pages/**/*.json
        |
        | quasar build
        v
dist/spa/ static assets -> Nginx container
```

Each area linked under `Navigation` in the source `README.md` becomes a book
in the SPA. All Markdown documents beneath that area become generated pages,
with title, slug, description, source path, source link and rendered content.
Within each book, the page sequence follows links from its `README.md` and
linked nested indexes; unlisted documents remain available after indexed
content. The reader exposes previous and next links from that generated
sequence. This keeps the presentation layer traceable to the documentation
repository while remaining fully static after compilation.

The lightweight manifest is bundled for navigation metadata. Rendered document
JSON is requested only from the application's own static assets when a reader
opens a page; it is never fetched from GitHub by the browser.

Search follows the same static-delivery boundary. The build generates a
plain-text search index from the source Markdown, and the browser requests that
single index only after the search dialog is opened. Queries are evaluated
locally against titles, descriptions and document text with case-insensitive
and accent-insensitive matching.

## Application Structure

```text
docker/nginx/default.conf      static web-server and SPA routing policy
scripts/sync-content.mjs       GitHub snapshot import and Markdown generation
src/content/generated/         generated navigation manifest
public/content/pages/          generated static document payloads
public/content/search-index.json generated on-demand search index
src/components/                reader interaction components
src/layouts/                   header, navigation and footer shell
src/pages/                     home, document reader and not-found screens
src/router/                    SPA routes
Dockerfile                     multi-stage static web image
CHANGELOG.md                   explicit project release history
RELEASING.md                   release/versioning procedure
.github/workflows/             container validation and publication
```

The first UI version supplies:

- a portfolio-oriented landing page;
- ordered content navigation grouped by books;
- modal search over the generated static document snapshot;
- static document rendering at `/books/:bookSlug/pages/:pageSlug`;
- previous and next document navigation derived from source indexes;
- a not-found screen;
- a responsive layout with header, sidebar and footer.

## Local Development

Prerequisites: Node.js 24 or a compatible version declared in `package.json`,
and Yarn 1.x.

```bash
yarn
yarn content:sync
yarn dev
```

The same synchronization command is available through npm when required:

```bash
npm run content:sync
```

By default, `content:sync` downloads the public `main` branch archive from
GitHub using the Node-based generator; no local Git checkout or system archive
tool is required. Local source can be used while authoring both repositories:

```bash
CONTENT_SOURCE_DIR=../engineering-playbook yarn content:sync
```

The remote source and ref are configurable for build validation or preview:

```bash
CONTENT_REPOSITORY_URL=https://github.com/robmoraes/engineering-playbook \
CONTENT_REPOSITORY_REF=main \
yarn content:sync
```

Only the synchronization/build process accesses GitHub. The generated browser
application contains no content API dependency and does not require GitHub
availability when it is served.

## Validation and Static Build

```bash
yarn lint
yarn build
```

`yarn build` invokes content synchronization before compiling the SPA. Build
output is written to `dist/spa/`; it contains everything required at runtime.
The application uses history-mode routes, with the Nginx configuration
returning `index.html` for client-side paths.

## Container Execution

The container uses a Node build stage and an Nginx runtime stage. Its build
stage imports the public GitHub content snapshot; build tooling, source
documents and dependencies do not ship in the runtime image.

```bash
docker build -t engineering-playbook-web:local .
docker run --rm -p 8080:8080 engineering-playbook-web:local
```

Open `http://localhost:8080/`. A minimal container health path is available at
`/healthz`.

## Delivery Pipeline

This is a public portfolio application using trunk-based development: `main`
is the integration and release source, with short-lived working branches.

The Docker image workflow validates every pull request targeting `main` by
building the static Nginx image without publishing it. A push to `main`
publishes the image to Docker Hub:

```text
pull request to main -> build image only
push to main -> build image -> publish latest and sha-<commit-sha>
push v<package-version> tag -> build image -> publish v<package-version>
```

Published image repository:
[`carlosmoraesrodrigues/engineering-playbook-web`](https://hub.docker.com/r/carlosmoraesrodrigues/engineering-playbook-web)

Publication requires these GitHub Actions repository secrets:

- `DOCKERHUB_USERNAME`
- `DOCKERHUB_TOKEN`

No deployment credential or backend secret is required by the SPA runtime;
the Docker Hub credentials are used only by the publication workflow.

## Versioning

`package.json` is the single source of truth for the project version. Releases
are prepared explicitly with `CHANGELOG.md` and a matching Git tag, for example
`v0.1.0`. Docker Hub images use:

- `latest` for each successful push to `main`;
- `sha-<commit-sha>` for the immutable image created from a push to `main`;
- `v<package-version>` for a matching release Git tag.

See [RELEASING.md](./RELEASING.md) for the release procedure, tag validation,
Docker publication behavior and future GitHub Releases convention.
