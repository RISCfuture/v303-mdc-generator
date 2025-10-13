import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import { sentryVitePlugin } from '@sentry/vite-plugin'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  base: mode === 'production' ? '/v303-mdc-generator/' : '/',
  build: {
    sourcemap: true, // Enable source maps for Sentry
  },
  plugins: [
    vue(),
    vueDevTools(),
    // Sentry plugin must be added last
    sentryVitePlugin({
      org: 'tim-dot-codes',
      project: 'v303-mdc-generator',
      authToken: process.env.SENTRY_AUTH_TOKEN,
      sourcemaps: {
        // Delete source maps after upload to keep them out of production
        filesToDeleteAfterUpload: ['./dist/**/*.map'],
      },
      release: {
        // Automatically set release name from git
        name: process.env.GITHUB_SHA,
        // Associate commits with the release
        setCommits: {
          auto: true,
        },
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
}))
