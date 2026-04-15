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
        // TODO: md-editor-v3 dynamically loads highlight.js, katex, mermaid, echarts, cropperjs,
        // and prettier from https://unpkg.com. Self-host these assets (or configure md-editor-v3
        // to use local copies via its config() API) so we can drop unpkg.com from the policy.
        // TODO: AJV compiles JSON Schema at runtime via dynamic code generation, which requires
        // 'unsafe-eval'. Pre-compile the mission schema with ajv-cli's standalone code
        // generator (or use ajv/dist/standalone) so we can drop 'unsafe-eval' from script-src.
        policy: {
          'default-src': ["'self'"],
          'script-src': ["'self'", "'unsafe-eval'", 'https://unpkg.com'],
          'script-src-elem': ["'self'", 'https://unpkg.com'],
          'style-src': ["'self'", "'unsafe-inline'", 'https://unpkg.com'],
          'style-src-elem': ["'self'", "'unsafe-inline'", 'https://unpkg.com'],
          'style-src-attr': ["'unsafe-inline'"],
          'img-src': ["'self'", 'data:', 'blob:'],
          'font-src': ["'self'", 'data:', 'https://unpkg.com'],
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
