import React from 'react';
import { View, Text, Modal, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { X, CheckCircle2, AlertTriangle, FileJson, AlertCircle } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { RawExpenseReport, Expense } from '@/types';
import { Button } from '@/components/common/Button';
import { Badge } from '@/components/common/Badge';
import { duplicateDetector } from '@/services/duplicateDetector';

interface ImportPreviewModalProps {
  visible: boolean;
  report: RawExpenseReport | null;
  fileName: string;
  existingExpenses: Expense[];
  onClose: () => void;
  onConfirm: () => void;
}

export const ImportPreviewModal: React.FC<ImportPreviewModalProps> = ({
  visible,
  report,
  fileName,
  existingExpenses,
  onClose,
  onConfirm,
}) => {
  const { theme, spacing, radius, typography } = useTheme();

  if (!report) return null;

  const totalAmount = report.expenses.reduce((sum, e) => sum + e.amount, 0);
  const currency = report.currency || '€';

  // Check for duplicates
  const checkedExpenses = report.expenses.map((exp) => {
    const dupResult = duplicateDetector.checkDuplicate(exp, existingExpenses);
    return {
      ...exp,
      isDuplicate: dupResult.isDuplicate,
      matchReason: dupResult.matchReason,
    };
  });

  const duplicateCount = checkedExpenses.filter((e) => e.isDuplicate).length;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.5)',
          justifyContent: 'flex-end',
        }}
      >
        <View
          style={{
            backgroundColor: theme.colors.surface,
            borderTopLeftRadius: radius.xl,
            borderTopRightRadius: radius.xl,
            padding: spacing.xl,
            maxHeight: '85%',
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
            <View>
              <Text
                style={{
                  color: theme.colors.textPrimary,
                  fontSize: typography.fontSizes.xl,
                  fontWeight: typography.fontWeights.bold,
                }}
              >
                Review & Confirm Import
              </Text>
              <Text
                style={{
                  color: theme.colors.textSecondary,
                  fontSize: typography.fontSizes.sm,
                  marginTop: 2,
                }}
              >
                File: {fileName}
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
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
              <AlertTriangle size={16} color={theme.colors.warning} />
              <Text
                style={{
                  color: theme.colors.warning,
                  fontSize: typography.fontSizes.xs,
                  fontWeight: typography.fontWeights.semibold,
                  flex: 1,
                }}
              >
                {duplicateCount} potential duplicate{duplicateCount > 1 ? 's' : ''} detected. They
                will still be imported if confirmed.
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
            <View>
              <Text
                style={{ color: theme.colors.textSecondary, fontSize: typography.fontSizes.xs }}
              >
                Total Transactions
              </Text>
              <Text
                style={{
                  color: theme.colors.textPrimary,
                  fontSize: typography.fontSizes.lg,
                  fontWeight: typography.fontWeights.bold,
                }}
              >
                {report.expenses.length} Items
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text
                style={{ color: theme.colors.textSecondary, fontSize: typography.fontSizes.xs }}
              >
                Total Amount
              </Text>
              <Text
                style={{
                  color: theme.colors.brand,
                  fontSize: typography.fontSizes.lg,
                  fontWeight: typography.fontWeights.bold,
                }}
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
                }}
              >
                <View style={{ flex: 1, marginRight: spacing.sm }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                    <Text
                      style={{
                        color: theme.colors.textPrimary,
                        fontSize: typography.fontSizes.sm,
                        fontWeight: typography.fontWeights.semibold,
                      }}
                      numberOfLines={1}
                    >
                      {exp.merchant}
                    </Text>
                    {exp.isDuplicate && (
                      <Badge
                        label="Duplicate"
                        color={theme.colors.warning}
                        size="sm"
                        variant="solid"
                      />
                    )}
                  </View>
                  <Text
                    style={{
                      color: theme.colors.textMuted,
                      fontSize: typography.fontSizes.xs,
                      marginTop: 2,
                    }}
                  >
                    {exp.date} • {exp.category}
                  </Text>
                </View>

                <Text
                  style={{
                    color: theme.colors.textPrimary,
                    fontSize: typography.fontSizes.sm,
                    fontWeight: typography.fontWeights.bold,
                  }}
                >
                  {currency}
                  {exp.amount.toFixed(2)}
                </Text>
              </View>
            ))}
          </ScrollView>

          {/* Action Buttons */}
          <View style={{ flexDirection: 'row', gap: spacing.md }}>
            <Button title="Cancel" variant="outline" onPress={onClose} style={{ flex: 1 }} />
            <Button
              title={`Import (${report.expenses.length} Items)`}
              variant="primary"
              icon={<CheckCircle2 size={18} color="#FFFFFF" />}
              onPress={onConfirm}
              style={{ flex: 2 }}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};
