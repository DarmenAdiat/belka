export default defineNuxtConfig({
  ssr: false,

  modules: ['vuetify-nuxt-module'],

  vuetify: {
    moduleOptions: {
      importComposables: true,
    },
    vuetifyOptions: {
      theme: {
        defaultTheme: 'light',
        themes: {
          light: {
            colors: {
              primary: '#1a237e',
              secondary: '#c62828',
              surface: '#fafafa',
            },
          },
        },
      },
      icons: {
        defaultSet: 'mdi',
      },
    },
  },

  css: ['@mdi/font/css/materialdesignicons.min.css'],

  nitro: {
    preset: 'vercel-static',
  },

  compatibilityDate: '2024-11-01',
})
