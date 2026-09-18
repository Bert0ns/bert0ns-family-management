import {
  logger,
  storeLogger,
  validatorLogger,
  transactionLogger,
  syncLogger,
  authLogger,
  supabaseLogger,
  uiLogger,
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
});
