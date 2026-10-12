import React, { useMemo } from 'react';
import { View, Text, Modal, ScrollView, TouchableOpacity, useWindowDimensions } from 'react-native';
import { X, CheckCircle2, AlertTriangle } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { useI18n, getLocalizedCategoryName } from '@/i18n';
import { Expense, RawExpenseReport } from '@/types';
import { duplicateDetector } from '@/services/duplicateDetector';
import { Button } from '@/components/common/Button';
import { Badge } from '@/components/common/Badge';
import { sumBy } from '@/utils/numberParser';

interface ImportPreviewModalProps {
  visible: boolean;
  report: RawExpenseReport | null;
  fileName: string;
  existingExpenses: Expense[];
  onClose: () => void;
  onConfirm: () => void;
}

export const ImportPreviewModal: React.FC<ImportPreviewModalProps> = React.memo(
  ({ visible, report, fileName, existingExpenses, onClose, onConfirm }) => {
    const { theme, spacing, radius, typography } = useTheme();
    const { t } = useI18n();
    const { width: windowWidth } = useWindowDimensions();

    const isDesktop = windowWidth >= 768;

    const totalAmount = useMemo(
      () => (report ? sumBy(report.expenses, (e) => e.amount) : 0),
      [report],
    );
    const currency = report?.currency || '€';

    // Memoized duplicate checking using O(1) indexed batch lookups
    const checkedExpenses = useMemo(() => {
      if (!report?.expenses) return [];
      const dupResults = duplicateDetector.checkBatchDuplicates(report.expenses, existingExpenses);
      return report.expenses.map((exp, idx) => ({
        ...exp,
        isDuplicate: dupResults[idx]?.isDuplicate ?? false,
        matchReason: dupResults[idx]?.matchReason,
      }));
    }, [report?.expenses, existingExpenses]);

    const duplicateCount = useMemo(
      () => checkedExpenses.filter((e) => e.isDuplicate).length,
      [checkedExpenses],
    );

    if (!report) return null;

    return (
      <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
        <View
          style={{
            flex: 1,
            backgroundColor: theme.isDark ? 'rgba(0,0,0,0.65)' : 'rgba(15,23,42,0.35)',
            justifyContent: isDesktop ? 'center' : 'flex-end',
            alignItems: isDesktop ? 'center' : 'stretch',
            padding: isDesktop ? spacing.lg : 0,
          }}
        >
          <View
            style={{
              backgroundColor: theme.colors.surface,
              borderRadius: isDesktop ? radius.xl : undefined,
              borderTopLeftRadius: radius.xl,
              borderTopRightRadius: radius.xl,
              borderBottomLeftRadius: isDesktop ? radius.xl : 0,
              borderBottomRightRadius: isDesktop ? radius.xl : 0,
              padding: spacing.xl,
              maxHeight: isDesktop ? '85%' : '85%',
              width: isDesktop ? '100%' : undefined,
              maxWidth: isDesktop ? 540 : undefined,
              borderWidth: 1.5,
              borderColor: theme.colors.cardBorder,
            }}
          >
            {/* Header */}
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: spacing.md,
              }}
            >
              <View style={{ flex: 1, minWidth: 0, marginRight: spacing.sm }}>
                <Text
                  style={{
                    color: theme.colors.textPrimary,
                    fontSize: typography.fontSizes.xl,
                    fontWeight: typography.fontWeights.bold,
                  }}
                  numberOfLines={1}
                >
                  {t.import.reviewConfirm}
                </Text>
                <Text
                  style={{
                    color: theme.colors.textSecondary,
                    fontSize: typography.fontSizes.sm,
                    marginTop: 2,
                  }}
                  numberOfLines={1}
                  ellipsizeMode="middle"
                >
                  {t.import.fileLabel}: {fileName}
                </Text>
              </View>
              <TouchableOpacity
                onPress={onClose}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                accessibilityRole="button"
                accessibilityLabel={t.common.close}
                style={{ flexShrink: 0 }}
              >
                <X size={24} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Duplicate warning alert if any duplicates found */}
            {duplicateCount > 0 && (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: theme.colors.warningBg,
                  padding: spacing.sm,
                  borderRadius: radius.md,
                  marginBottom: spacing.md,
                  gap: spacing.xs,
                }}
              >
                <AlertTriangle size={16} color={theme.colors.warning} style={{ flexShrink: 0 }} />
                <Text
                  style={{
                    color: theme.colors.warning,
                    fontSize: typography.fontSizes.xs,
                    fontWeight: typography.fontWeights.semibold,
                    flex: 1,
                  }}
                  numberOfLines={2}
                >
                  {duplicateCount} {t.import.duplicateWarning}
                </Text>
              </View>
            )}

            {/* KPI Summary Strip */}
            <View
              style={{
                flexDirection: 'row',
                backgroundColor: theme.colors.surfaceSubtle,
                padding: spacing.md,
                borderRadius: radius.md,
                marginBottom: spacing.md,
                justifyContent: 'space-between',
              }}
            >
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text
                  style={{ color: theme.colors.textSecondary, fontSize: typography.fontSizes.xs }}
                  numberOfLines={1}
                >
                  {t.import.totalTransactions}
                </Text>
                <Text
                  style={{
                    color: theme.colors.textPrimary,
                    fontSize: typography.fontSizes.lg,
                    fontWeight: typography.fontWeights.bold,
                  }}
                  numberOfLines={1}
                >
                  {report.expenses.length} {t.common.items}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end', flexShrink: 0 }}>
                <Text
                  style={{ color: theme.colors.textSecondary, fontSize: typography.fontSizes.xs }}
                  numberOfLines={1}
                >
                  {t.import.totalAmount}
                </Text>
                <Text
                  style={{
                    color: theme.colors.brand,
                    fontSize: typography.fontSizes.lg,
                    fontWeight: typography.fontWeights.bold,
                  }}
                  numberOfLines={1}
                >
                  {currency}
                  {totalAmount.toFixed(2)}
                </Text>
              </View>
            </View>

            {/* Transactions Staging List */}
            <ScrollView
              style={{ maxHeight: 280, marginBottom: spacing.lg }}
              showsVerticalScrollIndicator={false}
            >
              {checkedExpenses.map((exp, idx) => (
                <View
                  key={idx}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingVertical: spacing.sm,
                    borderBottomWidth: 1,
                    borderBottomColor: theme.colors.borderSubtle,
                    gap: spacing.sm,
                  }}
                >
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                      <Text
                        style={{
                          color: theme.colors.textPrimary,
                          fontSize: typography.fontSizes.sm,
                          fontWeight: typography.fontWeights.semibold,
                          flexShrink: 1,
                          minWidth: 0,
                        }}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                      >
                        {exp.merchant}
                      </Text>
                      {exp.isDuplicate && (
                        <View style={{ flexShrink: 0 }}>
                          <Badge
                            label={t.common.duplicate}
                            color={theme.colors.warning}
                            size="sm"
                            variant="solid"
                          />
                        </View>
                      )}
                    </View>
                    <Text
                      style={{
                        color: theme.colors.textMuted,
                        fontSize: typography.fontSizes.xs,
                        marginTop: 2,
                      }}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {exp.date} • {getLocalizedCategoryName(exp.category, t)}
                    </Text>
                  </View>

                  <View style={{ alignItems: 'flex-end', flexShrink: 0 }}>
                    <Text
                      style={{
                        color: theme.colors.textPrimary,
                        fontSize: typography.fontSizes.md,
                        fontWeight: typography.fontWeights.bold,
                      }}
                    >
                      {currency}
                      {exp.amount.toFixed(2)}
                    </Text>
                    {exp.paid_by && (
                      <Text
                        style={{
                          color: theme.colors.textMuted,
                          fontSize: typography.fontSizes.xs,
                          marginTop: 2,
                        }}
                      >
                        {exp.paid_by}
                      </Text>
                    )}
                  </View>
                </View>
              ))}
            </ScrollView>

            {/* Action Buttons */}
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <View style={{ flex: 1 }}>
                <Button title={t.common.cancel} variant="outline" size="md" onPress={onClose} />
              </View>
              <View style={{ flex: 2 }}>
                <Button
                  title={`${t.import.importTransactions} (${report.expenses.length})`}
                  variant="primary"
                  size="md"
                  icon={<CheckCircle2 size={18} color="#FFFFFF" strokeWidth={2.5} />}
                  onPress={onConfirm}
                />
              </View>
            </View>
          </View>
        </View>
      </Modal>
    );
  },
);

ImportPreviewModal.displayName = 'ImportPreviewModal';
