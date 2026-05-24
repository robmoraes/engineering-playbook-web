<template>
  <q-layout view="hHh Lpr fFf">
    <q-header class="site-header">
      <q-toolbar class="site-toolbar">
        <q-btn
          flat
          dense
          round
          icon="menu"
          aria-label="Open content navigation"
          class="drawer-toggle"
          @click="toggleDrawer"
        />

        <router-link class="brand" to="/">
          <span class="brand-mark">EP</span>
          <span>
            <span class="brand-title">Engineering Playbook</span>
            <span class="brand-subtitle">by Carlos R Moraes Rodrigues</span>
          </span>
        </router-link>

        <q-space />
        <q-badge class="build-badge" label="Static SPA" />
      </q-toolbar>
    </q-header>

    <q-drawer v-model="drawerOpen" show-if-above bordered :width="300" class="site-drawer">
      <nav class="navigation" aria-label="Playbook content">
        <p class="navigation-eyebrow">Library</p>
        <p class="navigation-description">
          Generated snapshot of the documentation source. Updates enter only through the build
          pipeline.
        </p>

        <section v-for="book in books" :key="book.slug" class="navigation-book">
          <h2>{{ book.title }}</h2>
          <q-list dense padding>
            <q-item
              v-for="page in book.navigation"
              :key="page.slug"
              clickable
              :to="pageRoute(book.slug, page.slug)"
              active-class="navigation-active"
            >
              <q-item-section>{{ page.title }}</q-item-section>
            </q-item>
          </q-list>
        </section>
      </nav>
    </q-drawer>

    <q-page-container>
      <router-view />
    </q-page-container>

    <q-footer class="site-footer">
      <div class="footer-content">
        <span class="footer-product">
          Engineering Playbook by Carlos R Moraes Rodrigues
          <small class="app-version">v{{ version }}</small>
        </span>
        <a
          href="https://about.carlosmoraesrodrigues.dev.br"
          target="_blank"
          rel="noopener noreferrer"
        >
          about.carlosmoraesrodrigues.dev.br
        </a>
      </div>
    </q-footer>
  </q-layout>
</template>

<script setup>
import { ref } from 'vue'
import { books, pageRoute } from 'src/content/content-repository'
import { version } from '../../package.json'

const drawerOpen = ref(false)

function toggleDrawer() {
  drawerOpen.value = !drawerOpen.value
}
</script>
