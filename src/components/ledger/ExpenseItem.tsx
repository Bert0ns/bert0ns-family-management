import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Split } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { Expense, Category, FamilyMember } from '@/types';
import { IconHelper } from '@/components/common/IconHelper';

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
  const isWeb = Platform.OS === 'web';

  const webGlassStyles = isWeb
    ? ({
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        boxShadow: theme.isDark
          ? '0 4px 20px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
          : '0 4px 16px rgba(148, 163, 184, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.9)',
      } as any)
    : {
        shadowColor: theme.colors.shadow,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: theme.isDark ? 0.3 : 0.06,
        shadowRadius: 10,
        elevation: 2,
      };

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.md,
          backgroundColor: theme.colors.card,
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: theme.colors.cardBorder,
          marginBottom: spacing.sm,
          ...webGlassStyles,
        },
      ]}
    >
      {/* Category Icon */}
      <View
        style={{
          width: 42,
          height: 42,
          borderRadius: radius.md,
          backgroundColor: `${catColor}14`,
          borderWidth: 1,
          borderColor: `${catColor}24`,
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
          {isSplit && <Split size={12} color={theme.colors.brand} />}
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
          <Text
            style={{
              color: theme.colors.textSecondary,
              fontSize: typography.fontSizes.xs,
              fontWeight: typography.fontWeights.medium,
            }}
          >
            {catName}
          </Text>
          <Text style={{ color: theme.colors.textMuted, fontSize: typography.fontSizes.xs }}>
            •
          </Text>
          <Text style={{ color: theme.colors.textMuted, fontSize: typography.fontSizes.xs }}>
            {formattedDate}
          </Text>
          <Text style={{ color: theme.colors.textMuted, fontSize: typography.fontSizes.xs }}>
            •
          </Text>
          <View
            style={{
              width: 6,
              height: 6,
              borderRadius: 3,
              backgroundColor: member?.color_code || theme.colors.brand,
            }}
          />
          <Text style={{ color: theme.colors.textSecondary, fontSize: typography.fontSizes.xs }}>
            {memberName}
          </Text>
        </View>
      </View>

      {/* Amount */}
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
    </TouchableOpacity>
  );
};
