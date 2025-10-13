import { createApp } from 'vue'
import { createPinia } from 'pinia'
import * as Sentry from '@sentry/vue'

import App from '@/App.vue'
import router from '@/router'

const app = createApp(App)

Sentry.init({
  app,
  dsn: 'https://6244094f62e15ae78f56b59aa74fe2f3@o4510156629475328.ingest.us.sentry.io/4510265894371328',
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

app.use(createPinia())
app.use(router)

app.mount('#app')
