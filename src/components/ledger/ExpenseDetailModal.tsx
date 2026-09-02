import React from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
import { X, Trash2, Calendar, CreditCard, User, Tag, FileText, Split } from 'lucide-react-native';
import { useTheme } from '@/theme';
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

  if (!expense) return null;

  const catColor = category?.color || theme.colors.brand;
  const catIcon = category?.icon || 'Tag';
  const catName = category?.name || 'Uncategorized';
  const memberName = member?.display_name || 'Family';

  const handleDelete = () => {
    onDelete(expense.id);
    onClose();
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
              marginBottom: spacing.lg,
            }}
          >
            <Text
              style={{
                color: theme.colors.textPrimary,
                fontSize: typography.fontSizes.xl,
                fontWeight: typography.fontWeights.bold,
              }}
            >
              Expense Details
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
                    Category
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
                    Paid by
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                  <Avatar
                    name={memberName}
                    avatarUrl={member?.avatar_url}
                    colorCode={member?.color_code}
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
                    Date
                  </Text>
                </View>
                <Text
                  style={{
                    color: theme.colors.textPrimary,
                    fontWeight: typography.fontWeights.semibold,
                  }}
                >
                  {new Date(expense.transaction_date).toLocaleDateString(undefined, {
                    weekday: 'short',
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </Text>
              </View>

              {/* Payment Method */}
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
                    style={{ color: theme.colors.textSecondary, fontSize: typography.fontSizes.sm }}
                  >
                    Payment Method
                  </Text>
                </View>
                <Text
                  style={{
                    color: theme.colors.textPrimary,
                    fontWeight: typography.fontWeights.semibold,
                  }}
                >
                  {expense.payment_method || 'Standard'}
                </Text>
              </View>

              {/* Split Breakdown (if shared) */}
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
                      marginBottom: spacing.xs,
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
                      Split Breakdown ({expense.splits.length} Members)
                    </Text>
                  </View>
                  <View style={{ gap: spacing.xs }}>
                    {expense.splits.map((s) => {
                      const splitMember = allMembers.find((m) => m.id === s.member_id);
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
                            {splitMember?.display_name || 'Member'}
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
                    Notes
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
                title="Delete"
                variant="danger"
                icon={<Trash2 size={18} color="#FFFFFF" />}
                onPress={handleDelete}
                style={{ flex: 1 }}
              />
              <Button title="Close" variant="outline" onPress={onClose} style={{ flex: 1 }} />
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};
