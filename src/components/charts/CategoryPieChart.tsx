import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { PieChart } from 'react-native-gifted-charts';
import { useTheme } from '@/theme';
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
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const totalSpend = data.reduce((sum, item) => sum + item.total, 0);

  if (data.length === 0 || totalSpend === 0) {
    return (
      <Card padding="lg" style={{ alignItems: 'center', justifyContent: 'center', minHeight: 180 }}>
        <Text style={{ color: theme.colors.textMuted, fontSize: typography.fontSizes.md }}>
          No expenses recorded for this period
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
    <Card padding="md">
      <Text
        style={{
          color: theme.colors.textPrimary,
          fontSize: typography.fontSizes.lg,
          fontWeight: typography.fontWeights.bold,
          marginBottom: spacing.md,
        }}
      >
        Spending by Category
      </Text>

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
                    {activeCategory.category.name}
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
                  Total
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

      {/* Legend & Breakdown List */}
      <View style={{ marginTop: spacing.md, gap: spacing.sm }}>
        {data.slice(0, 5).map((item, idx) => {
          const isSelected = selectedIndex === idx;
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
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingVertical: spacing.xs,
                paddingHorizontal: spacing.sm,
                borderRadius: radius.sm,
                backgroundColor: isSelected ? theme.colors.surfaceSubtle : 'transparent',
              }}
            >
              <View
                style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 }}
              >
                <View
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: radius.sm,
                    backgroundColor: `${item.category.color}20`,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <IconHelper name={item.category.icon} size={15} color={item.category.color} />
                </View>
                <Text
                  style={{
                    color: theme.colors.textPrimary,
                    fontSize: typography.fontSizes.sm,
                    fontWeight: typography.fontWeights.medium,
                    flex: 1,
                  }}
                  numberOfLines={1}
                >
                  {item.category.name}
                </Text>
              </View>

              <View style={{ alignItems: 'flex-end' }}>
                <Text
                  style={{
                    color: theme.colors.textPrimary,
                    fontSize: typography.fontSizes.sm,
                    fontWeight: typography.fontWeights.bold,
                  }}
                >
                  {currency}
                  {item.total.toFixed(2)}
                </Text>
                <Text
                  style={{
                    color: theme.colors.textSecondary,
                    fontSize: typography.fontSizes.xs,
                  }}
                >
                  {item.percentage.toFixed(1)}% ({item.transactionCount})
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </Card>
  );
};
