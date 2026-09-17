import React from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, Platform, Alert } from 'react-native';
import { X, Trash2, Calendar, CreditCard, User, Split } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { useI18n, getLocalizedCategoryName, getLocalizedPaymentMethod } from '@/i18n';
import { useAppStore } from '@/services/store';
import { Expense, Category, FamilyMember } from '@/types';
import { Avatar } from '@/components/common/Avatar';
import { IconHelper } from '@/components/common/IconHelper';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';

interface ExpenseDetailModalProps {
  visible: boolean;
  expense: Expense | null;
  category?: Category;
  member?: FamilyMember;
  allMembers?: FamilyMember[];
  currency?: string;
  onClose: () => void;
  onDelete: (id: string) => void;
}

export const ExpenseDetailModal: React.FC<ExpenseDetailModalProps> = ({
  visible,
  expense,
  category,
  member,
  allMembers = [],
  currency = '€',
  onClose,
  onDelete,
}) => {
  const { theme, spacing, radius, typography } = useTheme();
  const { t, locale } = useI18n();
  const { categories, members } = useAppStore();

  if (!expense) return null;

  const resolvedCategory = category || categories.find((c) => c.id === expense.category_id);
  const resolvedMember = member || members.find((m) => m.id === expense.paid_by_member_id);
  const resolvedAllMembers = allMembers.length > 0 ? allMembers : members;

  const catColor = resolvedCategory?.color || theme.colors.brand;
  const catIcon = resolvedCategory?.icon || 'Tag';
  const catName = getLocalizedCategoryName(resolvedCategory, t);
  const memberName = resolvedMember?.display_name || t.tabs.family;

  const dateLocale = locale === 'it' ? 'it-IT' : 'en-US';
  const localizedPaymentMethod = getLocalizedPaymentMethod(expense.payment_method, t);

  const handleDelete = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.confirm) {
      if (window.confirm(t.common.delete + '?')) {
        onDelete(expense.id);
        onClose();
      }
      return;
    }

    Alert.alert(t.common.delete, t.common.delete + '?', [
      { text: t.common.cancel, style: 'cancel' },
      {
        text: t.common.delete,
        style: 'destructive',
        onPress: () => {
          onDelete(expense.id);
          onClose();
        },
      },
    ]);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View
        style={{
          flex: 1,
          backgroundColor: theme.isDark ? 'rgba(0, 0, 0, 0.65)' : 'rgba(15, 23, 42, 0.35)',
          justifyContent: 'flex-end',
        }}
      >
        <View
          style={[
            {
              backgroundColor: theme.colors.surface,
              borderTopLeftRadius: radius.xxl,
              borderTopRightRadius: radius.xxl,
              paddingHorizontal: spacing.lg,
              paddingBottom: spacing.xl,
              paddingTop: spacing.sm,
              maxHeight: '88%',
              borderWidth: 1.5,
              borderColor: theme.isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.8)',
              borderBottomWidth: 0,
            },
            Platform.OS === 'web' &&
              ({
                backdropFilter: 'blur(24px)',
                WebkitBackdropFilter: 'blur(24px)',
                boxShadow: theme.isDark
                  ? '0 -8px 32px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.15)'
                  : '0 -8px 32px rgba(148, 163, 184, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.95)',
              } as any),
          ]}
        >
          {/* Apple Sheet Grabber Handle */}
          <View
            style={{ alignItems: 'center', paddingVertical: spacing.xs, marginBottom: spacing.md }}
          >
            <View
              style={{
                width: 40,
                height: 4,
                borderRadius: 2,
                backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.25)' : 'rgba(0, 0, 0, 0.15)',
              }}
            />
          </View>

          {/* Header */}
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: spacing.md,
            }}
          >
            <Text
              style={{
                color: theme.colors.textPrimary,
                fontSize: typography.fontSizes.xl,
                fontWeight: typography.fontWeights.bold,
                flex: 1,
                minWidth: 0,
                marginRight: spacing.sm,
              }}
              numberOfLines={1}
            >
              {t.expenseDetail.title}
            </Text>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={{
                width: 36,
                height: 36,
                borderRadius: radius.md,
                backgroundColor: theme.isDark
                  ? theme.colors.surfaceContainerHigh
                  : theme.colors.surfaceSubtle,
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <X size={20} color={theme.colors.textSecondary} strokeWidth={2.5} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Main Merchant & Amount Banner */}
            <View
              style={{
                alignItems: 'center',
                paddingVertical: spacing.xl,
                backgroundColor: theme.colors.card,
                borderRadius: radius.xl,
                borderWidth: 1.5,
                borderColor: theme.colors.cardBorder,
                marginBottom: spacing.lg,
              }}
            >
              <View
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: radius.xl,
                  backgroundColor: `${catColor}22`,
                  borderWidth: 1.5,
                  borderColor: `${catColor}35`,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: spacing.sm,
                }}
              >
                <IconHelper name={catIcon} size={28} color={catColor} />
              </View>

              <Text
                style={{
                  color: theme.colors.textPrimary,
                  fontSize: typography.fontSizes.xxxl,
                  fontWeight: typography.fontWeights.heavy,
                  letterSpacing: -0.5,
                }}
              >
                {currency}
                {expense.amount.toFixed(2)}
              </Text>

              <Text
                style={{
                  color: theme.colors.textPrimary,
                  fontSize: typography.fontSizes.lg,
                  fontWeight: typography.fontWeights.bold,
                  marginTop: 4,
                  textAlign: 'center',
                  paddingHorizontal: spacing.md,
                }}
              >
                {expense.merchant_name}
              </Text>

              <View style={{ marginTop: spacing.xs }}>
                <Badge label={catName} color={catColor} size="md" variant="subtle" />
              </View>
            </View>

            {/* Metadata Table Rows */}
            <View
              style={{
                backgroundColor: theme.isDark
                  ? theme.colors.surfaceContainerHigh
                  : theme.colors.surfaceSubtle,
                borderRadius: radius.xl,
                borderWidth: 1.5,
                borderColor: theme.colors.borderTactile,
                padding: spacing.md,
                marginBottom: spacing.lg,
                gap: spacing.md,
              }}
            >
              {/* Date */}
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                  <Calendar size={18} color={theme.colors.textMuted} />
                  <Text
                    style={{
                      color: theme.colors.textSecondary,
                      fontSize: typography.fontSizes.sm,
                      fontWeight: typography.fontWeights.medium,
                    }}
                  >
                    {t.expenseDetail.date}
                  </Text>
                </View>
                <Text
                  style={{
                    color: theme.colors.textPrimary,
                    fontSize: typography.fontSizes.sm,
                    fontWeight: typography.fontWeights.bold,
                  }}
                >
                  {new Date(expense.transaction_date).toLocaleDateString(dateLocale, {
                    weekday: 'short',
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </Text>
              </View>

              {/* Paid By */}
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                  <User size={18} color={theme.colors.textMuted} />
                  <Text
                    style={{
                      color: theme.colors.textSecondary,
                      fontSize: typography.fontSizes.sm,
                      fontWeight: typography.fontWeights.medium,
                    }}
                  >
                    {t.expenseDetail.paidBy}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                  <Avatar
                    name={memberName}
                    avatarUrl={resolvedMember?.avatar_url}
                    colorCode={resolvedMember?.color_code}
                    size="sm"
                  />
                  <Text
                    style={{
                      color: theme.colors.textPrimary,
                      fontSize: typography.fontSizes.sm,
                      fontWeight: typography.fontWeights.bold,
                    }}
                  >
                    {memberName}
                  </Text>
                </View>
              </View>

              {/* Payment Method */}
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                  <CreditCard size={18} color={theme.colors.textMuted} />
                  <Text
                    style={{
                      color: theme.colors.textSecondary,
                      fontSize: typography.fontSizes.sm,
                      fontWeight: typography.fontWeights.medium,
                    }}
                  >
                    {t.expenseDetail.paymentMethod}
                  </Text>
                </View>
                <Text
                  style={{
                    color: theme.colors.textPrimary,
                    fontSize: typography.fontSizes.sm,
                    fontWeight: typography.fontWeights.bold,
                  }}
                >
                  {localizedPaymentMethod}
                </Text>
              </View>

              {/* Notes (if present) */}
              {Boolean(expense.notes) && (
                <View
                  style={{
                    borderTopWidth: 1,
                    borderTopColor: theme.colors.borderTactile,
                    paddingTop: spacing.sm,
                  }}
                >
                  <Text
                    style={{
                      color: theme.colors.textSecondary,
                      fontSize: typography.fontSizes.xs,
                      fontWeight: typography.fontWeights.medium,
                      marginBottom: 2,
                    }}
                  >
                    {t.expenseDetail.notes}
                  </Text>
                  <Text
                    style={{
                      color: theme.colors.textPrimary,
                      fontSize: typography.fontSizes.sm,
                      fontWeight: typography.fontWeights.medium,
                      lineHeight: 20,
                    }}
                  >
                    {expense.notes}
                  </Text>
                </View>
              )}
            </View>

            {/* Splits (if present) */}
            {expense.splits && expense.splits.length > 0 && (
              <View
                style={{
                  backgroundColor: theme.isDark
                    ? theme.colors.surfaceContainerHigh
                    : theme.colors.surfaceSubtle,
                  borderRadius: radius.xl,
                  borderWidth: 1.5,
                  borderColor: theme.colors.borderTactile,
                  padding: spacing.md,
                  marginBottom: spacing.lg,
                }}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: spacing.xs,
                    marginBottom: spacing.sm,
                  }}
                >
                  <Split size={16} color={theme.colors.brand} />
                  <Text
                    style={{
                      color: theme.colors.textPrimary,
                      fontSize: typography.fontSizes.sm,
                      fontWeight: typography.fontWeights.bold,
                    }}
                  >
                    {t.expenseDetail.splitBreakdown} ({expense.splits.length})
                  </Text>
                </View>

                {expense.splits.map((s, idx) => {
                  const m = resolvedAllMembers.find((mem) => mem.id === s.member_id);
                  return (
                    <View
                      key={idx}
                      style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        paddingVertical: 6,
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                        <Avatar
                          name={m?.display_name || '?'}
                          avatarUrl={m?.avatar_url}
                          colorCode={m?.color_code}
                          size="sm"
                        />
                        <Text
                          style={{
                            color: theme.colors.textPrimary,
                            fontSize: typography.fontSizes.sm,
                            fontWeight: typography.fontWeights.medium,
                          }}
                        >
                          {m?.display_name || '?'}
                        </Text>
                      </View>
                      <Text
                        style={{
                          color: theme.colors.brand,
                          fontSize: typography.fontSizes.sm,
                          fontWeight: typography.fontWeights.bold,
                        }}
                      >
                        {currency}
                        {s.share_amount.toFixed(2)}
                      </Text>
                    </View>
                  );
                })}
              </View>
            )}

            {/* Actions */}
            <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs }}>
              <Button
                title={t.common.delete}
                variant="danger"
                icon={<Trash2 size={18} color="#FFFFFF" strokeWidth={2.5} />}
                onPress={handleDelete}
                style={{ flex: 1 }}
              />
              <Button
                title={t.common.close}
                variant="outline"
                onPress={onClose}
                style={{ flex: 1 }}
              />
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};
