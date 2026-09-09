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
          fontWeight: typography.fontWeights.heavy,
          marginBottom: spacing.md,
        }}
      >
        {t.analytics.categoryRank}
      </Text>

      {/* Donut Chart Visual */}
      <View style={{ alignItems: 'center', justifyContent: 'center', marginVertical: spacing.sm }}>
        <PieChart
          data={pieData}
          donut
          showText={false}
          radius={85}
          innerRadius={55}
          innerCircleColor={theme.colors.card}
          centerLabelComponent={() => {
            if (activeCategory) {
              return (
                <View style={{ alignItems: 'center', justifyContent: 'center', padding: 4 }}>
                  <Text
                    style={{
                      color: theme.colors.textSecondary,
                      fontSize: typography.fontSizes.xs,
                      fontWeight: typography.fontWeights.medium,
                      textAlign: 'center',
                    }}
                    numberOfLines={1}
                  >
                    {getLocalizedCategoryName(activeCategory.category, t)}
                  </Text>
                  <Text
                    style={{
                      color: activeCategory.category.color,
                      fontSize: typography.fontSizes.md,
                      fontWeight: typography.fontWeights.bold,
                    }}
                  >
                    {currency}
                    {activeCategory.total.toFixed(0)}
                  </Text>
                </View>
              );
            }
            return (
              <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                <Text
                  style={{
                    color: theme.colors.textSecondary,
                    fontSize: typography.fontSizes.xs,
                    fontWeight: typography.fontWeights.medium,
                  }}
                >
                  {t.analytics.totalSpend}
                </Text>
                <Text
                  style={{
                    color: theme.colors.textPrimary,
                    fontSize: typography.fontSizes.lg,
                    fontWeight: typography.fontWeights.bold,
                  }}
                >
                  {currency}
                  {totalSpend.toFixed(0)}
                </Text>
              </View>
            );
          }}
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
                }}
              >
                <View
                  style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 }}
                >
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: radius.md,
                      backgroundColor: `${item.category.color}20`,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <IconHelper name={item.category.icon} size={20} color={item.category.color} />
                  </View>
                  <Text
                    style={{
                      color: theme.colors.textPrimary,
                      fontSize: typography.fontSizes.md,
                      fontWeight: typography.fontWeights.bold,
                      flex: 1,
                    }}
                    numberOfLines={1}
                  >
                    {localizedCategoryName}
                  </Text>
                </View>

                <View style={{ alignItems: 'flex-end' }}>
                  <Text
                    style={{
                      color: theme.colors.textPrimary,
                      fontSize: typography.fontSizes.md,
                      fontWeight: typography.fontWeights.heavy,
                    }}
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
