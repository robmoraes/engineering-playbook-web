import manifest from './generated/manifest.json'

export const books = manifest.books
export const contentMetadata = {
  sourceRepository: manifest.sourceRepository,
  sourceRepositoryUrl: manifest.sourceRepositoryUrl,
  sourceRef: manifest.sourceRef,
}
export const pageCount = books.reduce(
  (total, book) =>
    total + book.chapters.reduce((chapterTotal, chapter) => chapterTotal + chapter.pages.length, 0),
  0,
)

export function pageRoute(bookSlug, pageSlug) {
  return `/books/${bookSlug}/pages/${pageSlug}`
}

export function findPage(bookSlug, pageSlug) {
  const book = books.find((candidate) => candidate.slug === bookSlug)

  if (!book) {
    return undefined
  }

  for (const chapter of book.chapters) {
    const page = chapter.pages.find((candidate) => candidate.slug === pageSlug)

    if (page) {
      return { book, chapter, page }
    }
  }

  return undefined
}
