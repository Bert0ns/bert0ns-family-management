import { consoleTransport, logger as rnLogs } from 'react-native-logs';

const SENSITIVE_KEY_PATTERNS = [
  'amount',
  'candidateamount',
  'merchant',
  'candidatemerchant',
  'merchantname',
  'email',
  'token',
  'notes',
  'password',
  'accesstoken',
  'refreshtoken',
  'secret',
  'credential',
  'pin',
];

function isSensitiveKey(key: string): boolean {
  const normalized = key.toLowerCase().replace(/[-_]/g, '');
  return SENSITIVE_KEY_PATTERNS.some((pattern) => normalized.includes(pattern));
}

const EMAIL_REGEX = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;

/**
 * Recursively redacts sensitive financial information, PII, and credentials from log context.
 */
export function redactSensitiveData<T>(data: T, seen = new WeakSet<object>()): T {
  if (data === null || data === undefined) {
    return data;
  }

  if (typeof data === 'string') {
    return data.replace(EMAIL_REGEX, '[REDACTED]') as unknown as T;
  }

  if (typeof data !== 'object') {
    return data;
  }

  if (seen.has(data as object)) {
    return '[Circular Reference]' as unknown as T;
  }
  seen.add(data as object);

  if (data instanceof Error) {
    const errorCopy = new Error(data.message.replace(EMAIL_REGEX, '[REDACTED]'));
    errorCopy.name = data.name;
    if (data.stack) {
      errorCopy.stack = data.stack.replace(EMAIL_REGEX, '[REDACTED]');
    }
    return errorCopy as unknown as T;
  }

  if (Array.isArray(data)) {
    return data.map((item) => redactSensitiveData(item, seen)) as unknown as T;
  }

  const redactedObj: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (isSensitiveKey(key)) {
      redactedObj[key] = '[REDACTED]';
    } else {
      redactedObj[key] = redactSensitiveData(value, seen);
    }
  }

  return redactedObj as unknown as T;
}

export const redactContext = redactSensitiveData;

const safeStringify = (value: unknown): string => {
  const cache = new Set();
  try {
    return JSON.stringify(
      value,
      (_key, val) => {
        if (typeof val === 'object' && val !== null) {
          if (cache.has(val)) {
            return '[Circular Reference]';
          }
          cache.add(val);
        }
        return val;
      },
      2,
    );
  } catch {
    return '[[Unserializable Value]]';
  }
};

const customStringify = (msg: unknown): string => {
  const redacted = redactSensitiveData(msg);
  if (typeof redacted === 'string') {
    return redacted + ' ';
  }
  if (typeof redacted === 'function') {
    return `[function ${(redacted as Function).name || 'anonymous'}()] `;
  }
  if (redacted instanceof Error) {
    return (redacted.stack || redacted.message) + ' ';
  }
  return '\n' + safeStringify(redacted) + '\n';
};

const secureConsoleTransport = (props: any) => {
  if (props && props.rawMsg && Array.isArray(props.rawMsg)) {
    props.rawMsg = props.rawMsg.map((m: any) => redactSensitiveData(m));
  }
  return consoleTransport(props);
};

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
  transport: secureConsoleTransport,
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
      Transaction: 'greenBright' as const,
      Sync: 'cyanBright' as const,
      Auth: 'yellowBright' as const,
      Validator: 'yellow' as const,
      FileExporter: 'blueBright' as const,
      Import: 'cyan' as const,
      Analytics: 'green' as const,
      Supabase: 'blueBright' as const,
      UI: 'grey' as const,
    },
  },
  async: process.env.NODE_ENV !== 'test',
  dateFormat: 'time',
  printLevel: true,
  printDate: true,
  enabled: process.env.NODE_ENV !== 'test',
  stringifyFunc: customStringify,
};

export const logger = rnLogs.createLogger(config);

export const storeLogger = logger.extend('Store');
export const transactionLogger = logger.extend('Transaction');
export const syncLogger = logger.extend('Sync');
export const authLogger = logger.extend('Auth');
export const validatorLogger = logger.extend('Validator');
export const exportLogger = logger.extend('FileExporter');
export const importLogger = logger.extend('Import');
export const analyticsLogger = logger.extend('Analytics');
export const supabaseLogger = logger.extend('Supabase');
export const uiLogger = logger.extend('UI');
