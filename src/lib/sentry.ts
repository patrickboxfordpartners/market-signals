import * as Sentry from '@sentry/react'

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN

export function initSentry() {
  // Only initialize if DSN is configured
  if (!SENTRY_DSN) {
    console.warn('Sentry DSN not configured. Error monitoring disabled.')
    return
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],

    // Performance Monitoring
    tracesSampleRate: 0.1, // 10% of transactions

    // Session Replay
    replaysSessionSampleRate: 0.1, // 10% of sessions
    replaysOnErrorSampleRate: 1.0, // 100% of sessions with errors

    // Environment
    environment: import.meta.env.MODE || 'development',

    // Release tracking
    release: import.meta.env.VITE_APP_VERSION,

    // Ignore common errors
    ignoreErrors: [
      // Browser extensions
      'ResizeObserver loop limit exceeded',
      'Non-Error promise rejection captured',
      // Network errors
      'NetworkError',
      'Failed to fetch',
    ],

    beforeSend(event, hint) {
      // Filter out non-critical errors in development
      if (import.meta.env.DEV && hint.originalException) {
        console.error('Sentry captured:', hint.originalException)
      }
      return event
    },
  })
}
