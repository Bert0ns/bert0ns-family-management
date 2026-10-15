import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { PieChart } from 'react-native-gifted-charts';
import { useTheme } from '@/theme';
import { useI18n, getLocalizedCategoryName } from '@/i18n';
import { CategorySummary } from '@/services/analytics';
import { Card } from '@/components/common/Card';
import { IconHelper } from '@/components/common/IconHelper';
import { sumBy } from '@/utils/numberParser';
import { hexToRgba } from '@/utils/color';

export interface ComputedPieSlice {
  value: number;
  color: string;
  text: string;
  focused?: boolean;
  onPress?: () => void;
  category: CategorySummary['category'];
  percentage: number;
  isOther?: boolean;
}

export function computeCategoryPieSlices(
  data: CategorySummary[],
  totalSpend: number,
  options?: {
    selectedIndex?: number | null;
    otherLabel?: string;
    otherColor?: string;
    onSelectIndex?: (index: number | null) => void;
    onSelectCategory?: (categoryId: string) => void;
  },
): ComputedPieSlice[] {
  if (!data || data.length === 0 || totalSpend <= 0) return [];

  const topCategories = data.slice(0, 5);
  const tailCategories = data.slice(5);

  const slices: ComputedPieSlice[] = topCategories.map((item, index) => {
    const isSelected = options?.selectedIndex === index;
    return {
      value: item.total,
      color: item.category.color,
      text: `${item.percentage.toFixed(0)}%`,
      focused: isSelected,
      category: item.category,
      percentage: item.percentage,
      isOther: false,
      onPress: () => {
        options?.onSelectIndex?.(isSelected ? null : index);
        if (options?.onSelectCategory) {
          options.onSelectCategory(item.category.id);
        }
      },
    };
  });

  if (tailCategories.length > 0) {
    const tailTotal = sumBy(tailCategories, (item) => item.total);
    const tailPercentage = totalSpend > 0 ? (tailTotal / totalSpend) * 100 : 0;
    const isSelected = options?.selectedIndex === 5;
    slices.push({
      value: tailTotal,
      color: options?.otherColor || '#94A3B8',
      text: `${tailPercentage.toFixed(0)}%`,
      focused: isSelected,
      percentage: tailPercentage,
      isOther: true,
      category: {
        id: 'other',
        name: options?.otherLabel || 'Other',
        icon: 'MoreHorizontal',
        color: options?.otherColor || '#94A3B8',
        family_id: '',
        is_default: false,
        created_at: '',
      },
      onPress: () => {
        options?.onSelectIndex?.(isSelected ? null : 5);
      },
    });
  }

  return slices;
}

interface CategoryPieChartProps {
  data: CategorySummary[];
  currency?: string;
  onSelectCategory?: (categoryId: string) => void;
}

export const CategoryPieChart: React.FC<CategoryPieChartProps> = ({
  data,
  currency = '€',
  onSelectCategory,
}) => {
  const { theme, spacing, radius, typography } = useTheme();
  const { t } = useI18n();
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const totalSpend = sumBy(data, (item) => item.total);

  if (data.length === 0 || totalSpend === 0) {
    return (
      <Card padding="lg" style={{ alignItems: 'center', justifyContent: 'center', minHeight: 180 }}>
        <Text style={{ color: theme.colors.textMuted, fontSize: typography.fontSizes.md }}>
          {t.dashboard.noExpensesMonth}
        </Text>
      </Card>
    );
  }

  const pieData = computeCategoryPieSlices(data, totalSpend, {
    selectedIndex,
    onSelectIndex: setSelectedIndex,
    onSelectCategory,
    otherLabel: t.categories.other || 'Other',
    otherColor: theme.colors.textMuted,
  });

  const activeSlice = selectedIndex !== null ? pieData[selectedIndex] : null;

  return (
    <Card padding="lg">
      <Text
        style={{
          color: theme.colors.textPrimary,
          fontSize: typography.fontSizes.lg,
          fontWeight: typography.fontWeights.bold,
          marginBottom: spacing.md,
        }}
        numberOfLines={1}
      >
        {t.analytics.categoriesTab}
      </Text>

      {/* Donut Chart with Center Summary Label */}
      <View style={{ alignItems: 'center', marginVertical: spacing.sm }}>
        <PieChart
          donut
          data={pieData}
          radius={110}
          innerRadius={72}
          innerCircleColor={theme.colors.card}
          centerLabelComponent={() => (
            <View style={{ alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 }}>
              <Text
                style={{
                  color: theme.colors.textSecondary,
                  fontSize: typography.fontSizes.xs,
                  fontWeight: typography.fontWeights.semibold,
                  textAlign: 'center',
                }}
                numberOfLines={1}
              >
                {activeSlice
                  ? activeSlice.isOther
                    ? t.categories.other || 'Other'
                    : getLocalizedCategoryName(activeSlice.category, t)
                  : t.analytics.totalSpend}
              </Text>
              <Text
                style={{
                  color: theme.colors.textPrimary,
                  fontSize: typography.fontSizes.xl,
                  fontWeight: typography.fontWeights.heavy,
                  marginTop: 2,
                }}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.7}
              >
                {currency}
                {(activeSlice ? activeSlice.value : totalSpend).toFixed(0)}
              </Text>
              {activeSlice && (
                <Text
                  style={{
                    color: activeSlice.color,
                    fontSize: typography.fontSizes.xs,
                    fontWeight: typography.fontWeights.bold,
                    marginTop: 2,
                  }}
                  numberOfLines={1}
                >
                  {activeSlice.percentage.toFixed(1)}%
                </Text>
              )}
            </View>
          )}
        />
      </View>

      {/* Accessible Ranked Category Bars */}
      <View style={{ marginTop: spacing.lg, gap: spacing.md }}>
        {data.map((item, idx) => {
          const isSelected = selectedIndex === idx;
          const pct = Math.min(Math.max(item.percentage, 0), 100);
          const localizedCategoryName = getLocalizedCategoryName(item.category, t);

          return (
            <TouchableOpacity
              key={item.category.id}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={`${localizedCategoryName}: ${currency}${item.total.toFixed(2)}, ${item.percentage.toFixed(0)}%`}
              onPress={() => {
                setSelectedIndex(isSelected ? null : idx);
                if (onSelectCategory) {
                  onSelectCategory(item.category.id);
                }
              }}
              style={{
                backgroundColor: isSelected ? theme.colors.surfaceSubtle : theme.colors.card,
                padding: spacing.sm,
                borderRadius: radius.lg,
                borderWidth: isSelected ? 2 : 1,
                borderColor: isSelected ? item.category.color : theme.colors.border,
              }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 6,
                  gap: spacing.sm,
                }}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: spacing.sm,
                    flex: 1,
                    minWidth: 0,
                  }}
                >
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: radius.md,
                      backgroundColor: hexToRgba(item.category.color, 0.12),
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <IconHelper name={item.category.icon} size={20} color={item.category.color} />
                  </View>
                  <Text
                    style={{
                      color: theme.colors.textPrimary,
                      fontSize: typography.fontSizes.md,
                      fontWeight: typography.fontWeights.bold,
                      flexShrink: 1,
                    }}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {localizedCategoryName}
                  </Text>
                </View>

                <View style={{ alignItems: 'flex-end', flexShrink: 0 }}>
                  <Text
                    style={{
                      color: theme.colors.textPrimary,
                      fontSize: typography.fontSizes.md,
                      fontWeight: typography.fontWeights.heavy,
                    }}
                    numberOfLines={1}
                  >
                    {currency}
                    {item.total.toFixed(2)}
                  </Text>
                  <Text
                    style={{
                      color: theme.colors.textSecondary,
                      fontSize: typography.fontSizes.xs,
                      fontWeight: typography.fontWeights.semibold,
                    }}
                    numberOfLines={1}
                  >
                    {item.percentage.toFixed(0)}%, {item.transactionCount}{' '}
                    {t.ledger.transactionsCount}
                  </Text>
                </View>
              </View>

              {/* Visual Progress / Distribution Bar */}
              <View
                style={{
                  height: 8,
                  backgroundColor: theme.colors.surfaceSubtle,
                  borderRadius: radius.xs,
                  overflow: 'hidden',
                }}
              >
                <View
                  style={{
                    height: '100%',
                    width: `${pct}%`,
                    backgroundColor: item.category.color,
                    borderRadius: radius.full,
                  }}
                />
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </Card>
  );
};
