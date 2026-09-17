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

  const isSplit = expense.splits && expense.splits.length > 0;
  const catColor = category?.color || theme.colors.brand;
  const catIcon = category?.icon || 'HelpCircle';
  const catName = category ? getLocalizedCategoryName(category, t) : t.categories.other;
  const memberName = member?.display_name || '?';

  const dateLocale = locale === 'it' ? 'it-IT' : 'en-US';
  const formattedDate = new Date(expense.transaction_date).toLocaleDateString(dateLocale, {
    day: 'numeric',
    month: 'short',
  });

  const webGlassStyles =
    Platform.OS === 'web'
      ? ({
          cursor: 'pointer',
          transition: 'all 0.15s ease',
        } as any)
      : {};

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${expense.merchant_name}, ${currency}${expense.amount.toFixed(2)}`}
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          minHeight: 64,
          paddingVertical: spacing.sm + 2,
          paddingHorizontal: spacing.sm + 4,
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
          width: 40,
          height: 40,
          borderRadius: radius.lg,
          backgroundColor: `${catColor}18`,
          borderWidth: 1.5,
          borderColor: `${catColor}30`,
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: spacing.sm + 2,
          flexShrink: 0,
        }}
      >
        <IconHelper name={catIcon} size={20} color={catColor} />
      </View>

      {/* Details */}
      <View style={{ flex: 1, minWidth: 0, marginRight: spacing.xs }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
          <Text
            style={{
              color: theme.colors.textPrimary,
              fontSize: typography.fontSizes.md,
              fontWeight: typography.fontWeights.bold,
              flex: 1,
              minWidth: 0,
            }}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {expense.merchant_name}
          </Text>
          {isSplit && <Split size={14} color={theme.colors.brand} style={{ flexShrink: 0 }} />}
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
          <Text
            style={{
              color: theme.colors.textSecondary,
              fontSize: typography.fontSizes.xs,
              fontWeight: typography.fontWeights.medium,
              flexShrink: 1,
              minWidth: 0,
            }}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {catName}
          </Text>
          <Text
            style={{
              color: theme.colors.textMuted,
              fontSize: typography.fontSizes.xs,
              flexShrink: 0,
            }}
          >
            •
          </Text>
          <Text
            style={{
              color: theme.colors.textSecondary,
              fontSize: typography.fontSizes.xs,
              fontWeight: typography.fontWeights.medium,
              flexShrink: 0,
            }}
          >
            {formattedDate}
          </Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 }}>
          <View
            style={{
              width: 6,
              height: 6,
              borderRadius: 3,
              backgroundColor: member?.color_code || theme.colors.brand,
              flexShrink: 0,
            }}
          />
          <Text
            style={{
              color: theme.colors.textMuted,
              fontSize: 11,
              fontWeight: typography.fontWeights.medium,
              flexShrink: 1,
              minWidth: 0,
            }}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {memberName}
          </Text>
        </View>
      </View>

      {/* Amount */}
      <View
        style={{
          alignItems: 'flex-end',
          justifyContent: 'center',
          flexShrink: 0,
          marginLeft: spacing.xs,
        }}
      >
        <Text
          style={{
            color: theme.colors.textPrimary,
            fontSize: typography.fontSizes.lg,
            fontWeight: typography.fontWeights.heavy,
          }}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.75}
        >
          {currency}
          {expense.amount.toFixed(2)}
        </Text>

        <Text
          style={{
            color: theme.colors.textMuted,
            fontSize: typography.fontSizes.xs,
            fontWeight: typography.fontWeights.semibold,
            marginTop: 2,
          }}
          numberOfLines={1}
        >
          {expense.payment_method || 'Standard'}
        </Text>
      </View>
    </TouchableOpacity>
  );
};
