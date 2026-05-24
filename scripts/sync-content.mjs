import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, posix, resolve } from 'node:path'
import { marked, Renderer } from 'marked'
import sanitizeHtml from 'sanitize-html'
import { extract } from 'tar'

const outputFile = resolve('src/content/generated/manifest.json')
const outputPagesDirectory = resolve('public/content/pages')
const repositoryUrl = (
  process.env.CONTENT_REPOSITORY_URL || 'https://github.com/robmoraes/engineering-playbook'
).replace(/\.git$/, '')
const repositoryRef = process.env.CONTENT_REPOSITORY_REF || 'main'
const localSourceDirectory = process.env.CONTENT_SOURCE_DIR
const repositoryArchiveUrl =
  process.env.CONTENT_ARCHIVE_URL ||
  `${repositoryUrl}/archive/refs/heads/${encodeURIComponent(repositoryRef)}.tar.gz`

const allowedHtml = {
  allowedTags: [
    'a',
    'blockquote',
    'br',
    'code',
    'em',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'hr',
    'li',
    'ol',
    'p',
    'pre',
    'strong',
    'table',
    'tbody',
    'td',
    'th',
    'thead',
    'tr',
    'ul',
  ],
  allowedAttributes: {
    a: ['href', 'rel', 'target'],
    h2: ['id'],
    h3: ['id'],
    h4: ['id'],
    h5: ['id'],
    h6: ['id'],
  },
  allowedSchemes: ['http', 'https', 'mailto'],
  allowProtocolRelative: false,
}

function slugify(value) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

function titleFromPath(path) {
  return path
    .split('/')
    .map((part) =>
      part
        .split('-')
        .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
        .join(' '),
    )
    .join(' / ')
}

function descriptionFromMarkdown(markdown, fallback) {
  const paragraph = marked
    .lexer(markdown)
    .find((token) => token.type === 'paragraph' && !token.text.startsWith('[!'))

  if (!paragraph) {
    return fallback
  }

  return paragraph.text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[`*_]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function titleFromMarkdown(markdown, fallback) {
  const heading = marked
    .lexer(markdown)
    .find((token) => token.type === 'heading' && token.depth === 1)

  return heading?.text || fallback
}

function withoutDocumentTitle(markdown) {
  return markdown.replace(/^#\s+.+?(?:\r?\n){1,2}/, '')
}

function pageSlug(relativePath) {
  const withoutExtension = relativePath.replace(/\.md$/i, '')

  if (withoutExtension.toLowerCase() === 'readme') {
    return 'overview'
  }

  return slugify(withoutExtension.replace(/\/README$/i, '/overview'))
}

function pageRoute(bookSlug, pageSlugValue) {
  return `/books/${bookSlug}/pages/${pageSlugValue}`
}

async function collectMarkdownFiles(directory, relativeDirectory = '') {
  const entries = await readdir(join(directory, relativeDirectory), { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    const relativePath = posix.join(relativeDirectory, entry.name)

    if (entry.isDirectory()) {
      files.push(...(await collectMarkdownFiles(directory, relativePath)))
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.md')) {
      files.push(relativePath)
    }
  }

  return files.sort((left, right) => left.localeCompare(right))
}

function localMarkdownTarget(href, sourcePath) {
  const [target] = href.split('#')

  if (!target || /^(?:[a-z]+:|\/\/|#)/i.test(target)) {
    return undefined
  }

  const candidatePath = target.endsWith('/') ? `${target}README.md` : target

  if (!candidatePath.toLowerCase().endsWith('.md')) {
    return undefined
  }

  const relativePath = posix.normalize(posix.join(posix.dirname(sourcePath), candidatePath))

  if (relativePath.startsWith('../') || relativePath === '..') {
    return undefined
  }

  return relativePath
}

function findLocalMarkdownLinks(markdown, sourcePath) {
  const tableLinks = marked
    .lexer(markdown)
    .filter((token) => token.type === 'table')
    .flatMap((table) => table.rows.flatMap((row) => row.flatMap((cell) => cell.tokens)))
    .filter(
      (token) => token.type === 'link' || (token.type === 'codespan' && /\/$/.test(token.text)),
    )
    .map((token) => localMarkdownTarget(token.href || token.text, sourcePath))
    .filter(Boolean)

  if (tableLinks.length > 0) {
    return tableLinks
  }

  const markdownLink = /(?<!!)\[[^\]]+\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g

  return [...markdown.matchAll(markdownLink)]
    .map((match) => localMarkdownTarget(match[1], sourcePath))
    .filter(Boolean)
}

async function orderMarkdownFilesByReadme(directory) {
  const availablePaths = await collectMarkdownFiles(directory)
  const available = new Set(availablePaths)
  const visited = new Set()
  const orderedPaths = []

  async function visit(relativePath) {
    if (!available.has(relativePath) || visited.has(relativePath)) {
      return
    }

    visited.add(relativePath)
    orderedPaths.push(relativePath)

    if (!relativePath.toLowerCase().endsWith('readme.md')) {
      return
    }

    const markdown = await readFile(join(directory, relativePath), 'utf8')
    const indexDirectory = posix.dirname(relativePath)

    for (const linkedPath of findLocalMarkdownLinks(markdown, relativePath)) {
      if (
        relativePath.toLowerCase() === 'readme.md' ||
        linkedPath.startsWith(`${indexDirectory}/`)
      ) {
        await visit(linkedPath)
      }
    }
  }

  await visit('README.md')

  for (const relativePath of availablePaths) {
    await visit(relativePath)
  }

  return orderedPaths
}

async function downloadRepository() {
  const temporaryDirectory = await mkdtemp(join(tmpdir(), 'engineering-playbook-content-'))
  const archiveFile = join(temporaryDirectory, 'source.tar.gz')

  try {
    const response = await fetch(repositoryArchiveUrl)

    if (!response.ok) {
      throw new Error(`Unable to download source archive: HTTP ${response.status}.`)
    }

    await writeFile(archiveFile, Buffer.from(await response.arrayBuffer()))
    await extract({ cwd: temporaryDirectory, file: archiveFile })

    const extractedDirectories = (
      await readdir(temporaryDirectory, { withFileTypes: true })
    ).filter((entry) => entry.isDirectory())

    if (extractedDirectories.length !== 1) {
      throw new Error('The content archive did not contain one repository root directory.')
    }

    return {
      rootDirectory: join(temporaryDirectory, extractedDirectories[0].name),
      cleanup: () => rm(temporaryDirectory, { recursive: true, force: true }),
      sourceMode: 'github-archive',
    }
  } catch (error) {
    await rm(temporaryDirectory, { recursive: true, force: true })
    throw error
  }
}

async function getSource() {
  if (localSourceDirectory) {
    return {
      rootDirectory: resolve(localSourceDirectory),
      cleanup: async () => {},
      sourceMode: 'local-directory',
    }
  }

  return downloadRepository()
}

function parseBooksFromRootReadme(rootReadme) {
  const navigationTable = marked
    .lexer(rootReadme)
    .find(
      (token) =>
        token.type === 'table' &&
        token.header[0]?.text.trim().toLowerCase() === 'area' &&
        token.header[1]?.text.trim().toLowerCase() === 'content',
    )

  if (!navigationTable) {
    throw new Error('README.md must contain the Navigation table with Area and Content columns.')
  }

  return navigationTable.rows.map((row) => {
    const areaLink = row[0].tokens.find((token) => token.type === 'link')
    const directory = areaLink?.href.replace(/^\.\//, '').replace(/\/$/, '')

    if (!areaLink || !directory || directory.includes('..')) {
      throw new Error('Each README Navigation area must link to a local documentation directory.')
    }

    return {
      title: areaLink.text,
      slug: slugify(directory),
      directory,
      description: row[1].text.trim(),
    }
  })
}

async function createPageCatalog(rootDirectory, navigationBooks) {
  const catalog = []

  for (const navigationBook of navigationBooks) {
    const bookDirectory = join(rootDirectory, navigationBook.directory)
    const paths = await orderMarkdownFilesByReadme(bookDirectory)

    for (const relativePath of paths) {
      const sourcePath = posix.join(navigationBook.directory, relativePath)
      const markdown = await readFile(join(bookDirectory, relativePath), 'utf8')
      const slug = pageSlug(relativePath)

      catalog.push({
        bookSlug: navigationBook.slug,
        sourcePath,
        relativePath,
        slug,
        route: pageRoute(navigationBook.slug, slug),
        markdown,
      })
    }
  }

  return catalog
}

function resolveLink(href, page, routeBySourcePath) {
  if (href.startsWith('#') || /^(?:[a-z]+:|\/\/)/i.test(href)) {
    return href
  }

  const [target, fragment] = href.split('#')
  let candidatePath = target

  if (!candidatePath) {
    return fragment ? `#${fragment}` : href
  }

  if (candidatePath.endsWith('/')) {
    candidatePath = `${candidatePath}README.md`
  }

  const sourceTarget = posix.normalize(posix.join(posix.dirname(page.sourcePath), candidatePath))
  const internalRoute = routeBySourcePath.get(sourceTarget)
  const suffix = fragment ? `#${slugify(fragment)}` : ''

  if (internalRoute) {
    return `${internalRoute}${suffix}`
  }

  if (candidatePath.toLowerCase().endsWith('.md')) {
    return `${repositoryUrl}/blob/${repositoryRef}/${sourceTarget}${fragment ? `#${fragment}` : ''}`
  }

  return href
}

function renderMarkdown(page, routeBySourcePath) {
  const renderer = new Renderer()

  renderer.link = function link(token) {
    const href = resolveLink(token.href, page, routeBySourcePath)
    const label = this.parser.parseInline(token.tokens)
    const external = /^https?:\/\//.test(href)
    const targetAttributes = external ? ' target="_blank" rel="noopener noreferrer"' : ''

    return `<a href="${href}"${targetAttributes}>${label}</a>`
  }

  renderer.heading = function heading(token) {
    const label = this.parser.parseInline(token.tokens)
    const id = slugify(token.text)

    return `<h${token.depth} id="${id}">${label}</h${token.depth}>`
  }

  const rendered = marked.parse(withoutDocumentTitle(page.markdown), { renderer })
  return sanitizeHtml(rendered, allowedHtml)
}

async function buildManifest(rootDirectory, sourceMode) {
  const rootReadme = await readFile(join(rootDirectory, 'README.md'), 'utf8')
  const navigationBooks = parseBooksFromRootReadme(rootReadme)
  const catalog = await createPageCatalog(rootDirectory, navigationBooks)
  const routeBySourcePath = new Map(catalog.map((page) => [page.sourcePath, page.route]))
  const pageAssets = []

  const books = navigationBooks.map((navigationBook) => {
    const pages = catalog.filter((page) => page.bookSlug === navigationBook.slug)
    const chaptersBySlug = new Map()
    const orderedPages = []

    for (const page of pages) {
      const relativeDirectory = posix.dirname(page.relativePath)
      const chapterSlug = relativeDirectory === '.' ? 'core-documents' : slugify(relativeDirectory)
      const chapterTitle =
        relativeDirectory === '.' ? 'Core Documents' : titleFromPath(relativeDirectory)

      if (!chaptersBySlug.has(chapterSlug)) {
        chaptersBySlug.set(chapterSlug, {
          title: chapterTitle,
          slug: chapterSlug,
          description: `${chapterTitle} documents`,
          sourcePath: posix.join(navigationBook.directory, relativeDirectory),
          pages: [],
        })
      }

      const contentPath = `/content/pages/${navigationBook.slug}/${page.slug}.json`

      const pageMetadata = {
        title: titleFromMarkdown(page.markdown, titleFromPath(page.slug)),
        slug: page.slug,
        description: descriptionFromMarkdown(page.markdown, navigationBook.description),
        sourcePath: page.sourcePath,
        sourceUrl: `${repositoryUrl}/blob/${repositoryRef}/${page.sourcePath}`,
        contentPath,
      }

      orderedPages.push(pageMetadata)
      chaptersBySlug.get(chapterSlug).pages.push(pageMetadata)

      pageAssets.push({
        outputPath: join(outputPagesDirectory, navigationBook.slug, `${page.slug}.json`),
        content: {
          sourcePath: page.sourcePath,
          contentHtml: renderMarkdown(page, routeBySourcePath),
        },
      })
    }

    const pagesWithPagination = orderedPages.map((page, index) => ({
      ...page,
      previousPage:
        index > 0
          ? {
              title: orderedPages[index - 1].title,
              route: pageRoute(navigationBook.slug, orderedPages[index - 1].slug),
            }
          : undefined,
      nextPage:
        index < orderedPages.length - 1
          ? {
              title: orderedPages[index + 1].title,
              route: pageRoute(navigationBook.slug, orderedPages[index + 1].slug),
            }
          : undefined,
    }))
    const orderedPageBySlug = new Map(pagesWithPagination.map((page) => [page.slug, page]))
    const chapters = [...chaptersBySlug.values()].map((chapter) => ({
      ...chapter,
      pages: chapter.pages.map((page) => orderedPageBySlug.get(page.slug)),
    }))

    return {
      title: navigationBook.title,
      slug: navigationBook.slug,
      description: navigationBook.description,
      sourcePath: `${navigationBook.directory}/README.md`,
      navigation: pagesWithPagination.map((page) => ({
        title: page.title,
        slug: page.slug,
      })),
      chapters,
    }
  })

  return {
    manifest: {
      schemaVersion: 1,
      sourceRepository: 'engineering-playbook',
      sourceRepositoryUrl: repositoryUrl,
      sourceRef: repositoryRef,
      sourceMode,
      description: descriptionFromMarkdown(rootReadme, 'Engineering standards and practices.'),
      books,
    },
    pageAssets,
  }
}

async function syncContent() {
  const source = await getSource()

  try {
    const { manifest, pageAssets } = await buildManifest(source.rootDirectory, source.sourceMode)
    const pageCount = manifest.books.reduce(
      (total, book) =>
        total +
        book.chapters.reduce((chapterTotal, chapter) => chapterTotal + chapter.pages.length, 0),
      0,
    )

    await mkdir(dirname(outputFile), { recursive: true })
    await rm(outputPagesDirectory, { recursive: true, force: true })
    await mkdir(outputPagesDirectory, { recursive: true })
    await writeFile(outputFile, `${JSON.stringify(manifest, null, 2)}\n`)

    for (const asset of pageAssets) {
      await mkdir(dirname(asset.outputPath), { recursive: true })
      await writeFile(asset.outputPath, `${JSON.stringify(asset.content, null, 2)}\n`)
    }

    console.log(
      `Content generated: ${manifest.books.length} books and ${pageCount} static pages from ${source.sourceMode}.`,
    )
    console.log(`Output: ${outputFile}`)
  } finally {
    await source.cleanup()
  }
}

syncContent().catch((error) => {
  console.error(`Content synchronization failed: ${error.message}`)
  process.exitCode = 1
})
