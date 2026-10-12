import { Platform, Alert } from 'react-native';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { exportLogger } from '@/services/logger';

export type ExportMimeType = 'text/csv' | 'application/json';

/**
 * Cross-platform file exporter.
 * On Web: downloads via Blob URL and promptly revokes the object URL.
 * On iOS/Android: writes to cache directory using expo-file-system and opens native share sheet with expo-sharing.
 */
export async function exportAndShareFile(
  content: string,
  fileName: string,
  mimeType: ExportMimeType = 'text/csv',
  showAlertOnFailure: boolean = true,
): Promise<boolean> {
  exportLogger.info('Starting file export', { fileName, mimeType, platform: Platform.OS });

  // Sanitize filename to prevent directory traversal or invalid characters
  const sanitizedFileName = fileName.replace(/[/\\?%*:|"<>]/g, '_').replace(/\.\.+/g, '_');

  // Prepend UTF-8 BOM to CSV export strings so currency symbols (€) and Italian accents display correctly in Microsoft Excel
  const fileContent =
    mimeType === 'text/csv' && !content.startsWith('\uFEFF') ? `\uFEFF${content}` : content;

  if (Platform.OS === 'web') {
    if (typeof document !== 'undefined') {
      const blob = new Blob([fileContent], { type: `${mimeType};charset=utf-8;` });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', sanitizedFileName);
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        if (document.body.contains(link)) {
          document.body.removeChild(link);
        }
        if (typeof URL.revokeObjectURL === 'function') {
          URL.revokeObjectURL(url);
        }
      }, 100);
      exportLogger.info('Web blob download completed', { fileName: sanitizedFileName });
      return true;
    }
    exportLogger.warn('Web document object not found for file export');
    return false;
  }

  let file: File | undefined;
  try {
    file = new File(Paths.cache, sanitizedFileName);
    if (file.exists) {
      file.delete();
    }
    file.create();
    file.write(fileContent);

    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(file.uri, {
        mimeType,
        dialogTitle: `Export ${sanitizedFileName}`,
        UTI: mimeType === 'text/csv' ? 'public.comma-separated-values-text' : 'public.json',
      });
      exportLogger.info('Native share sheet opened successfully', { fileName: sanitizedFileName });
      return true;
    } else {
      exportLogger.warn('Native sharing unavailable on device');
      if (showAlertOnFailure) {
        Alert.alert('Sharing Unavailable', 'Native sharing is not supported on this device.');
      }
      return false;
    }
  } catch (error: any) {
    exportLogger.error('Failed to export file', error);
    if (showAlertOnFailure) {
      Alert.alert('Export Error', error?.message || 'Failed to export file on this device.');
    }
    return false;
  } finally {
    if (file && file.exists) {
      try {
        file.delete();
        exportLogger.debug('Temporary export file cleaned up from cache', { fileName });
      } catch (cleanupErr: any) {
        exportLogger.warn('Failed to delete temporary export file', { error: cleanupErr?.message });
      }
    }
  }
}
