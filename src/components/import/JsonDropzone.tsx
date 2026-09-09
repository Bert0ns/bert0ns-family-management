import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Platform, ActivityIndicator } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { Upload, FileJson, AlertCircle, ClipboardPaste } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { useI18n } from '@/i18n';
import { RawExpenseReport } from '@/types';
import { reportValidator } from '@/services/validator';
import { jsonExtractor } from '@/services/jsonExtractor';

interface JsonDropzoneProps {
  onFileParsed: (report: RawExpenseReport, fileName: string) => void;
  onOpenPasteModal?: () => void;
}

export const JsonDropzone: React.FC<JsonDropzoneProps> = ({ onFileParsed, onOpenPasteModal }) => {
  const { theme, spacing, radius, typography } = useTheme();
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const processJsonText = (jsonString: string, fileName: string) => {
    try {
      setErrorMessage(null);
      // Use resilient jsonExtractor to clean markdown blocks or preambles
      const extracted = jsonExtractor.extract(jsonString);
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
    } catch (e: any) {
      setErrorMessage(`Failed to parse JSON: ${e.message}`);
    }
  };

  const handlePickDocument = async () => {
    try {
      setLoading(true);
      setErrorMessage(null);

      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/json', 'text/json', 'text/plain'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];

        if (Platform.OS === 'web') {
          if (file.file) {
            const text = await (file.file as any).text();
            processJsonText(text, file.name);
          } else {
            const response = await fetch(file.uri);
            const text = await response.text();
            processJsonText(text, file.name);
          }
        } else {
          const response = await fetch(file.uri);
          const text = await response.text();
          processJsonText(text, file.name);
        }
      }
    } catch (error: any) {
      setErrorMessage(error.message || 'Error picking file');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ gap: spacing.md }}>
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={handlePickDocument}
        disabled={loading}
        style={{
          borderWidth: 2,
          borderColor: errorMessage ? theme.colors.danger : theme.colors.brand,
          borderStyle: 'dashed',
          borderRadius: radius.xl,
          padding: spacing.xl,
          backgroundColor: theme.colors.surfaceSubtle,
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
            maxWidth: 320,
          }}
        >
          {t.import.dropzoneSubtitle}
        </Text>

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
              <FileJson size={18} color="#FFFFFF" />
              <Text
                style={{
                  color: '#FFFFFF',
                  fontWeight: typography.fontWeights.semibold,
                  fontSize: typography.fontSizes.sm,
                }}
              >
                {t.import.selectJsonFile}
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
