import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView, SafeAreaView } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Sparkles, Copy, Check, Eye, X, ArrowRight, ClipboardPaste } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { useI18n } from '@/i18n';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { Badge } from '@/components/common/Badge';
import {
  generateBankStatementPrompt,
  normalizeCategories,
  PromptCategoryItem,
} from '@/services/aiPromptGenerator';

interface AiPromptCardProps {
  categories: (string | PromptCategoryItem)[];
  currency?: string;
  familyMembers?: string[];
  onOpenPasteModal?: () => void;
}

export const AiPromptCard: React.FC<AiPromptCardProps> = ({
  categories,
  currency = '€',
  familyMembers = [],
  onOpenPasteModal,
}) => {
  const { theme, spacing, radius, typography } = useTheme();
  const { t } = useI18n();

  const [copied, setCopied] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  // Normalized active categories (handles fallbacks when empty)
  const activeCategories = React.useMemo(() => {
    return normalizeCategories(categories);
  }, [categories]);

  // Generate dynamic prompt from active categories and household info
  const dynamicPrompt = React.useMemo(() => {
    return generateBankStatementPrompt({
      categories,
      currency,
      familyMembers,
    });
  }, [categories, currency, familyMembers]);

  const handleCopyPrompt = async () => {
    await Clipboard.setStringAsync(dynamicPrompt);
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
    }, 3000);
  };

  return (
    <Card
      padding="lg"
      style={{
        backgroundColor: theme.colors.card,
        borderColor: theme.colors.brand,
        borderWidth: 1.5,
        shadowColor: theme.colors.brand,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
      }}
    >
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.md,
          marginBottom: spacing.md,
        }}
      >
        <View
          style={{
            width: 48,
            height: 48,
            borderRadius: radius.lg,
            backgroundColor: theme.colors.brandLight,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Sparkles size={26} color={theme.colors.brand} />
        </View>

        <View style={{ flex: 1 }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Text
              style={{
                color: theme.colors.textPrimary,
                fontSize: typography.fontSizes.md,
                fontWeight: typography.fontWeights.heavy,
              }}
            >
              {t.import.aiPromptTitle}
            </Text>
            <Badge
              label={`$0 ${t.settings.localFirstBadge}`}
              color={theme.colors.success}
              size="sm"
            />
          </View>
          <Text
            style={{
              color: theme.colors.textSecondary,
              fontSize: typography.fontSizes.xs,
              marginTop: 2,
              lineHeight: 18,
            }}
          >
            {t.import.aiPromptSubtitle}
          </Text>
        </View>
      </View>

      {/* 3 Steps Guide */}
      <View
        style={{
          backgroundColor: theme.colors.surfaceSubtle,
          borderRadius: radius.md,
          padding: spacing.md,
          marginBottom: spacing.md,
          gap: spacing.sm,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <View
            style={{
              width: 22,
              height: 22,
              borderRadius: radius.full,
              backgroundColor: theme.colors.brand,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text
              style={{
                color: '#FFFFFF',
                fontSize: typography.fontSizes.xs,
                fontWeight: typography.fontWeights.bold,
              }}
            >
              1
            </Text>
          </View>
          <Text
            style={{
              color: theme.colors.textPrimary,
              fontSize: typography.fontSizes.xs,
              fontWeight: typography.fontWeights.semibold,
              flex: 1,
            }}
          >
            {t.import.step1Label} (
            {t.import.categoriesIncluded.replace('{count}', activeCategories.length.toString())})
          </Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <View
            style={{
              width: 22,
              height: 22,
              borderRadius: radius.full,
              backgroundColor: theme.colors.brand,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text
              style={{
                color: '#FFFFFF',
                fontSize: typography.fontSizes.xs,
                fontWeight: typography.fontWeights.bold,
              }}
            >
              2
            </Text>
          </View>
          <Text
            style={{
              color: theme.colors.textPrimary,
              fontSize: typography.fontSizes.xs,
              fontWeight: typography.fontWeights.semibold,
              flex: 1,
            }}
          >
            {t.import.step2Label}
          </Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <View
            style={{
              width: 22,
              height: 22,
              borderRadius: radius.full,
              backgroundColor: theme.colors.brand,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text
              style={{
                color: '#FFFFFF',
                fontSize: typography.fontSizes.xs,
                fontWeight: typography.fontWeights.bold,
              }}
            >
              3
            </Text>
          </View>
          <Text
            style={{
              color: theme.colors.textPrimary,
              fontSize: typography.fontSizes.xs,
              fontWeight: typography.fontWeights.semibold,
              flex: 1,
            }}
          >
            {t.import.step3Label}
          </Text>
        </View>
      </View>

      {/* Buttons */}
      <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xs }}>
        <Button
          title={copied ? t.import.promptCopied : t.import.copyPrompt}
          variant={copied ? 'secondary' : 'primary'}
          size="md"
          icon={
            copied ? (
              <Check size={18} color={theme.colors.success} />
            ) : (
              <Copy size={18} color="#FFFFFF" />
            )
          }
          onPress={handleCopyPrompt}
          style={{ flex: 1 }}
        />

        <Button
          title={t.import.viewPrompt}
          variant="outline"
          size="md"
          icon={<Eye size={18} color={theme.colors.textPrimary} />}
          onPress={() => setModalVisible(true)}
        />
      </View>

      {onOpenPasteModal && (
        <TouchableOpacity
          onPress={onOpenPasteModal}
          activeOpacity={0.7}
          accessibilityRole="button"
          style={{
            marginTop: spacing.sm,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: spacing.xs,
            paddingVertical: spacing.xs,
          }}
        >
          <ClipboardPaste size={14} color={theme.colors.brand} />
          <Text
            style={{
              color: theme.colors.brand,
              fontSize: typography.fontSizes.xs,
              fontWeight: typography.fontWeights.bold,
            }}
          >
            {t.import.pasteActionPrompt}
          </Text>
          <ArrowRight size={14} color={theme.colors.brand} />
        </TouchableOpacity>
      )}

      {/* Prompt Preview Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
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
                {t.import.promptModalTitle}
              </Text>
              <Text
                style={{
                  color: theme.colors.textSecondary,
                  fontSize: typography.fontSizes.xs,
                  marginTop: 2,
                }}
              >
                {t.import.promptModalSubtitle.replace(
                  '{count}',
                  activeCategories.length.toString(),
                )}
              </Text>
            </View>

            <TouchableOpacity
              onPress={() => setModalVisible(false)}
              accessibilityRole="button"
              accessibilityLabel={t.common.close}
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

          <ScrollView
            style={{ flex: 1, padding: spacing.lg }}
            contentContainerStyle={{ paddingBottom: spacing.xl }}
          >
            <View
              style={{
                backgroundColor: theme.colors.surfaceSubtle,
                borderRadius: radius.lg,
                padding: spacing.md,
                borderWidth: 1,
                borderColor: theme.colors.border,
              }}
            >
              <Text
                selectable
                style={{
                  color: theme.colors.textPrimary,
                  fontSize: typography.fontSizes.xs,
                  fontFamily: 'monospace',
                  lineHeight: 20,
                }}
              >
                {dynamicPrompt}
              </Text>
            </View>
          </ScrollView>

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
              title={copied ? t.import.promptCopied : t.import.copyPrompt}
              variant={copied ? 'secondary' : 'primary'}
              size="lg"
              icon={
                copied ? (
                  <Check size={20} color={theme.colors.success} />
                ) : (
                  <Copy size={20} color="#FFFFFF" />
                )
              }
              onPress={handleCopyPrompt}
              style={{ flex: 1 }}
            />
            <Button
              title={t.common.close}
              variant="outline"
              size="lg"
              onPress={() => setModalVisible(false)}
            />
          </View>
        </SafeAreaView>
      </Modal>
    </Card>
  );
};
