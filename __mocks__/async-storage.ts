const store = new Map<string, string>();

const asyncStorageMock = {
  getItem: jest.fn(async (key: string): Promise<string | null> => {
    return store.has(key) ? store.get(key)! : null;
  }),
  setItem: jest.fn(async (key: string, value: string): Promise<void> => {
    store.set(key, value);
  }),
  removeItem: jest.fn(async (key: string): Promise<void> => {
    store.delete(key);
  }),
  getMany: jest.fn(async (keys: string[]): Promise<Record<string, string | null>> => {
    const res: Record<string, string | null> = {};
    for (const key of keys) {
      res[key] = store.has(key) ? store.get(key)! : null;
    }
    return res;
  }),
  setMany: jest.fn(async (entries: Record<string, string>): Promise<void> => {
    for (const [key, val] of Object.entries(entries)) {
      store.set(key, val);
    }
  }),
  removeMany: jest.fn(async (keys: string[]): Promise<void> => {
    for (const key of keys) {
      store.delete(key);
    }
  }),
  getAllKeys: jest.fn(async (): Promise<string[]> => {
    return Array.from(store.keys());
  }),
  clear: jest.fn(async (): Promise<void> => {
    store.clear();
  }),
  // Backward compatibility aliases if needed
  multiGet: jest.fn(async (keys: string[]): Promise<[string, string | null][]> => {
    return keys.map((key) => [key, store.get(key) ?? null]);
  }),
  multiSet: jest.fn(async (keyValuePairs: [string, string][]): Promise<void> => {
    for (const [key, val] of keyValuePairs) {
      store.set(key, val);
    }
  }),
  multiRemove: jest.fn(async (keys: string[]): Promise<void> => {
    for (const key of keys) {
      store.delete(key);
    }
  }),
  flushGetRequests: jest.fn(),
  __resetMockStore: (): void => {
    store.clear();
  },
};

export default asyncStorageMock;
