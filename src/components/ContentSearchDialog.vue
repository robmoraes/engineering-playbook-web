<template>
  <q-dialog v-model="isOpen" class="search-overlay" aria-labelledby="search-dialog-title">
    <q-card class="search-dialog">
      <q-card-section class="search-dialog-heading">
        <div>
          <p class="eyebrow">Documentation search</p>
          <h2 id="search-dialog-title">Search the playbook</h2>
        </div>
        <q-btn v-close-popup flat round dense icon="close" aria-label="Close search" />
      </q-card-section>

      <q-card-section class="search-input-section">
        <q-input
          ref="queryInput"
          v-model="query"
          outlined
          clearable
          autofocus
          type="search"
          debounce="0"
          aria-label="Search playbook content"
          placeholder="Search standards, practices and examples"
        >
          <template #prepend>
            <q-icon name="search" />
          </template>
        </q-input>
      </q-card-section>

      <q-separator />

      <q-card-section class="search-results" aria-live="polite">
        <div v-if="isLoading" class="search-message">
          <q-spinner color="primary" size="26px" />
          <span>Loading generated search index...</span>
        </div>

        <div v-else-if="hasLoadError" class="search-message search-error">
          The generated search index could not be loaded.
        </div>

        <div v-else-if="normalizedQuery.length < 2" class="search-message">
          Enter at least two characters to search the static playbook snapshot.
        </div>

        <div v-else-if="results.length === 0" class="search-message">
          No documents match <strong>{{ query.trim() }}</strong
          >.
        </div>

        <template v-else>
          <p class="search-count">
            {{ results.length }} {{ results.length === 1 ? 'result' : 'results' }}
          </p>
          <button
            v-for="result in results"
            :key="result.route"
            class="search-result"
            type="button"
            @click="openResult(result.route)"
          >
            <span class="search-result-book">{{ result.bookTitle }}</span>
            <strong>{{ result.title }}</strong>
            <span class="search-result-snippet">{{ result.snippet }}</span>
          </button>
        </template>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  normalizeSearchText,
  prepareContentSearch,
  searchContent,
} from 'src/content/content-search'

const props = defineProps({
  modelValue: {
    type: Boolean,
    required: true,
  },
})
const emit = defineEmits(['update:modelValue'])
const router = useRouter()
const queryInput = ref()
const query = ref('')
const results = ref([])
const isLoading = ref(false)
const hasLoadError = ref(false)
let activeSearch = 0

const normalizedQuery = computed(() => normalizeSearchText(query.value || ''))
const isOpen = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
})

watch(
  () => props.modelValue,
  async (open) => {
    if (!open) {
      return
    }

    query.value = ''
    results.value = []
    hasLoadError.value = false
    isLoading.value = true

    try {
      await prepareContentSearch()
    } catch {
      hasLoadError.value = true
    } finally {
      isLoading.value = false
    }

    await nextTick()
    queryInput.value?.focus()
  },
)

watch(query, async (value) => {
  const request = ++activeSearch
  results.value = []

  if (normalizeSearchText(value || '').length < 2 || hasLoadError.value) {
    return
  }

  isLoading.value = true

  try {
    const matchingResults = await searchContent(value)

    if (request === activeSearch) {
      results.value = matchingResults
    }
  } catch {
    if (request === activeSearch) {
      hasLoadError.value = true
    }
  } finally {
    if (request === activeSearch) {
      isLoading.value = false
    }
  }
})

async function openResult(route) {
  isOpen.value = false
  await router.push(route)
}
</script>
