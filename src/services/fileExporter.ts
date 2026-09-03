import { Platform, Alert } from 'react-native';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { exportLogger } from '@/services/logger';

export type ExportMimeType = 'text/csv' | 'application/json';

/**
 * Cross-platform file exporter.
 * On Web: downloads via Blob URL.
 * On iOS/Android: writes to cache directory using expo-file-system and opens native share sheet with expo-sharing.
 */
export async function exportAndShareFile(
  content: string,
  fileName: string,
  mimeType: ExportMimeType = 'text/csv',
): Promise<boolean> {
  exportLogger.info('Starting file export', { fileName, mimeType, platform: Platform.OS });

  if (Platform.OS === 'web') {
    if (typeof document !== 'undefined') {
      const blob = new Blob([content], { type: `${mimeType};charset=utf-8;` });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      exportLogger.info('Web blob download completed', { fileName });
      return true;
    }
    exportLogger.warn('Web document object not found for file export');
    return false;
  }

  try {
    const file = new File(Paths.cache, fileName);
    if (file.exists) {
      file.delete();
    }
    file.create();
    file.write(content);

    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(file.uri, {
        mimeType,
        dialogTitle: `Export ${fileName}`,
        UTI: mimeType === 'text/csv' ? 'public.comma-separated-values-text' : 'public.json',
      });
      exportLogger.info('Native share sheet opened successfully', { fileName });
      return true;
    } else {
      exportLogger.warn('Native sharing unavailable on device');
      Alert.alert('Sharing Unavailable', 'Native sharing is not supported on this device.');
      return false;
    }
  } catch (error: any) {
    exportLogger.error('Failed to export file', error);
    Alert.alert('Export Error', error?.message || 'Failed to export file on this device.');
    return false;
  }
}
