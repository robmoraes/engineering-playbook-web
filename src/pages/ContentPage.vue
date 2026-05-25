<template>
  <q-page v-if="page" class="content-page">
    <article class="document">
      <nav class="breadcrumb" aria-label="Breadcrumb">
        <router-link to="/">Home</router-link>
        <q-icon name="chevron_right" />
        <span>{{ book.title }}</span>
        <q-icon name="chevron_right" />
        <span>{{ chapter.title }}</span>
      </nav>

      <header class="document-header">
        <p class="eyebrow">{{ book.title }}</p>
        <h1>{{ page.title }}</h1>
        <p class="document-summary">{{ page.description }}</p>
        <a class="source-path" :href="page.sourceUrl" target="_blank" rel="noopener noreferrer">
          <q-icon name="description" /> Source: {{ page.sourcePath }}
        </a>
      </header>

      <div v-if="isLoading" class="document-status">
        <q-spinner color="primary" size="30px" />
        <span>Loading generated document...</span>
      </div>

      <div v-else-if="hasLoadError" class="document-status document-error">
        This generated document could not be loaded.
      </div>

      <!-- contentHtml is sanitized during scripts/sync-content.mjs generation. -->
      <section v-else class="rendered-markdown" v-html="pageContent.contentHtml"></section>

      <nav
        v-if="pageContent && !isLoading && !hasLoadError"
        class="document-pagination"
        aria-label="Document pagination"
      >
        <router-link
          v-if="page.previousPage"
          class="pagination-link pagination-previous"
          :to="page.previousPage.route"
        >
          <span class="pagination-direction"><q-icon name="west" /> Previous page</span>
          <strong>{{ page.previousPage.title }}</strong>
        </router-link>
        <span v-else class="pagination-placeholder"></span>

        <router-link
          v-if="page.nextPage"
          class="pagination-link pagination-next"
          :to="page.nextPage.route"
        >
          <span class="pagination-direction">Next page <q-icon name="east" /></span>
          <strong>{{ page.nextPage.title }}</strong>
        </router-link>
      </nav>
    </article>
  </q-page>

  <ErrorNotFound v-else />
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import ErrorNotFound from 'pages/ErrorNotFound.vue'
import { findPage } from 'src/content/content-repository'

const route = useRoute()
const selection = computed(() => findPage(route.params.bookSlug, route.params.pageSlug))
const book = computed(() => selection.value?.book)
const chapter = computed(() => selection.value?.chapter)
const page = computed(() => selection.value?.page)
const pageContent = ref()
const isLoading = ref(false)
const hasLoadError = ref(false)

watch(
  () => page.value?.contentPath,
  async (contentPath) => {
    pageContent.value = undefined
    hasLoadError.value = false

    if (!contentPath) {
      return
    }

    isLoading.value = true

    try {
      const response = await fetch(contentPath)

      if (!response.ok) {
        throw new Error(`Unable to load generated content: HTTP ${response.status}`)
      }

      pageContent.value = await response.json()
    } catch {
      hasLoadError.value = true
    } finally {
      isLoading.value = false
    }
  },
  { immediate: true },
)
</script>
