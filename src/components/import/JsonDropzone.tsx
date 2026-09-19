import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Platform, ActivityIndicator } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import {
  Upload,
  FileJson,
  FileSpreadsheet,
  AlertCircle,
  ClipboardPaste,
} from 'lucide-react-native';
import { useTheme } from '@/theme';
import { useI18n } from '@/i18n';
import { RawExpenseReport } from '@/types';
import { reportValidator } from '@/services/validator';
import { jsonExtractor } from '@/services/jsonExtractor';
import { csvParser } from '@/services/csvParser';
import { importLogger } from '@/services/logger';

interface JsonDropzoneProps {
  onFileParsed: (report: RawExpenseReport, fileName: string) => void;
  onOpenPasteModal?: () => void;
}

export const JsonDropzone: React.FC<JsonDropzoneProps> = ({ onFileParsed, onOpenPasteModal }) => {
  const { theme, spacing, radius, typography } = useTheme();
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const processFileContent = (content: string, fileName: string) => {
    try {
      setErrorMessage(null);
      const isCsv = fileName.toLowerCase().endsWith('.csv');
      const isJson = fileName.toLowerCase().endsWith('.json');

      if (isCsv) {
        importLogger.info('Parsing uploaded CSV bank statement', { fileName });
        const result = csvParser.parse(content);
        if (!result.success || !result.data) {
          setErrorMessage(result.error || 'Failed to parse CSV bank statement');
          return;
        }
        onFileParsed(result.data, fileName);
        return;
      }

      if (isJson) {
        importLogger.info('Parsing uploaded JSON expense report', { fileName });
        const extracted = jsonExtractor.extract(content);
        if (!extracted.success || !extracted.data) {
          setErrorMessage(`JSON error: ${extracted.error || 'Invalid JSON format'}`);
          return;
        }

        const validationResult = reportValidator.validate(extracted.data);
        if (!validationResult.success || !validationResult.data) {
          setErrorMessage(
            `Validation error: ${validationResult.error || 'Invalid expense report format'}`,
          );
          return;
        }

        onFileParsed(validationResult.data, fileName);
        return;
      }

      // If extension is ambiguous (.txt or without extension), try JSON first then CSV
      const extracted = jsonExtractor.extract(content);
      if (extracted.success && extracted.data) {
        const validationResult = reportValidator.validate(extracted.data);
        if (validationResult.success && validationResult.data) {
          onFileParsed(validationResult.data, fileName);
          return;
        }
      }

      const csvResult = csvParser.parse(content);
      if (csvResult.success && csvResult.data) {
        onFileParsed(csvResult.data, fileName);
        return;
      }

      setErrorMessage(
        'Could not parse file as either a bank statement CSV or JSON expense report.',
      );
    } catch (e: any) {
      setErrorMessage(`Failed to process file: ${e.message}`);
    }
  };

  const handlePickDocument = async () => {
    try {
      setLoading(true);
      setErrorMessage(null);

      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/json',
          'text/json',
          'text/csv',
          'text/comma-separated-values',
          'application/vnd.ms-excel',
          'text/plain',
        ],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];

        if (Platform.OS === 'web') {
          if (file.file) {
            const text = await (file.file as any).text();
            processFileContent(text, file.name);
          } else {
            const response = await fetch(file.uri);
            const text = await response.text();
            processFileContent(text, file.name);
          }
        } else {
          const response = await fetch(file.uri);
          const text = await response.text();
          processFileContent(text, file.name);
        }
      }
    } catch (error: any) {
      setErrorMessage(error.message || 'Error picking file');
    } finally {
      setLoading(false);
    }
  };

  // HTML5 Drag and Drop handlers for Web
  const webDropProps =
    Platform.OS === 'web'
      ? {
          onDragOver: (e: any) => {
            e.preventDefault();
            e.stopPropagation();
            if (!isDragOver) setIsDragOver(true);
          },
          onDragLeave: (e: any) => {
            e.preventDefault();
            e.stopPropagation();
            setIsDragOver(false);
          },
          onDrop: async (e: any) => {
            e.preventDefault();
            e.stopPropagation();
            setIsDragOver(false);
            if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
              const file = e.dataTransfer.files[0];
              try {
                setLoading(true);
                const text = await file.text();
                processFileContent(text, file.name);
              } catch (err: any) {
                setErrorMessage(err.message || 'Error reading dropped file');
              } finally {
                setLoading(false);
              }
            }
          },
        }
      : {};

  return (
    <View style={{ gap: spacing.md }}>
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={handlePickDocument}
        disabled={loading}
        {...(webDropProps as any)}
        style={{
          borderWidth: 2,
          borderColor: errorMessage
            ? theme.colors.danger
            : isDragOver
              ? theme.colors.brand
              : theme.colors.borderTactile,
          borderStyle: 'dashed',
          borderRadius: radius.xl,
          padding: spacing.xl,
          backgroundColor: isDragOver ? theme.colors.brandLight : theme.colors.surfaceSubtle,
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 180,
        }}
      >
        <View
          style={{
            width: 60,
            height: 60,
            borderRadius: radius.full,
            backgroundColor: theme.colors.brandLight,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: spacing.md,
          }}
        >
          <Upload size={28} color={theme.colors.brand} />
        </View>

        <Text
          style={{
            color: theme.colors.textPrimary,
            fontSize: typography.fontSizes.lg,
            fontWeight: typography.fontWeights.bold,
            textAlign: 'center',
          }}
        >
          {t.import.dropzoneTitle}
        </Text>

        <Text
          style={{
            color: theme.colors.textSecondary,
            fontSize: typography.fontSizes.sm,
            textAlign: 'center',
            marginTop: spacing.xs,
            maxWidth: 340,
          }}
        >
          {t.import.dropzoneSubtitle}
        </Text>

        {/* Action Button */}
        <View
          pointerEvents="none"
          style={{
            marginTop: spacing.lg,
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: theme.colors.brand,
            paddingVertical: spacing.sm,
            paddingHorizontal: spacing.lg,
            borderRadius: radius.md,
            gap: spacing.xs,
          }}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <FileSpreadsheet size={18} color="#FFFFFF" />
              <FileJson size={18} color="#FFFFFF" />
              <Text
                style={{
                  color: '#FFFFFF',
                  fontWeight: typography.fontWeights.semibold,
                  fontSize: typography.fontSizes.sm,
                }}
              >
                {t.import.selectFile}
              </Text>
            </>
          )}
        </View>
      </TouchableOpacity>

      {onOpenPasteModal && (
        <TouchableOpacity
          onPress={onOpenPasteModal}
          activeOpacity={0.7}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: spacing.sm,
            paddingVertical: spacing.sm,
            backgroundColor: theme.colors.surface,
            borderRadius: radius.md,
            borderWidth: 1,
            borderColor: theme.colors.border,
          }}
        >
          <ClipboardPaste size={18} color={theme.colors.brand} />
          <Text
            style={{
              color: theme.colors.brand,
              fontWeight: typography.fontWeights.semibold,
              fontSize: typography.fontSizes.sm,
            }}
          >
            {t.import.pasteJsonTitle}
          </Text>
        </TouchableOpacity>
      )}

      {errorMessage && (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: theme.colors.dangerBg,
            padding: spacing.md,
            borderRadius: radius.md,
            gap: spacing.sm,
          }}
        >
          <AlertCircle size={20} color={theme.colors.danger} />
          <Text
            style={{
              color: theme.colors.danger,
              fontSize: typography.fontSizes.sm,
              flex: 1,
              fontWeight: typography.fontWeights.medium,
            }}
          >
            {errorMessage}
          </Text>
        </View>
      )}
    </View>
  );
};

export const FileDropzone = JsonDropzone;
