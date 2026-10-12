export const getRandomBytes = jest.fn((byteCount: number): Uint8Array => {
  const bytes = new Uint8Array(byteCount);
  if (typeof globalThis !== 'undefined' && globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < byteCount; i++) {
      bytes[i] = (Math.random() * 256) | 0;
    }
  }
  return bytes;
});

export const getRandomBytesAsync = jest.fn(async (byteCount: number): Promise<Uint8Array> => {
  return getRandomBytes(byteCount);
});

export const randomUUID = jest.fn((): string => {
  if (typeof globalThis !== 'undefined' && globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }
  return '00000000-0000-4000-8000-000000000000';
});
