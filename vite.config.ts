import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import { sentryVitePlugin } from '@sentry/vite-plugin'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const plugins = [vue(), vueDevTools()]

  // Only add Sentry plugin in production builds
  if (mode === 'production') {
    plugins.push(
      sentryVitePlugin({
        org: 'timcodes',
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
      })
    )
  }

  return {
    base: mode === 'production' ? '/v303-mdc-generator/' : '/',
    build: {
      sourcemap: mode === 'production', // Only enable source maps in production for Sentry
    },
    plugins,
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url))
      },
    },
  }
})
