import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { X, Tag } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { useI18n, getLocalizedCategoryName } from '@/i18n';
import { CategorySummary } from '@/services/analytics';
import { Expense, FamilyMember } from '@/types';
import { Button } from '@/components/common/Button';

interface CategoryDetailModalProps {
  visible: boolean;
  categorySummary: CategorySummary | null;
  expenses: Expense[];
  members: FamilyMember[];
  currency?: string;
  onClose: () => void;
}

export const CategoryDetailModal: React.FC<CategoryDetailModalProps> = ({
  visible,
  categorySummary,
  expenses,
  members,
  currency = '€',
  onClose,
}) => {
  const { theme, spacing, radius, typography } = useTheme();
  const { t } = useI18n();
  const { width: windowWidth } = useWindowDimensions();
  const isDesktop = windowWidth >= 768;

  if (!categorySummary) return null;

  const { category, total, percentage, transactionCount } = categorySummary;
  const categoryExpenses = expenses
    .filter((e) => e.category_id === category.id)
    .sort(
      (a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime(),
    );

  const avgTicket = transactionCount > 0 ? total / transactionCount : 0;
  const localizedCategoryName = getLocalizedCategoryName(category, t);

  const getMember = (memberId: string) => members.find((m) => m.id === memberId);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View
        style={{
          flex: 1,
          backgroundColor: theme.colors.backdrop,
          justifyContent: isDesktop ? 'center' : 'flex-end',
          alignItems: isDesktop ? 'center' : 'stretch',
          padding: isDesktop ? spacing.lg : 0,
        }}
      >
        <View
          style={[
            {
              backgroundColor: theme.colors.surface,
              borderRadius: isDesktop ? radius.sm : undefined,
              borderTopLeftRadius: radius.sm,
              borderTopRightRadius: radius.sm,
              borderBottomLeftRadius: isDesktop ? radius.sm : 0,
              borderBottomRightRadius: isDesktop ? radius.sm : 0,
              paddingHorizontal: spacing.lg,
              paddingBottom: spacing.xl,
              paddingTop: isDesktop ? spacing.lg : spacing.sm,
              maxHeight: isDesktop ? '85%' : '90%',
              width: isDesktop ? '100%' : undefined,
              maxWidth: isDesktop ? 540 : undefined,
              borderWidth: 1,
              borderColor: theme.colors.cardBorder,
            },
            Platform.OS === 'web' &&
              ({
                backdropFilter: 'blur(24px)',
                WebkitBackdropFilter: 'blur(24px)',
                boxShadow: isDesktop
                  ? theme.isDark
                    ? '0 24px 48px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.1)'
                    : '0 24px 48px rgba(15, 23, 42, 0.2), 0 0 0 1px rgba(0, 0, 0, 0.05)'
                  : 'none',
              } as any),
          ]}
        >
          {/* Mobile Grabber */}
          {!isDesktop && (
            <View
              style={{
                alignItems: 'center',
                paddingVertical: spacing.xs,
                marginBottom: spacing.sm,
              }}
            >
              <View
                style={{
                  width: 36,
                  height: 4,
                  borderRadius: radius.xs,
                  backgroundColor: theme.colors.borderTactile,
                }}
              />
            </View>
          )}

          {/* Header */}
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: spacing.md,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 }}>
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: radius.md,
                  backgroundColor: `${category.color}20`,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Tag size={18} color={category.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    color: theme.colors.textPrimary,
                    fontSize: typography.fontSizes.lg,
                    fontWeight: typography.fontWeights.heavy,
                  }}
                  numberOfLines={1}
                >
                  {localizedCategoryName}
                </Text>
                <Text style={{ color: theme.colors.textSecondary, fontSize: 11 }}>
                  {percentage.toFixed(1)}% {t.analytics.categoryShare}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              style={{ flexShrink: 0 }}
            >
              <X size={22} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Stat Cards */}
          <View
            style={{
              flexDirection: 'row',
              gap: spacing.sm,
              marginBottom: spacing.md,
            }}
          >
            <View
              style={{
                flex: 1,
                backgroundColor: theme.colors.surfaceSubtle,
                borderRadius: radius.md,
                padding: spacing.sm,
                borderWidth: 1,
                borderColor: theme.colors.border,
              }}
            >
              <Text
                style={{
                  color: theme.colors.textSecondary,
                  fontSize: 10,
                  fontWeight: typography.fontWeights.bold,
                }}
              >
                {t.analytics.totalSpend}
              </Text>
              <Text
                style={{
                  color: theme.colors.textPrimary,
                  fontSize: typography.fontSizes.md,
                  fontWeight: typography.fontWeights.heavy,
                  marginTop: 2,
                }}
              >
                {currency}
                {total.toFixed(2)}
              </Text>
            </View>

            <View
              style={{
                flex: 1,
                backgroundColor: theme.colors.surfaceSubtle,
                borderRadius: radius.md,
                padding: spacing.sm,
                borderWidth: 1,
                borderColor: theme.colors.border,
              }}
            >
              <Text
                style={{
                  color: theme.colors.textSecondary,
                  fontSize: 10,
                  fontWeight: typography.fontWeights.bold,
                }}
              >
                {t.dashboard.totalTransactions}
              </Text>
              <Text
                style={{
                  color: theme.colors.textPrimary,
                  fontSize: typography.fontSizes.md,
                  fontWeight: typography.fontWeights.heavy,
                  marginTop: 2,
                }}
              >
                {transactionCount}
              </Text>
            </View>

            <View
              style={{
                flex: 1,
                backgroundColor: theme.colors.surfaceSubtle,
                borderRadius: radius.md,
                padding: spacing.sm,
                borderWidth: 1,
                borderColor: theme.colors.border,
              }}
            >
              <Text
                style={{
                  color: theme.colors.textSecondary,
                  fontSize: 10,
                  fontWeight: typography.fontWeights.bold,
                }}
              >
                {t.analytics.avgTransaction}
              </Text>
              <Text
                style={{
                  color: theme.colors.textPrimary,
                  fontSize: typography.fontSizes.md,
                  fontWeight: typography.fontWeights.heavy,
                  marginTop: 2,
                }}
              >
                {currency}
                {avgTicket.toFixed(0)}
              </Text>
            </View>
          </View>

          {/* Transactions List */}
          <Text
            style={{
              color: theme.colors.textPrimary,
              fontSize: typography.fontSizes.sm,
              fontWeight: typography.fontWeights.bold,
              marginBottom: spacing.xs,
            }}
          >
            {t.analytics.recentTransactionsInCategory}
          </Text>

          <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 260 }}>
            {categoryExpenses.length === 0 ? (
              <View style={{ paddingVertical: spacing.md, alignItems: 'center' }}>
                <Text
                  style={{ color: theme.colors.textSecondary, fontSize: typography.fontSizes.xs }}
                >
                  {t.analytics.noTransactionsInCategory}
                </Text>
              </View>
            ) : (
              categoryExpenses.map((expense) => {
                const member = getMember(expense.paid_by_member_id);
                return (
                  <View
                    key={expense.id}
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      paddingVertical: spacing.sm,
                      borderBottomWidth: 1,
                      borderBottomColor: theme.colors.border,
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
                        {expense.merchant_name}
                      </Text>
                      <View
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}
                      >
                        <Text style={{ color: theme.colors.textSecondary, fontSize: 10 }}>
                          {expense.transaction_date}
                        </Text>
                        {member && (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                            <View
                              style={{
                                width: 6,
                                height: 6,
                                borderRadius: radius.full,
                                backgroundColor: member.color_code || theme.colors.brand,
                              }}
                            />
                            <Text style={{ color: theme.colors.textSecondary, fontSize: 10 }}>
                              {member.display_name}
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>

                    <Text
                      style={{
                        color: theme.colors.textPrimary,
                        fontSize: typography.fontSizes.sm,
                        fontWeight: typography.fontWeights.heavy,
                      }}
                    >
                      {currency}
                      {expense.amount.toFixed(2)}
                    </Text>
                  </View>
                );
              })
            )}
          </ScrollView>

          {/* Close Button */}
          <View style={{ marginTop: spacing.md }}>
            <Button title={t.analytics.closeDetails} variant="outline" onPress={onClose} />
          </View>
        </View>
      </View>
    </Modal>
  );
};
