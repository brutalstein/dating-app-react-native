type MonitoringContext = Record<string, unknown>;

type MonitoringAdapter = {
  captureException: (error: unknown, context?: MonitoringContext) => void;
  captureMessage: (message: string, context?: MonitoringContext) => void;
};

const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;
const MONITORING_ENABLED = Boolean(SENTRY_DSN);

let sentry: MonitoringAdapter | null = null;
let initialized = false;

const consoleAdapter: MonitoringAdapter = {
  captureException(error, context) {
    console.error('[monitoring] exception', error, context ?? {});
  },
  captureMessage(message, context) {
    console.log('[monitoring] message', message, context ?? {});
  },
};

const resolveSentryAdapter = (): MonitoringAdapter | null => {
  if (!MONITORING_ENABLED) {
    return null;
  }

  // Scaffold only: if SDK yoksa uygulama kırılmasın.
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const maybeSentry = require('@sentry/react-native');
    if (maybeSentry?.captureException && maybeSentry?.captureMessage) {
      maybeSentry.init({
        dsn: SENTRY_DSN,
        enabled: true,
      });

      return {
        captureException: maybeSentry.captureException,
        captureMessage: maybeSentry.captureMessage,
      };
    }
  } catch {
    // Optional dependency olmadığı durumda sessiz devam.
  }

  return null;
};

export const initMonitoring = () => {
  if (initialized) {
    return;
  }

  sentry = resolveSentryAdapter();
  initialized = true;

  if (MONITORING_ENABLED) {
    (sentry ?? consoleAdapter).captureMessage('monitoring_initialized', {
      provider: sentry ? 'sentry' : 'console-fallback',
    });
  }
};

export const captureException = (error: unknown, context?: MonitoringContext) => {
  (sentry ?? consoleAdapter).captureException(error, context);
};

export const captureMessage = (message: string, context?: MonitoringContext) => {
  (sentry ?? consoleAdapter).captureMessage(message, context);
};
