import { logger, storeLogger, validatorLogger } from '@/services/logger';

describe('Logger Service (react-native-logs integration)', () => {
  const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  const infoSpy = jest.spyOn(console, 'info').mockImplementation(() => {});

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    logSpy.mockRestore();
    warnSpy.mockRestore();
    errorSpy.mockRestore();
    infoSpy.mockRestore();
  });

  it('does not log when logger is disabled', () => {
    logger.disable();
    logger.log('test log');
    logger.warn('test warn');
    logger.error('test error');

    expect(logSpy).not.toHaveBeenCalled();
    expect(warnSpy).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
    expect(infoSpy).not.toHaveBeenCalled();
  });

  it('logs when logger is enabled', () => {
    logger.enable();
    logger.log('test log');
    logger.warn('test warn');
    logger.error('test error');

    const anyConsoleCalled =
      logSpy.mock.calls.length > 0 ||
      warnSpy.mock.calls.length > 0 ||
      errorSpy.mock.calls.length > 0 ||
      infoSpy.mock.calls.length > 0;

    expect(anyConsoleCalled).toBe(true);

    // Disable again to prevent polluting other test output
    logger.disable();
  });

  it('formats messages with extensions properly when enabled', () => {
    logger.enable();
    storeLogger.info('Store initialized');
    validatorLogger.warn('Validation issue detected');

    const anyConsoleCalled =
      logSpy.mock.calls.length > 0 ||
      warnSpy.mock.calls.length > 0 ||
      errorSpy.mock.calls.length > 0 ||
      infoSpy.mock.calls.length > 0;

    expect(anyConsoleCalled).toBe(true);

    logger.disable();
  });
});
