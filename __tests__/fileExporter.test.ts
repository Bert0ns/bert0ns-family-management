import { Platform, Alert } from 'react-native';
import { exportAndShareFile } from '@/services/fileExporter';
import * as Sharing from 'expo-sharing';

const mockFileInstance = {
  exists: true,
  create: jest.fn(),
  write: jest.fn(),
  delete: jest.fn(),
  uri: 'file:///cache/test-export.csv',
};

jest.mock('expo-file-system', () => {
  return {
    Paths: {
      cache: 'file:///cache',
    },
    File: jest.fn().mockImplementation(() => mockFileInstance),
  };
});

jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn(),
  shareAsync: jest.fn(),
}));

describe('fileExporter (exportAndShareFile)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFileInstance.exists = true;
  });

  describe('Web platform export', () => {
    let originalOS: string;
    let originalDocument: any;
    let originalURL: any;

    beforeEach(() => {
      originalOS = Platform.OS;
      (Platform as any).OS = 'web';
      originalDocument = (globalThis as any).document;
      originalURL = (globalThis as any).URL;
    });

    afterEach(() => {
      (Platform as any).OS = originalOS;
      (globalThis as any).document = originalDocument;
      (globalThis as any).URL = originalURL;
    });

    it('triggers web blob download and cleans up URL and DOM elements', async () => {
      const mockClick = jest.fn();
      const mockAppendChild = jest.fn();
      const mockRemoveChild = jest.fn();
      const mockSetAttribute = jest.fn();

      const mockLink = {
        href: '',
        setAttribute: mockSetAttribute,
        click: mockClick,
      };

      (globalThis as any).document = {
        createElement: jest.fn().mockReturnValue(mockLink),
        body: {
          appendChild: mockAppendChild,
          removeChild: mockRemoveChild,
          contains: jest.fn().mockReturnValue(true),
        },
      };

      const mockRevoke = jest.fn();
      (globalThis as any).URL = {
        createObjectURL: jest.fn().mockReturnValue('blob:http://localhost/123'),
        revokeObjectURL: mockRevoke,
      };

      jest.useFakeTimers();

      const success = await exportAndShareFile('col1,col2\nval1,val2', 'test.csv', 'text/csv');
      expect(success).toBe(true);
      expect(mockAppendChild).toHaveBeenCalledWith(mockLink);
      expect(mockClick).toHaveBeenCalled();
      expect(mockSetAttribute).toHaveBeenCalledWith('download', 'test.csv');

      jest.runAllTimers();
      expect(mockRemoveChild).toHaveBeenCalledWith(mockLink);
      expect(mockRevoke).toHaveBeenCalledWith('blob:http://localhost/123');

      jest.useRealTimers();
    });

    it('returns false when document is undefined on web', async () => {
      delete (globalThis as any).document;
      const success = await exportAndShareFile('data', 'test.csv');
      expect(success).toBe(false);
    });
  });

  describe('Native platform export (iOS / Android)', () => {
    let originalOS: string;

    beforeEach(() => {
      originalOS = Platform.OS;
      (Platform as any).OS = 'ios';
      jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    });

    afterEach(() => {
      (Platform as any).OS = originalOS;
      jest.restoreAllMocks();
    });

    it('writes file, shares via Sharing.shareAsync, and purges file in finally on success', async () => {
      (Sharing.isAvailableAsync as jest.Mock).mockResolvedValue(true);
      (Sharing.shareAsync as jest.Mock).mockResolvedValue(undefined);

      const success = await exportAndShareFile('test,content', 'test-export.csv', 'text/csv');
      expect(success).toBe(true);
      expect(mockFileInstance.create).toHaveBeenCalled();
      expect(mockFileInstance.write).toHaveBeenCalledWith('test,content');
      expect(Sharing.shareAsync).toHaveBeenCalledWith(mockFileInstance.uri, {
        mimeType: 'text/csv',
        dialogTitle: 'Export test-export.csv',
        UTI: 'public.comma-separated-values-text',
      });
      // Verifies file is deleted in finally, leaving zero lingering files in cache
      expect(mockFileInstance.delete).toHaveBeenCalled();
    });

    it('deletes temporary file in finally when Sharing is unavailable on device', async () => {
      (Sharing.isAvailableAsync as jest.Mock).mockResolvedValue(false);

      const success = await exportAndShareFile('{}', 'test.json', 'application/json', true);
      expect(success).toBe(false);
      expect(Alert.alert).toHaveBeenCalledWith(
        'Sharing Unavailable',
        'Native sharing is not supported on this device.',
      );
      // Ensures cache cleanup even when sharing is unavailable
      expect(mockFileInstance.delete).toHaveBeenCalled();
    });

    it('deletes temporary file in finally when Sharing.shareAsync throws an exception', async () => {
      (Sharing.isAvailableAsync as jest.Mock).mockResolvedValue(true);
      (Sharing.shareAsync as jest.Mock).mockRejectedValue(new Error('Sharing dismissed or failed'));

      const success = await exportAndShareFile('csv', 'test.csv', 'text/csv', true);
      expect(success).toBe(false);
      expect(Alert.alert).toHaveBeenCalledWith('Export Error', 'Sharing dismissed or failed');
      // Ensures cache cleanup occurred despite caught error
      expect(mockFileInstance.delete).toHaveBeenCalled();
    });
  });
});
