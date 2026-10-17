import React, { useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Platform,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { useTheme } from '@/theme';
import { useI18n, getLocalizedCategoryName } from '@/i18n';
import { Expense, Category, FamilyMember } from '@/types';
import { IconHelper } from '@/components/common/IconHelper';

interface ExpenseItemProps {
  expense: Expense;
  category?: Category;
  member?: FamilyMember;
  currency?: string;
  onPress?: ((expense: Expense) => void) | (() => void);
}

const TABULAR_NUMS: TextStyle =
  Platform.OS === 'web'
    ? ({ fontVariantNumeric: 'tabular-nums' } as unknown as TextStyle)
    : { fontVariant: ['tabular-nums'] };

// Hoist date formatters to prevent allocating Intl instances per render
const DATE_FORMATTERS: Record<string, Intl.DateTimeFormat> = {
  it: new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'short' }),
  en: new Intl.DateTimeFormat('en-US', { day: 'numeric', month: 'short' }),
};

function formatExpenseDate(dateStr: string, locale: string): string {
  const formatter = locale === 'it' ? DATE_FORMATTERS.it : DATE_FORMATTERS.en;
  try {
    return formatter.format(new Date(dateStr));
  } catch {
    return dateStr;
  }
}

export const ExpenseItem: React.FC<ExpenseItemProps> = React.memo(
  ({ expense, category, member, currency = '€', onPress }) => {
    const { theme, spacing, radius, typography } = useTheme();
    const { t, locale } = useI18n();

    const catColor = category?.color || theme.colors.brand;
    const catIcon = category?.icon || 'HelpCircle';
    const catName = category ? getLocalizedCategoryName(category, t) : t.categories.other;
    const memberName = member?.display_name || '?';

    const formattedDate = formatExpenseDate(expense.transaction_date, locale);

    const handlePress = useCallback(() => {
      onPress?.(expense);
    }, [onPress, expense]);

    const webGlassStyles: ViewStyle =
      Platform.OS === 'web'
        ? ({
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          } as unknown as ViewStyle)
        : {};

    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={handlePress}
        accessibilityRole="button"
        accessibilityLabel={`${expense.merchant_name}, ${currency}${expense.amount.toFixed(2)}, ${catName}, ${formattedDate}, ${memberName}`}
        style={[
          {
            flexDirection: 'row',
            alignItems: 'center',
            minHeight: 72,
            paddingVertical: spacing.sm + 2,
            paddingHorizontal: spacing.sm + 4,
            backgroundColor: theme.colors.card,
            borderRadius: radius.md,
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
            width: 46,
            height: 46,
            borderRadius: radius.sm,
            backgroundColor: `${catColor}18`,
            borderWidth: 1,
            borderColor: `${catColor}45`,
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: spacing.sm + 2,
            flexShrink: 0,
          }}
        >
          <IconHelper name={catIcon} size={22} color={catColor} />
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
              numberOfLines={2}
              ellipsizeMode="tail"
            >
              {expense.merchant_name}
            </Text>
          </View>

          <View
            style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: 2 }}
          >
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
                fontWeight: typography.fontWeights.medium,
                flexShrink: 0,
              }}
            >
              {formattedDate}
            </Text>
          </View>

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 5,
              marginTop: 4,
              backgroundColor: theme.isDark
                ? theme.colors.surfaceElevated
                : theme.colors.surfaceSubtle,
              borderWidth: 1,
              borderColor: member?.color_code || theme.colors.borderTactile,
              borderRadius: radius.xs,
              paddingHorizontal: 6,
              paddingVertical: 2,
              alignSelf: 'flex-start',
              maxWidth: '100%',
            }}
          >
            <View
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: member?.color_code || theme.colors.brand,
                flexShrink: 0,
              }}
            />
            <Text
              style={{
                color: theme.colors.textPrimary,
                fontSize: typography.fontSizes.xs,
                fontWeight: typography.fontWeights.semibold,
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
            style={[
              {
                color: theme.colors.textPrimary,
                fontSize: typography.fontSizes.lg,
                fontWeight: typography.fontWeights.heavy,
              },
              TABULAR_NUMS,
            ]}
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
  },
);

ExpenseItem.displayName = 'ExpenseItem';
