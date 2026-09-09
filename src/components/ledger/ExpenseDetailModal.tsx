import React from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, Platform, Alert } from 'react-native';
import { X, Trash2, Calendar, CreditCard, User, Tag, Split } from 'lucide-react-native';
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

    Alert.alert(
      t.common.delete,
      t.common.delete + '?',
      [
        { text: t.common.cancel, style: 'cancel' },
        {
          text: t.common.delete,
          style: 'destructive',
          onPress: () => {
            onDelete(expense.id);
            onClose();
          },
        },
      ]
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          justifyContent: 'flex-end',
        }}
      >
        <View
          style={[
            {
              backgroundColor: theme.colors.surface,
              borderTopLeftRadius: radius.xxl,
              borderTopRightRadius: radius.xxl,
              paddingHorizontal: spacing.xl,
              paddingBottom: spacing.xl,
              paddingTop: spacing.sm,
              maxHeight: '85%',
              borderWidth: 1,
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
                width: 36,
                height: 4,
                borderRadius: 2,
                backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.15)',
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
              }}
            >
              {t.expenseDetail.title}
            </Text>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <X size={24} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Main Merchant & Amount Banner */}
            <View
              style={{
                alignItems: 'center',
                paddingVertical: spacing.lg,
                backgroundColor: theme.colors.surfaceSubtle,
                borderRadius: radius.lg,
                marginBottom: spacing.lg,
              }}
            >
              <View
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: radius.full,
                  backgroundColor: `${catColor}25`,
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
                  fontSize: typography.fontSizes.xl,
                  fontWeight: typography.fontWeights.bold,
                  textAlign: 'center',
                }}
              >
                {expense.merchant_name}
              </Text>

              <Text
                style={{
                  color: theme.colors.brand,
                  fontSize: typography.fontSizes.display,
                  fontWeight: typography.fontWeights.heavy,
                  marginTop: spacing.xs,
                }}
              >
                {currency}
                {expense.amount.toFixed(2)}
              </Text>
            </View>

            {/* Info Grid */}
            <View style={{ gap: spacing.md, marginBottom: spacing.xl }}>
              {/* Category */}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                  <Tag size={18} color={theme.colors.textSecondary} />
                  <Text
                    style={{ color: theme.colors.textSecondary, fontSize: typography.fontSizes.sm }}
                  >
                    {t.expenseDetail.category}
                  </Text>
                </View>
                <Badge label={catName} color={catColor} size="md" />
              </View>

              {/* Paid by */}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                  <User size={18} color={theme.colors.textSecondary} />
                  <Text
                    style={{ color: theme.colors.textSecondary, fontSize: typography.fontSizes.sm }}
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
                      fontWeight: typography.fontWeights.semibold,
                    }}
                  >
                    {memberName}
                  </Text>
                </View>
              </View>

              {/* Date */}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                  <Calendar size={18} color={theme.colors.textSecondary} />
                  <Text
                    style={{ color: theme.colors.textSecondary, fontSize: typography.fontSizes.sm }}
                  >
                    {t.expenseDetail.date}
                  </Text>
                </View>
                <Text
                  style={{
                    color: theme.colors.textPrimary,
                    fontWeight: typography.fontWeights.semibold,
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

              {/* Payment Method */}
              {expense.payment_method && (
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                    <CreditCard size={18} color={theme.colors.textSecondary} />
                    <Text
                      style={{
                        color: theme.colors.textSecondary,
                        fontSize: typography.fontSizes.sm,
                      }}
                    >
                      {t.expenseDetail.paymentMethod}
                    </Text>
                  </View>
                  <Text
                    style={{
                      color: theme.colors.textPrimary,
                      fontWeight: typography.fontWeights.semibold,
                    }}
                  >
                    {localizedPaymentMethod}
                  </Text>
                </View>
              )}

              {/* Split Breakdown */}
              {expense.splits && expense.splits.length > 0 && (
                <View
                  style={{
                    backgroundColor: theme.colors.surfaceSubtle,
                    padding: spacing.md,
                    borderRadius: radius.md,
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
                      {t.expenseDetail.splitBreakdown} ({expense.splits.length}{' '}
                      {t.dashboard.familyMembers})
                    </Text>
                  </View>
                  <View style={{ gap: spacing.xs }}>
                    {expense.splits.map((s) => {
                      const splitMember = resolvedAllMembers.find((m) => m.id === s.member_id);
                      return (
                        <View
                          key={s.member_id}
                          style={{
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                          }}
                        >
                          <Text
                            style={{
                              color: theme.colors.textSecondary,
                              fontSize: typography.fontSizes.xs,
                            }}
                          >
                            {splitMember?.display_name || t.family.roleMember}
                          </Text>
                          <Text
                            style={{
                              color: theme.colors.textPrimary,
                              fontSize: typography.fontSizes.xs,
                              fontWeight: typography.fontWeights.semibold,
                            }}
                          >
                            {currency}
                            {s.share_amount.toFixed(2)}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
              )}

              {/* Notes */}
              {expense.notes && (
                <View style={{ marginTop: spacing.xs }}>
                  <Text
                    style={{
                      color: theme.colors.textSecondary,
                      fontSize: typography.fontSizes.xs,
                      marginBottom: 4,
                    }}
                  >
                    {t.expenseDetail.notes}
                  </Text>
                  <View
                    style={{
                      backgroundColor: theme.colors.surfaceSubtle,
                      padding: spacing.md,
                      borderRadius: radius.md,
                    }}
                  >
                    <Text
                      style={{ color: theme.colors.textPrimary, fontSize: typography.fontSizes.sm }}
                    >
                      {expense.notes}
                    </Text>
                  </View>
                </View>
              )}
            </View>

            {/* Actions */}
            <View style={{ flexDirection: 'row', gap: spacing.md }}>
              <Button
                title={t.common.delete}
                variant="danger"
                icon={<Trash2 size={18} color="#FFFFFF" />}
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
