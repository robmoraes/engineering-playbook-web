const minimumQueryLength = 2
const maximumResults = 20
const contextLength = 74

let indexRequest

export function normalizeSearchText(value) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

export async function prepareContentSearch() {
  if (!indexRequest) {
    indexRequest = fetch('/content/search-index.json')
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Unable to load generated search index: HTTP ${response.status}`)
        }

        return response.json()
      })
      .then((index) => {
        if (!Array.isArray(index)) {
          throw new Error('Unable to load generated search index: invalid content.')
        }

        return index.map((record) => ({
          ...record,
          normalizedTitle: normalizeSearchText(record.title),
          normalizedDescription: normalizeSearchText(record.description),
          normalizedText: normalizeSearchText(record.text),
        }))
      })
      .catch((error) => {
        indexRequest = undefined
        throw error
      })
  }

  return indexRequest
}

function resultRank(record, query) {
  if (record.normalizedTitle.includes(query)) {
    return record.normalizedTitle.startsWith(query) ? 0 : 1
  }

  if (record.normalizedDescription.includes(query)) {
    return 2
  }

  if (record.normalizedText.includes(query)) {
    return 3
  }

  return undefined
}

function snippetForResult(record, query) {
  const matchIndex = record.normalizedText.indexOf(query)

  if (matchIndex < 0) {
    return record.description
  }

  const start = Math.max(0, matchIndex - contextLength)
  const end = Math.min(record.text.length, matchIndex + query.length + contextLength)
  const prefix = start > 0 ? '...' : ''
  const suffix = end < record.text.length ? '...' : ''

  return `${prefix}${record.text.slice(start, end).trim()}${suffix}`
}

export async function searchContent(queryValue) {
  const query = normalizeSearchText(queryValue)

  if (query.length < minimumQueryLength) {
    return []
  }

  const index = await prepareContentSearch()

  return index
    .map((record) => ({ record, rank: resultRank(record, query) }))
    .filter((candidate) => candidate.rank !== undefined)
    .sort(
      (left, right) =>
        left.rank - right.rank || left.record.title.localeCompare(right.record.title),
    )
    .slice(0, maximumResults)
    .map(({ record }) => ({
      bookTitle: record.bookTitle,
      bookSlug: record.bookSlug,
      title: record.title,
      description: record.description,
      text: record.text,
      route: record.route,
      snippet: snippetForResult(record, query),
    }))
}
