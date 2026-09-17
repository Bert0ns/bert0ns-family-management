import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { PieChart } from 'react-native-gifted-charts';
import { useTheme } from '@/theme';
import { useI18n, getLocalizedCategoryName } from '@/i18n';
import { CategorySummary } from '@/services/analytics';
import { IconHelper } from '@/components/common/IconHelper';
import { Card } from '@/components/common/Card';

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

  const totalSpend = data.reduce((sum, item) => sum + item.total, 0);

  if (data.length === 0 || totalSpend === 0) {
    return (
      <Card padding="lg" style={{ alignItems: 'center', justifyContent: 'center', minHeight: 180 }}>
        <Text style={{ color: theme.colors.textMuted, fontSize: typography.fontSizes.md }}>
          {t.dashboard.noExpensesMonth}
        </Text>
      </Card>
    );
  }

  const pieData = data.slice(0, 6).map((item, index) => {
    const isSelected = selectedIndex === index;
    return {
      value: item.total,
      color: item.category.color,
      text: `${item.percentage.toFixed(0)}%`,
      focused: isSelected,
      onPress: () => {
        setSelectedIndex(isSelected ? null : index);
        if (onSelectCategory) {
          onSelectCategory(item.category.id);
        }
      },
    };
  });

  const activeCategory = selectedIndex !== null ? data[selectedIndex] : null;

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
                {activeCategory
                  ? getLocalizedCategoryName(activeCategory.category, t)
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
                {(activeCategory ? activeCategory.total : totalSpend).toFixed(0)}
              </Text>
              {activeCategory && (
                <Text
                  style={{
                    color: activeCategory.category.color,
                    fontSize: typography.fontSizes.xs,
                    fontWeight: typography.fontWeights.bold,
                    marginTop: 2,
                  }}
                  numberOfLines={1}
                >
                  {activeCategory.percentage.toFixed(1)}%
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
                      backgroundColor: `${item.category.color}20`,
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
                    {item.percentage.toFixed(0)}% • {item.transactionCount}{' '}
                    {t.ledger.transactionsCount}
                  </Text>
                </View>
              </View>

              {/* Visual Progress / Distribution Bar */}
              <View
                style={{
                  height: 8,
                  backgroundColor: theme.colors.surfaceSubtle,
                  borderRadius: radius.full,
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
