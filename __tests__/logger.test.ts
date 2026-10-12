import {
  logger,
  storeLogger,
  validatorLogger,
  transactionLogger,
  syncLogger,
  authLogger,
  supabaseLogger,
  uiLogger,
  redactSensitiveData,
  redactContext,
} from '@/services/logger';

describe('Logger Service (react-native-logs integration)', () => {
  let logSpy: jest.SpyInstance;
  let warnSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;
  let infoSpy: jest.SpyInstance;

  beforeEach(() => {
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    infoSpy = jest.spyOn(console, 'info').mockImplementation(() => {});
  });

  afterEach(() => {
    logger.disable();
    jest.restoreAllMocks();
  });

  it('exports all expected scoped loggers', () => {
    expect(logger).toBeDefined();
    expect(storeLogger).toBeDefined();
    expect(validatorLogger).toBeDefined();
    expect(transactionLogger).toBeDefined();
    expect(syncLogger).toBeDefined();
    expect(authLogger).toBeDefined();
    expect(supabaseLogger).toBeDefined();
    expect(uiLogger).toBeDefined();
  });

  it('does not log when logger is disabled', () => {
    logger.disable();
    logger.debug('test debug');
    logger.info('test info');
    logger.warn('test warn');
    logger.error('test error');

    expect(logSpy).not.toHaveBeenCalled();
    expect(warnSpy).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
    expect(infoSpy).not.toHaveBeenCalled();
  });

  it('logs when logger is enabled', () => {
    logger.enable();
    logger.debug('test debug');
    logger.info('test info');
    logger.warn('test warn');
    logger.error('test error');

    const anyConsoleCalled =
      logSpy.mock.calls.length > 0 ||
      warnSpy.mock.calls.length > 0 ||
      errorSpy.mock.calls.length > 0 ||
      infoSpy.mock.calls.length > 0;

    expect(anyConsoleCalled).toBe(true);
  });

  it('formats messages with extensions properly when enabled', () => {
    logger.enable();
    storeLogger.info('Store initialized');
    validatorLogger.warn('Validation issue detected');
    transactionLogger.info('Expense transaction recorded', { amount: 50 });
    syncLogger.info('Sync engine delta fetched');
    authLogger.info('User session refreshed');
    supabaseLogger.warn('Supabase retry attempt', { attempt: 2 });
    uiLogger.error('Rendering error', { component: 'ExpenseList' });

    const anyConsoleCalled =
      logSpy.mock.calls.length > 0 ||
      warnSpy.mock.calls.length > 0 ||
      errorSpy.mock.calls.length > 0 ||
      infoSpy.mock.calls.length > 0;

    expect(anyConsoleCalled).toBe(true);
  });

  it('handles logging with undefined or empty context', () => {
    logger.enable();
    expect(() => {
      storeLogger.info('Plain info message');
      storeLogger.debug('Plain debug message');
      storeLogger.warn('Plain warn message');
      storeLogger.error('Plain error message');
    }).not.toThrow();
  });

  it('handles errors passed directly as context', () => {
    logger.enable();
    const err = new Error('Test exception');
    expect(() => {
      logger.error('Caught an exception', err);
    }).not.toThrow();
  });

  it('initializes with production severity and async mode in production environment', async () => {
    const originalEnv = process.env.NODE_ENV;
    try {
      process.env.NODE_ENV = 'production';
      let prodLoggerModule: any;
      await jest.isolateModulesAsync(async () => {
        prodLoggerModule = await import('@/services/logger');
      });
      expect(prodLoggerModule.logger).toBeDefined();
      expect(prodLoggerModule.storeLogger).toBeDefined();
      expect(prodLoggerModule.uiLogger).toBeDefined();
    } finally {
      process.env.NODE_ENV = originalEnv;
    }
  });

  describe('redactSensitiveData and logger redaction pipeline', () => {
    it('masks sensitive keys including amount, merchant, email, token, notes, password', () => {
      const sensitiveContext = {
        id: 'tx_123',
        amount: 49.99,
        candidateAmount: 50.0,
        merchant: 'Grocery Outlet',
        candidateMerchant: 'Grocery Outlet LLC',
        merchant_name: 'Grocery Outlet',
        email: 'user@example.com',
        token: 'secret-token-xyz',
        notes: 'Personal transaction note',
        password: 'my-password-123',
        refreshToken: 'refresh-token-abc',
        accessToken: 'access-token-def',
        nonSensitiveProp: 'safe_value',
      };

      const result = redactSensitiveData(sensitiveContext);
      expect(result).toEqual({
        id: 'tx_123',
        amount: '[REDACTED]',
        candidateAmount: '[REDACTED]',
        merchant: '[REDACTED]',
        candidateMerchant: '[REDACTED]',
        merchant_name: '[REDACTED]',
        email: '[REDACTED]',
        token: '[REDACTED]',
        notes: '[REDACTED]',
        password: '[REDACTED]',
        refreshToken: '[REDACTED]',
        accessToken: '[REDACTED]',
        nonSensitiveProp: 'safe_value',
      });
      expect(redactContext(sensitiveContext)).toEqual(result);
    });

    it('redacts plaintext email addresses embedded within string messages', () => {
      const msg = 'User with email test.account+foo@domain.co.uk attempted login';
      const redacted = redactSensitiveData(msg);
      expect(redacted).toBe('User with email [REDACTED] attempted login');
    });

    it('recursively redacts nested objects and arrays', () => {
      const payload = {
        meta: {
          initiator: 'admin',
          financials: {
            amount: 1000,
            notes: 'Bonus payment',
          },
        },
        transactions: [
          { merchant: 'Shop 1', amount: 20 },
          { merchant: 'Shop 2', amount: 35 },
        ],
      };

      const redacted = redactSensitiveData(payload);
      expect(redacted).toEqual({
        meta: {
          initiator: 'admin',
          financials: {
            amount: '[REDACTED]',
            notes: '[REDACTED]',
          },
        },
        transactions: [
          { merchant: '[REDACTED]', amount: '[REDACTED]' },
          { merchant: '[REDACTED]', amount: '[REDACTED]' },
        ],
      });
    });

    it('handles circular references and Error instances safely', () => {
      const circular: any = { name: 'cycle' };
      circular.self = circular;
      const redacted = redactSensitiveData(circular);
      expect(redacted.self).toBe('[Circular Reference]');

      const err = new Error('Failure contacting server at support@company.org');
      const redactedErr = redactSensitiveData(err);
      expect(redactedErr.message).toBe('Failure contacting server at [REDACTED]');
    });

    it('redacts sensitive fields when logs are dispatched via enabled loggers', () => {
      logger.enable();
      transactionLogger.info('Expense created', {
        id: 'exp_999',
        amount: 88.5,
        merchant: 'Fine Dining Bistro',
      });
      authLogger.info('User authenticated', {
        email: 'confidential@household.org',
        token: 'supabase-session-token',
      });

      const loggedOutput = logSpy.mock.calls.map((call) => call.join(' ')).join('\n');
      expect(loggedOutput).not.toContain('88.5');
      expect(loggedOutput).not.toContain('Fine Dining Bistro');
      expect(loggedOutput).not.toContain('confidential@household.org');
      expect(loggedOutput).not.toContain('supabase-session-token');
      expect(loggedOutput).toContain('[REDACTED]');
      expect(loggedOutput).toContain('INFO');
    });
  });
});
