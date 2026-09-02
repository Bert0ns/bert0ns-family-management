import React from 'react';
import { View, Text } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { useTheme } from '@/theme';
import { DailySpendPoint } from '@/services/interfaces';
import { Card } from '@/components/common/Card';

interface SpendingVelocityChartProps {
  data: DailySpendPoint[];
  currency?: string;
}

export const SpendingVelocityChart: React.FC<SpendingVelocityChartProps> = ({
  data,
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

  const maxCumulative = Math.max(...data.map((d) => d.cumulativeAmount), 100);

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
            Cumulative Spend
          </Text>
        </View>
      </View>

      <View style={{ alignItems: 'center', overflow: 'hidden' }}>
        <LineChart
          data={lineData}
          color={theme.colors.brand}
          thickness={3}
          startFillColor={theme.colors.brandLight}
          startOpacity={0.4}
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
