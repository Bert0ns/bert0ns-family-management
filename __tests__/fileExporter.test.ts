import { Platform, Alert } from 'react-native';
import { exportAndShareFile } from '@/services/fileExporter';
import * as Sharing from 'expo-sharing';
import { File } from 'expo-file-system';

const mockDelete = jest.fn();
const mockCreate = jest.fn();
const mockWrite = jest.fn();
let mockFileExists = false;

jest.mock('expo-file-system', () => ({
  Paths: {
    cache: {
      uri: 'file:///mock/cache/',
    },
  },
  File: jest.fn().mockImplementation((_dir: any, name: string) => ({
    uri: `file:///mock/cache/${name}`,
    get exists() {
      return mockFileExists;
    },
    delete: mockDelete,
    create: mockCreate,
    write: mockWrite,
  })),
}));

jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn(),
  shareAsync: jest.fn(),
}));

describe('fileExporter (exportAndShareFile)', () => {
  const originalPlatform = Platform.OS;

  beforeEach(() => {
    jest.clearAllMocks();
    mockFileExists = false;
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  afterEach(() => {
    Platform.OS = originalPlatform;
    delete (globalThis as any).document;
    delete (globalThis as any).Blob;
    delete (globalThis as any).URL;
  });

  describe('Web Platform', () => {
    beforeEach(() => {
      Platform.OS = 'web';
    });

    it('exports CSV file with UTF-8 BOM, triggers link click, and revokes URL', async () => {
      let createdBlobContent: any[] = [];
      let createdBlobOptions: any = {};

      const clickMock = jest.fn();
      const appendMock = jest.fn();
      const removeMock = jest.fn();
      const setAttributeMock = jest.fn();

      const mockLink = {
        href: '',
        setAttribute: setAttributeMock,
        click: clickMock,
      };

      (globalThis as any).document = {
        createElement: jest.fn(() => mockLink),
        body: {
          appendChild: appendMock,
          removeChild: removeMock,
          contains: jest.fn().mockReturnValue(true),
        },
      };

      (globalThis as any).Blob = jest.fn((content, options) => {
        createdBlobContent = content;
        createdBlobOptions = options;
        return { content, options };
      });

      (globalThis as any).URL = {
        createObjectURL: jest.fn(() => 'blob://test-csv-url'),
        revokeObjectURL: jest.fn(),
      };

      const csvData = 'Merchant,Amount\nSupermercato €10, àèì';
      const result = await exportAndShareFile(csvData, 'expenses.csv', 'text/csv');

      expect(result).toBe(true);
      expect(createdBlobContent[0]).toBe(`\uFEFF${csvData}`);
      expect(createdBlobOptions.type).toBe('text/csv;charset=utf-8;');
      expect(setAttributeMock).toHaveBeenCalledWith('download', 'expenses.csv');
      expect(clickMock).toHaveBeenCalled();
    });

    it('does not duplicate UTF-8 BOM if already present in CSV content', async () => {
      let createdBlobContent: any[] = [];

      (globalThis as any).document = {
        createElement: jest.fn(() => ({
          setAttribute: jest.fn(),
          click: jest.fn(),
        })),
        body: {
          appendChild: jest.fn(),
          removeChild: jest.fn(),
          contains: jest.fn().mockReturnValue(true),
        },
      };

      (globalThis as any).Blob = jest.fn((content) => {
        createdBlobContent = content;
        return { content };
      });

      (globalThis as any).URL = {
        createObjectURL: jest.fn(() => 'blob://test-url'),
        revokeObjectURL: jest.fn(),
      };

      const csvWithBom = `\uFEFFMerchant,Amount\nTest,10.00`;
      const result = await exportAndShareFile(csvWithBom, 'expenses.csv', 'text/csv');

      expect(result).toBe(true);
      expect(createdBlobContent[0]).toBe(csvWithBom);
      expect(createdBlobContent[0].startsWith('\uFEFF\uFEFF')).toBe(false);
    });

    it('does not prepend UTF-8 BOM to JSON export files', async () => {
      let createdBlobContent: any[] = [];

      (globalThis as any).document = {
        createElement: jest.fn(() => ({
          setAttribute: jest.fn(),
          click: jest.fn(),
        })),
        body: {
          appendChild: jest.fn(),
          removeChild: jest.fn(),
          contains: jest.fn().mockReturnValue(true),
        },
      };

      (globalThis as any).Blob = jest.fn((content) => {
        createdBlobContent = content;
        return { content };
      });

      (globalThis as any).URL = {
        createObjectURL: jest.fn(() => 'blob://test-url'),
        revokeObjectURL: jest.fn(),
      };

      const jsonString = '{"expenses": []}';
      const result = await exportAndShareFile(jsonString, 'expenses.json', 'application/json');

      expect(result).toBe(true);
      expect(createdBlobContent[0]).toBe(jsonString);
      expect(createdBlobContent[0].startsWith('\uFEFF')).toBe(false);
    });

    it('returns false when document object is undefined on web', async () => {
      (globalThis as any).document = undefined;
      const result = await exportAndShareFile('content', 'file.csv', 'text/csv');
      expect(result).toBe(false);
    });

    it('cleans up object URL and DOM element after download', async () => {
      const removeMock = jest.fn();
      const revokeMock = jest.fn();

      const mockLink = {
        href: '',
        setAttribute: jest.fn(),
        click: jest.fn(),
      };

      (globalThis as any).document = {
        createElement: jest.fn(() => mockLink),
        body: {
          appendChild: jest.fn(),
          removeChild: removeMock,
          contains: jest.fn().mockReturnValue(true),
        },
      };

      (globalThis as any).Blob = jest.fn(() => ({}));
      (globalThis as any).URL = {
        createObjectURL: jest.fn(() => 'blob://test-url'),
        revokeObjectURL: revokeMock,
      };

      await exportAndShareFile('content', 'file.csv', 'text/csv');

      await new Promise((resolve) => setTimeout(resolve, 150));

      expect(removeMock).toHaveBeenCalledWith(mockLink);
      expect(revokeMock).toHaveBeenCalledWith('blob://test-url');
    });
  });

  describe('Native Platform (iOS / Android)', () => {
    beforeEach(() => {
      Platform.OS = 'ios';
      (Sharing.isAvailableAsync as jest.Mock).mockResolvedValue(true);
      (Sharing.shareAsync as jest.Mock).mockResolvedValue(undefined);
    });

    it('writes CSV with UTF-8 BOM to file cache and opens native share sheet', async () => {
      const csvData = 'Merchant,Amount\nEsselunga €50,40';
      const result = await exportAndShareFile(csvData, 'report.csv', 'text/csv');

      expect(result).toBe(true);
      expect(File).toHaveBeenCalled();
      expect(mockCreate).toHaveBeenCalled();
      expect(mockWrite).toHaveBeenCalledWith(`\uFEFF${csvData}`);
      expect(Sharing.shareAsync).toHaveBeenCalledWith('file:///mock/cache/report.csv', {
        mimeType: 'text/csv',
        dialogTitle: 'Export report.csv',
        UTI: 'public.comma-separated-values-text',
      });
    });

    it('writes JSON without BOM to file cache and opens native share sheet with json UTI', async () => {
      const jsonContent = '{"family": "Rossi"}';
      const result = await exportAndShareFile(jsonContent, 'data.json', 'application/json');

      expect(result).toBe(true);
      expect(mockWrite).toHaveBeenCalledWith(jsonContent);
      expect(Sharing.shareAsync).toHaveBeenCalledWith('file:///mock/cache/data.json', {
        mimeType: 'application/json',
        dialogTitle: 'Export data.json',
        UTI: 'public.json',
      });
    });

    it('deletes pre-existing file in cache before creating a new one', async () => {
      mockFileExists = true;
      await exportAndShareFile('data', 'test.csv', 'text/csv');

      expect(mockDelete).toHaveBeenCalled();
      expect(mockCreate).toHaveBeenCalled();
    });

    it('handles unavailable native sharing by alerting the user when requested', async () => {
      (Sharing.isAvailableAsync as jest.Mock).mockResolvedValue(false);

      const result = await exportAndShareFile('data', 'test.csv', 'text/csv', true);

      expect(result).toBe(false);
      expect(Alert.alert).toHaveBeenCalledWith(
        'Sharing Unavailable',
        'Native sharing is not supported on this device.',
      );
    });

    it('suppresses alert when native sharing is unavailable and showAlertOnFailure is false', async () => {
      (Sharing.isAvailableAsync as jest.Mock).mockResolvedValue(false);

      const result = await exportAndShareFile('data', 'test.csv', 'text/csv', false);

      expect(result).toBe(false);
      expect(Alert.alert).not.toHaveBeenCalled();
    });

    it('catches and handles write/share exceptions gracefully and deletes failed file', async () => {
      mockWrite.mockImplementationOnce(() => {
        mockFileExists = true;
        throw new Error('Disk full write failure');
      });

      const result = await exportAndShareFile('data', 'test.csv', 'text/csv', true);

      expect(result).toBe(false);
      expect(Alert.alert).toHaveBeenCalledWith('Export Error', 'Disk full write failure');
      expect(mockDelete).toHaveBeenCalled();
    });

    it('sanitizes filename to prevent directory traversal in file path', async () => {
      await exportAndShareFile('data', '../../dangerous/path/report.csv', 'text/csv');

      expect(File).toHaveBeenCalledWith(expect.anything(), '____dangerous_path_report.csv');
    });

    it('cleans up temporary file in finally block after sharing succeeds or fails (cache cleanup)', async () => {
      mockFileExists = true;
      const result = await exportAndShareFile('data', 'test.csv', 'text/csv');
      expect(result).toBe(true);
      expect(mockDelete).toHaveBeenCalled();
    });
  });
});
