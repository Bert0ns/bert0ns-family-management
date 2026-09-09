import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { X, ClipboardPaste, Check, AlertCircle, Trash2 } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { useI18n } from '@/i18n';
import { Button } from '@/components/common/Button';
import { jsonExtractor } from '@/services/jsonExtractor';
import { reportValidator } from '@/services/validator';
import { RawExpenseReport } from '@/types';

interface PasteJsonModalProps {
  visible: boolean;
  onClose: () => void;
  onReportParsed: (report: RawExpenseReport, sourceName: string) => void;
}

export const PasteJsonModal: React.FC<PasteJsonModalProps> = ({
  visible,
  onClose,
  onReportParsed,
}) => {
  const { theme, spacing, radius, typography } = useTheme();
  const { t } = useI18n();

  const [jsonText, setJsonText] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);

  const handleClear = () => {
    setJsonText('');
    setErrorMessage(null);
  };

  const handlePasteFromClipboard = async () => {
    try {
      const text = await Clipboard.getStringAsync();
      if (text && text.trim().length > 0) {
        setJsonText(text);
        setErrorMessage(null);
      }
    } catch {
      // Ignored if clipboard read fails
    }
  };

  const handleParseAndStage = () => {
    if (!jsonText.trim()) {
      setErrorMessage(t.import.pasteJsonPlaceholder);
      return;
    }

    setParsing(true);
    setErrorMessage(null);

    try {
      // 1. Extract JSON (strips markdown codeblocks & conversational text)
      const extractResult = jsonExtractor.extract(jsonText);
      if (!extractResult.success || !extractResult.data) {
        setErrorMessage(extractResult.error || 'Invalid JSON format');
        setParsing(false);
        return;
      }

      // 2. Validate against Zod Expense Report Schema
      const validation = reportValidator.validate(extractResult.data);
      if (!validation.success || !validation.data) {
        setErrorMessage(
          `Validation error: ${validation.error || 'Report does not match expected schema'}`,
        );
        setParsing(false);
        return;
      }

      // 3. Success -> Send to preview modal
      onReportParsed(validation.data, 'AI Statement (Pasted JSON)');
      setJsonText('');
      setErrorMessage(null);
      onClose();
    } catch (e: any) {
      setErrorMessage(`Parsing error: ${e.message}`);
    } finally {
      setParsing(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          {/* Header */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: spacing.lg,
              borderBottomWidth: 1,
              borderBottomColor: theme.colors.border,
            }}
          >
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  color: theme.colors.textPrimary,
                  fontSize: typography.fontSizes.lg,
                  fontWeight: typography.fontWeights.bold,
                }}
              >
                {t.import.pasteJsonTitle}
              </Text>
              <Text
                style={{
                  color: theme.colors.textSecondary,
                  fontSize: typography.fontSizes.xs,
                  marginTop: 2,
                }}
              >
                {t.import.pasteJsonSubtitle}
              </Text>
            </View>

            <TouchableOpacity
              onPress={onClose}
              style={{
                width: 36,
                height: 36,
                borderRadius: radius.full,
                backgroundColor: theme.colors.surfaceSubtle,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <X size={20} color={theme.colors.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Body */}
          <ScrollView
            style={{ flex: 1, padding: spacing.lg }}
            contentContainerStyle={{ paddingBottom: spacing.xl }}
            keyboardShouldPersistTaps="handled"
          >
            {/* Quick Actions Bar */}
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: spacing.sm,
              }}
            >
              <TouchableOpacity
                onPress={handlePasteFromClipboard}
                activeOpacity={0.7}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing.xs,
                  backgroundColor: theme.colors.brandLight,
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.xs + 2,
                  borderRadius: radius.md,
                }}
              >
                <ClipboardPaste size={16} color={theme.colors.brand} />
                <Text
                  style={{
                    color: theme.colors.brand,
                    fontSize: typography.fontSizes.xs,
                    fontWeight: typography.fontWeights.semibold,
                  }}
                >
                  {t.import.pasteFromClipboard}
                </Text>
              </TouchableOpacity>

              {jsonText.length > 0 && (
                <TouchableOpacity
                  onPress={handleClear}
                  activeOpacity={0.7}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 4,
                    paddingHorizontal: spacing.sm,
                    paddingVertical: spacing.xs,
                  }}
                >
                  <Trash2 size={14} color={theme.colors.textSecondary} />
                  <Text
                    style={{
                      color: theme.colors.textSecondary,
                      fontSize: typography.fontSizes.xs,
                    }}
                  >
                    Clear
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Multiline Text Input */}
            <View
              style={{
                borderWidth: 1.5,
                borderColor: errorMessage ? theme.colors.danger : theme.colors.border,
                borderRadius: radius.lg,
                backgroundColor: theme.colors.surface,
                minHeight: 280,
                padding: spacing.md,
              }}
            >
              <TextInput
                multiline
                numberOfLines={14}
                value={jsonText}
                onChangeText={(text) => {
                  setJsonText(text);
                  if (errorMessage) setErrorMessage(null);
                }}
                placeholder={t.import.pasteJsonPlaceholder}
                placeholderTextColor={theme.colors.textSecondary}
                style={{
                  color: theme.colors.textPrimary,
                  fontSize: typography.fontSizes.sm,
                  fontFamily: 'monospace',
                  textAlignVertical: 'top',
                  flex: 1,
                  minHeight: 260,
                }}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {/* Error Message */}
            {errorMessage && (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: theme.colors.dangerBg,
                  padding: spacing.md,
                  borderRadius: radius.md,
                  gap: spacing.sm,
                  marginTop: spacing.md,
                }}
              >
                <AlertCircle size={20} color={theme.colors.danger} />
                <Text
                  style={{
                    color: theme.colors.danger,
                    fontSize: typography.fontSizes.xs,
                    flex: 1,
                    fontWeight: typography.fontWeights.medium,
                  }}
                >
                  {errorMessage}
                </Text>
              </View>
            )}
          </ScrollView>

          {/* Footer */}
          <View
            style={{
              padding: spacing.lg,
              borderTopWidth: 1,
              borderTopColor: theme.colors.border,
              backgroundColor: theme.colors.surface,
              flexDirection: 'row',
              gap: spacing.sm,
            }}
          >
            <Button
              title={parsing ? 'Parsing...' : t.import.pasteJsonButton}
              variant="primary"
              size="lg"
              disabled={parsing || jsonText.trim().length === 0}
              icon={
                parsing ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Check size={20} color="#FFFFFF" />
                )
              }
              onPress={handleParseAndStage}
              style={{ flex: 1 }}
            />
            <Button title={t.common.cancel} variant="outline" size="lg" onPress={onClose} />
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
};
