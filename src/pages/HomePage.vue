<template>
  <q-page class="home-page">
    <section class="hero">
      <p class="eyebrow">Carlos R Moraes Rodrigues | Engineering portfolio</p>
      <h1>The standards and practices that guide my software engineering work.</h1>
      <p class="hero-copy">
        Engineering Playbook is my professional reference for designing, delivering and operating
        software. This site presents the maintained <code>engineering-playbook</code> repository as
        a browsable, static portfolio artifact.
      </p>
      <div class="hero-actions">
        <q-btn
          unelevated
          no-caps
          color="primary"
          label="Browse the playbook"
          :to="firstPageRoute"
        />
        <span class="static-note">
          <q-icon name="lock" />
          No external content requests at runtime
        </span>
      </div>
    </section>

    <section class="profile-section" aria-labelledby="profile-heading">
      <div class="profile-statement">
        <p class="eyebrow">About the author</p>
        <h2 id="profile-heading">Carlos R Moraes Rodrigues</h2>
        <p>
          Software engineer documenting the standards, conventions and operational discipline I
          apply to professional projects and public engineering work.
        </p>
      </div>
      <div class="profile-links" aria-label="Carlos R Moraes Rodrigues professional links">
        <a href="mailto:carlos.moraes.as@gmail.com">
          <q-icon name="mail_outline" />
          <span><small>Email</small>carlos.moraes.as@gmail.com</span>
        </a>
        <a
          href="https://about.carlosmoraesrodrigues.dev.br"
          target="_blank"
          rel="noopener noreferrer"
        >
          <q-icon name="language" />
          <span><small>Site</small>about.carlosmoraesrodrigues.dev.br</span>
        </a>
        <a href="https://github.com/robmoraes" target="_blank" rel="noopener noreferrer">
          <q-icon name="code" />
          <span><small>GitHub</small>robmoraes</span>
        </a>
        <a
          href="https://hub.docker.com/u/carlosmoraesrodrigues"
          target="_blank"
          rel="noopener noreferrer"
        >
          <q-icon name="inventory_2" />
          <span><small>Docker Hub</small>carlosmoraesrodrigues</span>
        </a>
        <a
          href="https://www.linkedin.com/in/carlosmoraesjr/"
          target="_blank"
          rel="noopener noreferrer"
        >
          <q-icon name="work_outline" />
          <span><small>LinkedIn</small>carlosmoraesjr</span>
        </a>
      </div>
    </section>

    <section class="library-section" aria-labelledby="library-heading">
      <div class="section-heading">
        <p class="eyebrow">Content areas</p>
        <h2 id="library-heading">Explore {{ books.length }} playbook books</h2>
      </div>
      <div class="book-grid">
        <article v-for="book in books" :key="book.slug" class="book-card">
          <p class="book-type">Book</p>
          <h3>{{ book.title }}</h3>
          <p>{{ book.description }}</p>
          <q-btn
            flat
            no-caps
            color="primary"
            label="Read first page"
            :to="pageRoute(book.slug, book.chapters[0].pages[0].slug)"
          />
        </article>
      </div>
    </section>

    <section class="pipeline-section" aria-labelledby="pipeline-heading">
      <div>
        <p class="eyebrow">Architecture</p>
        <h2 id="pipeline-heading">A static content pipeline</h2>
      </div>
      <ol class="pipeline-steps">
        <li>
          <strong>Source</strong
          ><span>{{ pageCount }} documents are owned by engineering-playbook on GitHub.</span>
        </li>
        <li>
          <strong>Generate</strong><span>A build-time sync creates sanitized static content.</span>
        </li>
        <li><strong>Serve</strong><span>The browser receives only compiled SPA assets.</span></li>
      </ol>
    </section>
  </q-page>
</template>

<script setup>
import { books, pageCount, pageRoute } from 'src/content/content-repository'

const firstPageRoute = pageRoute(books[0].slug, books[0].chapters[0].pages[0].slug)
</script>
