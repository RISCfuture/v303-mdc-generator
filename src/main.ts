import { createApp } from 'vue'
import { createPinia } from 'pinia'
import * as Sentry from '@sentry/vue'

import App from '@/App.vue'
import router from '@/router'

// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
const app = createApp(App)

// Only initialize Sentry in production, but not during E2E tests
const sentryDSN = import.meta.env.VITE_SENTRY_DSN as string | undefined
if (import.meta.env.PROD && !import.meta.env.VITE_DISABLE_SENTRY && sentryDSN) {
  Sentry.init({
    app,
    dsn: sentryDSN,
    // Setting this option to true will send default PII data to Sentry.
    // For example, automatic IP address collection on events
    sendDefaultPii: true,
    integrations: [Sentry.browserTracingIntegration({ router }), Sentry.replayIntegration()],
    // Tracing
    tracesSampleRate: 1.0, // Capture 100% of the transactions
    // Set 'tracePropagationTargets' to control for which URLs distributed tracing should be enabled
    tracePropagationTargets: ['localhost', /^https:\/\/riscfuture\.github\.io\/v303-mdc-generator/],
    // Session Replay
    replaysSessionSampleRate: 0.1, // This sets the sample rate at 10%. You may want to change it to 100% while in development and then sample at a lower rate in production.
    replaysOnErrorSampleRate: 1.0, // If you're not already sampling the entire session, change the sample rate to 100% when sampling sessions where errors occur.
    // Logs
    enableLogs: true,
  })
}

// Global Vue error handler — forward to Sentry (no-op in dev/test if Sentry isn't initialized)
app.config.errorHandler = (err, _instance, info) => {
  Sentry.captureException(err, { extra: { info } })
  console.error('[Vue error]', info, err)
}

app.use(createPinia())
app.use(router)

app.mount('#app')
