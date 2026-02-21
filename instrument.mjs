import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: "https://265d4c8097bf857141e3fbfa80099483@o4510921971990528.ingest.de.sentry.io/4510921988571216",

  // Send structured logs to Sentry
  enableLogs: true,

  // Tracing — capture 100% of transactions
  tracesSampleRate: 1.0,

  // Send default PII data (e.g., IP addresses)
  sendDefaultPii: true,
});
