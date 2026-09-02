import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Split } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { Expense, Category, FamilyMember } from '@/types';
import { Avatar } from '@/components/common/Avatar';
import { IconHelper } from '@/components/common/IconHelper';
import { Badge } from '@/components/common/Badge';

interface ExpenseItemProps {
  expense: Expense;
  category?: Category;
  member?: FamilyMember;
  currency?: string;
  onPress: () => void;
}

export const ExpenseItem: React.FC<ExpenseItemProps> = ({
  expense,
  category,
  member,
  currency = '€',
  onPress,
}) => {
  const { theme, spacing, radius, typography } = useTheme();

  const catColor = category?.color || theme.colors.brand;
  const catIcon = category?.icon || 'Tag';
  const catName = category?.name || 'Uncategorized';
  const memberName = member?.display_name || 'Family';

  const formattedDate = new Date(expense.transaction_date).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });

  const isSplit = expense.splits && expense.splits.length > 0;

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.md,
        backgroundColor: theme.colors.card,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: theme.colors.cardBorder,
        marginBottom: spacing.sm,
      }}
    >
      {/* Category Icon */}
      <View
        style={{
          width: 42,
          height: 42,
          borderRadius: radius.md,
          backgroundColor: `${catColor}18`,
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: spacing.md,
        }}
      >
        <IconHelper name={catIcon} size={20} color={catColor} />
      </View>

      {/* Details */}
      <View style={{ flex: 1, marginRight: spacing.sm }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
          <Text
            style={{
              color: theme.colors.textPrimary,
              fontSize: typography.fontSizes.md,
              fontWeight: typography.fontWeights.semibold,
              flex: 1,
            }}
            numberOfLines={1}
          >
            {expense.merchant_name}
          </Text>
          {isSplit && (
            <Badge
              label="Split"
              color={theme.colors.brand}
              size="sm"
              icon={<Split size={10} color={theme.colors.brand} />}
            />
          )}
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: 4 }}>
          <Text style={{ color: theme.colors.textMuted, fontSize: typography.fontSizes.xs }}>
            {formattedDate}
          </Text>
          <Text style={{ color: theme.colors.textMuted, fontSize: typography.fontSizes.xs }}>
            •
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Avatar
              name={memberName}
              avatarUrl={member?.avatar_url}
              colorCode={member?.color_code}
              size="sm"
            />
            <Text style={{ color: theme.colors.textSecondary, fontSize: typography.fontSizes.xs }}>
              {memberName}
            </Text>
          </View>
        </View>
      </View>

      {/* Amount & Category Badge */}
      <View style={{ alignItems: 'flex-end', gap: 4 }}>
        <Text
          style={{
            color: theme.colors.textPrimary,
            fontSize: typography.fontSizes.md,
            fontWeight: typography.fontWeights.bold,
          }}
        >
          {currency}
          {expense.amount.toFixed(2)}
        </Text>

        <Badge label={catName} color={catColor} size="sm" variant="subtle" />
      </View>
    </TouchableOpacity>
  );
};
