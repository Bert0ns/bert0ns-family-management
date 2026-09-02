import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Alert } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { Upload, FileJson, AlertCircle, CheckCircle2 } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { RawExpenseReport } from '@/types';
import { reportValidator } from '@/services/validator';
import { Button } from '@/components/common/Button';

interface JsonDropzoneProps {
  onFileParsed: (report: RawExpenseReport, fileName: string) => void;
}

export const JsonDropzone: React.FC<JsonDropzoneProps> = ({ onFileParsed }) => {
  const { theme, spacing, radius, typography } = useTheme();
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const processJsonText = (jsonString: string, fileName: string) => {
    try {
      setErrorMessage(null);
      const rawData = JSON.parse(jsonString);
      const validationResult = reportValidator.validate(rawData);

      if (!validationResult.success || !validationResult.data) {
        setErrorMessage(`Validation error: ${validationResult.error || 'Invalid JSON format'}`);
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
          // On Web, file.file or fetch URI
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
          Upload JSON Expense Report
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
          Select or drop a valid structured .json statement to immediately extract and index
          expenses.
        </Text>

        <View style={{ marginTop: spacing.lg }}>
          <Button
            title="Browse Files"
            icon={<FileJson size={18} color="#FFFFFF" />}
            onPress={handlePickDocument}
            loading={loading}
          />
        </View>
      </TouchableOpacity>

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
