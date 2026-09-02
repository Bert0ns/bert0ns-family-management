import React from 'react';
import { View, Text, Modal, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { X, CheckCircle2, AlertTriangle, FileJson } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { RawExpenseReport } from '@/types';
import { Button } from '@/components/common/Button';
import { Badge } from '@/components/common/Badge';

interface ImportPreviewModalProps {
  visible: boolean;
  report: RawExpenseReport | null;
  fileName: string;
  onClose: () => void;
  onConfirm: () => void;
}

export const ImportPreviewModal: React.FC<ImportPreviewModalProps> = ({
  visible,
  report,
  fileName,
  onClose,
  onConfirm,
}) => {
  const { theme, spacing, radius, typography } = useTheme();

  if (!report) return null;

  const totalAmount = report.expenses.reduce((sum, e) => sum + e.amount, 0);
  const currency = report.currency || '€';

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
            style={{ maxHeight: 300, marginBottom: spacing.lg }}
            showsVerticalScrollIndicator={false}
          >
            {report.expenses.map((exp, idx) => (
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
                  <Text
                    style={{ color: theme.colors.textMuted, fontSize: typography.fontSizes.xs }}
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
