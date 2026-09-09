import React from 'react';
import { View, Text, TouchableOpacity, Platform } from 'react-native';
import { Split } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { useI18n, getLocalizedCategoryName } from '@/i18n';
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
  const { t, locale } = useI18n();

  const catColor = category?.color || theme.colors.brand;
  const catIcon = category?.icon || 'Tag';
  const catName = getLocalizedCategoryName(category, t);
  const memberName = member?.display_name || t.tabs.family;

  const dateLocale = locale === 'it' ? 'it-IT' : 'en-US';
  const formattedDate = new Date(expense.transaction_date).toLocaleDateString(dateLocale, {
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
          minHeight: 68,
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.md,
          backgroundColor: theme.colors.card,
          borderRadius: radius.xl,
          borderWidth: 1.5,
          borderColor: theme.colors.cardBorder,
          marginBottom: spacing.sm,
          ...webGlassStyles,
        },
      ]}
    >
      {/* Category Icon */}
      <View
        style={{
          width: 48,
          height: 48,
          borderRadius: radius.lg,
          backgroundColor: `${catColor}18`,
          borderWidth: 1.5,
          borderColor: `${catColor}30`,
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: spacing.md,
        }}
      >
        <IconHelper name={catIcon} size={24} color={catColor} />
      </View>

      {/* Details */}
      <View style={{ flex: 1, marginRight: spacing.sm }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
          <Text
            style={{
              color: theme.colors.textPrimary,
              fontSize: typography.fontSizes.lg,
              fontWeight: typography.fontWeights.bold,
              flex: 1,
            }}
            numberOfLines={1}
          >
            {expense.merchant_name}
          </Text>
          {isSplit && <Split size={14} color={theme.colors.brand} />}
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
          <Text
            style={{
              color: theme.colors.textSecondary,
              fontSize: typography.fontSizes.sm,
              fontWeight: typography.fontWeights.medium,
            }}
          >
            {catName}
          </Text>
          <Text style={{ color: theme.colors.textMuted, fontSize: typography.fontSizes.sm }}>
            •
          </Text>
          <Text style={{ color: theme.colors.textSecondary, fontSize: typography.fontSizes.sm }}>
            {formattedDate}
          </Text>
          <Text style={{ color: theme.colors.textMuted, fontSize: typography.fontSizes.sm }}>
            •
          </Text>
          <View
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: member?.color_code || theme.colors.brand,
            }}
          />
          <Text
            style={{
              color: theme.colors.textSecondary,
              fontSize: typography.fontSizes.sm,
              fontWeight: typography.fontWeights.medium,
            }}
          >
            {memberName}
          </Text>
        </View>
      </View>

      {/* Amount */}
      <View style={{ alignItems: 'flex-end', justifyContent: 'center' }}>
        <Text
          style={{
            color: theme.colors.textPrimary,
            fontSize: typography.fontSizes.xl,
            fontWeight: typography.fontWeights.heavy,
          }}
        >
          {currency}
          {expense.amount.toFixed(2)}
        </Text>
      </View>
    </TouchableOpacity>
  );
};
