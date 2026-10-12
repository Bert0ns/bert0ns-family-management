import * as SecureStore from 'expo-secure-store';
import { ExpoSecureStoreAdapter, authStorage } from '@/services/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

describe('Secure Token Storage Adapter (ExpoSecureStoreAdapter)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('retrieves tokens from SecureStore via getItem', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('jwt-access-token-123');

    const result = await ExpoSecureStoreAdapter.getItem('sb-token-key');
    expect(result).toBe('jwt-access-token-123');
    expect(SecureStore.getItemAsync).toHaveBeenCalledWith('sb-token-key');
  });

  it('handles SecureStore getItem exceptions gracefully and returns null', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockRejectedValue(new Error('Keychain locked'));

    const result = await ExpoSecureStoreAdapter.getItem('sb-token-key');
    expect(result).toBeNull();
  });

  it('stores tokens in SecureStore via setItem', async () => {
    (SecureStore.setItemAsync as jest.Mock).mockResolvedValue(undefined);

    await ExpoSecureStoreAdapter.setItem('sb-token-key', 'secret-val');
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('sb-token-key', 'secret-val');
  });

  it('handles SecureStore setItem exceptions gracefully without throwing', async () => {
    (SecureStore.setItemAsync as jest.Mock).mockRejectedValue(
      new Error('Hardware keystore unavailable'),
    );

    await expect(
      ExpoSecureStoreAdapter.setItem('sb-token-key', 'secret-val'),
    ).resolves.not.toThrow();
  });

  it('deletes tokens from SecureStore via removeItem', async () => {
    (SecureStore.deleteItemAsync as jest.Mock).mockResolvedValue(undefined);

    await ExpoSecureStoreAdapter.removeItem('sb-token-key');
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('sb-token-key');
  });

  it('handles SecureStore removeItem exceptions gracefully without throwing', async () => {
    (SecureStore.deleteItemAsync as jest.Mock).mockRejectedValue(new Error('Entry not found'));

    await expect(ExpoSecureStoreAdapter.removeItem('sb-token-key')).resolves.not.toThrow();
  });

  it('selects storage adapter based on platform', () => {
    if (Platform.OS === 'web') {
      expect(authStorage).toBe(AsyncStorage);
    } else {
      expect(authStorage).toBe(ExpoSecureStoreAdapter);
    }
  });
});
