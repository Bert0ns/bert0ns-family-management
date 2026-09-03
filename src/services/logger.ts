import { consoleTransport, logger as rnLogs } from 'react-native-logs';

const config = {
  levels: {
    trace: 0,
    debug: 1,
    info: 2,
    log: 2,
    warn: 3,
    error: 4,
  },
  severity: process.env.NODE_ENV === 'production' ? 'error' : 'trace',
  transport: consoleTransport,
  transportOptions: {
    colors: {
      trace: 'white' as const,
      debug: 'greenBright' as const,
      info: 'blueBright' as const,
      log: 'blueBright' as const,
      warn: 'yellowBright' as const,
      error: 'redBright' as const,
    },
    extensionColors: {
      Store: 'magentaBright' as const,
      Validator: 'yellowBright' as const,
      FileExporter: 'blueBright' as const,
      Import: 'cyanBright' as const,
      Analytics: 'greenBright' as const,
      Supabase: 'cyan' as const,
      UI: 'grey' as const,
    },
  },
  async: process.env.NODE_ENV !== 'test',
  dateFormat: 'time',
  printLevel: false,
  printDate: true,
  enabled: process.env.NODE_ENV !== 'test',
};

export const logger = rnLogs.createLogger(config);

export const storeLogger = logger.extend('Store');
export const validatorLogger = logger.extend('Validator');
export const exportLogger = logger.extend('FileExporter');
export const importLogger = logger.extend('Import');
export const analyticsLogger = logger.extend('Analytics');
export const supabaseLogger = logger.extend('Supabase');
export const uiLogger = logger.extend('UI');
