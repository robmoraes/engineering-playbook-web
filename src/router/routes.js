const routes = [
  {
    path: '/',
    component: () => import('layouts/MainLayout.vue'),
    children: [
      {
        path: '',
        name: 'home',
        component: () => import('pages/HomePage.vue'),
      },
      {
        path: 'books/:bookSlug/pages/:pageSlug',
        name: 'content-page',
        component: () => import('pages/ContentPage.vue'),
      },
    ],
  },

  {
    path: '/:catchAll(.*)*',
    name: 'not-found',
    component: () => import('pages/ErrorNotFound.vue'),
  },
]

export default routes
