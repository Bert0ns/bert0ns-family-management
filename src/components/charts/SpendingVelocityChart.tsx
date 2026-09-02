import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { useTheme } from '@/theme';
import { DailySpendPoint } from '@/services/analytics';
import { Card } from '@/components/common/Card';

interface SpendingVelocityChartProps {
  data: DailySpendPoint[];
  totalBudget: number;
  currency?: string;
}

export const SpendingVelocityChart: React.FC<SpendingVelocityChartProps> = ({
  data,
  totalBudget,
  currency = '€',
}) => {
  const { theme, spacing, radius, typography } = useTheme();

  if (!data || data.length === 0) return null;

  // Downsample to max ~10 points for readable chart rendering
  const step = Math.max(1, Math.floor(data.length / 8));
  const sampled = data.filter((_, idx) => idx % step === 0 || idx === data.length - 1);

  const lineData = sampled.map((p) => ({
    value: p.cumulativeAmount,
    label: `${p.day}`,
    dataPointText: '',
  }));

  const maxCumulative = Math.max(...data.map((d) => d.cumulativeAmount), totalBudget);

  return (
    <Card padding="md">
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: spacing.md,
        }}
      >
        <Text
          style={{
            color: theme.colors.textPrimary,
            fontSize: typography.fontSizes.lg,
            fontWeight: typography.fontWeights.bold,
          }}
        >
          Monthly Spend Velocity
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <View
            style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: theme.colors.brand }}
          />
          <Text style={{ color: theme.colors.textSecondary, fontSize: typography.fontSizes.xs }}>
            Actual
          </Text>
          <View
            style={{ width: 10, height: 2, backgroundColor: theme.colors.danger, marginLeft: 4 }}
          />
          <Text style={{ color: theme.colors.textSecondary, fontSize: typography.fontSizes.xs }}>
            Budget
          </Text>
        </View>
      </View>

      <View style={{ alignItems: 'center', overflow: 'hidden' }}>
        <LineChart
          data={lineData}
          color={theme.colors.brand}
          thickness={3}
          startFillColor={`${theme.colors.brand}40`}
          endFillColor={`${theme.colors.brand}05`}
          startOpacity={0.9}
          endOpacity={0.2}
          areaChart
          yAxisColor={theme.colors.border}
          xAxisColor={theme.colors.border}
          yAxisTextStyle={{ color: theme.colors.textMuted, fontSize: 10 }}
          xAxisLabelTextStyle={{ color: theme.colors.textSecondary, fontSize: 10 }}
          noOfSections={4}
          maxValue={maxCumulative * 1.15}
          height={160}
          curved
          showVerticalLines={false}
          rulesColor={theme.colors.surfaceSubtle}
          showReferenceLine1
          referenceLine1Position={totalBudget}
          referenceLine1Config={{
            color: theme.colors.danger,
            dashWidth: 4,
            dashGap: 4,
            thickness: 1.5,
          }}
        />
      </View>

      <Text
        style={{
          color: theme.colors.textMuted,
          fontSize: typography.fontSizes.xs,
          textAlign: 'center',
          marginTop: spacing.sm,
        }}
      >
        Day of month
      </Text>
    </Card>
  );
};
