import { fileURLToPath, URL } from 'node:url'

import { defineConfig, type PluginOption } from 'vite'
import vue from '@vitejs/plugin-vue'
import csp from 'vite-plugin-csp-guard'

// https://vite.dev/config/
export default defineConfig(async ({ command, mode }) => {
  const plugins: PluginOption[] = [vue()]

  // Only add Vue DevTools in development
  if (mode === 'development') {
    const { default: vueDevTools } = await import('vite-plugin-vue-devtools')
    plugins.push(vueDevTools())
  }

  // Only add CSP plugin during build
  if (command === 'build') {
    plugins.push(
      csp({
        dev: { run: false },
        build: { sri: false },
        // TODO: Naive UI requires 'unsafe-inline' in style-src due to runtime css-render injection.
        // Revisit if Naive UI ships nonce support, or pre-render styles via SSR setup-css-render flow.
        policy: {
          'default-src': ["'self'"],
          'script-src': ["'self'"],
          'style-src': ["'self'", "'unsafe-inline'"],
          'style-src-attr': ["'unsafe-inline'"],
          'img-src': ["'self'", 'data:', 'blob:'],
          'font-src': ["'self'", 'data:'],
          'connect-src': ["'self'", 'https://*.ingest.sentry.io', 'https://*.sentry.io'],
          'worker-src': ["'self'", 'blob:'],
          'child-src': ["'self'", 'blob:'],
          'object-src': ["'none'"],
          'base-uri': ["'self'"],
          'form-action': ["'self'"],
        },
      }),
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
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
  }
})
