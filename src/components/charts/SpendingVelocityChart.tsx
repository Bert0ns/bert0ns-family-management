import React, { useState } from 'react';
import { View, Text } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';
import { useTheme } from '@/theme';
import { useI18n } from '@/i18n';
import { DailySpendPoint } from '@/services/interfaces';
import { Card } from '@/components/common/Card';
import { Info } from 'lucide-react-native';

interface SpendingVelocityChartProps {
  data: DailySpendPoint[];
  currency?: string;
}

export const SpendingVelocityChart: React.FC<SpendingVelocityChartProps> = ({
  data,
  currency = '€',
}) => {
  const { theme, spacing, radius, typography } = useTheme();
  const { t } = useI18n();
  const [chartWidth, setChartWidth] = useState<number>(320);

  if (!data || data.length === 0) return null;

  const chartHeight = 170;
  const paddingLeft = 45;
  const paddingRight = 16;
  const paddingTop = 16;
  const paddingBottom = 26;

  const innerWidth = Math.max(chartWidth - paddingLeft - paddingRight, 100);
  const innerHeight = chartHeight - paddingTop - paddingBottom;

  const safeAmounts = data.map((d) =>
    Number.isFinite(d.cumulativeAmount) ? d.cumulativeAmount : 0,
  );
  const maxVal = Math.max(...safeAmounts, 50) * 1.15;
  const totalDays = data.length;

  const getX = (index: number) => {
    if (totalDays <= 1) return paddingLeft + innerWidth / 2;
    const pos = paddingLeft + (index / (totalDays - 1)) * innerWidth;
    return Number.isFinite(pos) ? pos : paddingLeft;
  };

  const getY = (val: number) => {
    if (!Number.isFinite(val) || maxVal <= 0) return paddingTop + innerHeight;
    const normalized = Math.min(Math.max(val / maxVal, 0), 1);
    const pos = paddingTop + innerHeight - normalized * innerHeight;
    return Number.isFinite(pos) ? pos : paddingTop + innerHeight;
  };

  // Generate SVG path for the line
  const points = data.map((d, idx) => ({
    x: getX(idx),
    y: getY(Number.isFinite(d.cumulativeAmount) ? d.cumulativeAmount : 0),
  }));

  let linePath = '';
  let areaPath = '';

  if (points.length > 0) {
    linePath = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const p0 = points[i - 1];
      const p1 = points[i];
      const midX = (p0.x + p1.x) / 2;
      linePath += ` C ${midX} ${p0.y}, ${midX} ${p1.y}, ${p1.x} ${p1.y}`;
    }

    const lastPoint = points[points.length - 1];
    const firstPoint = points[0];
    const bottomY = paddingTop + innerHeight;
    areaPath = `${linePath} L ${lastPoint.x} ${bottomY} L ${firstPoint.x} ${bottomY} Z`;
  }

  const lastCumulative = data[data.length - 1]?.cumulativeAmount || 0;

  return (
    <Card padding="lg">
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: spacing.md,
        }}
      >
        <View>
          <Text
            style={{
              color: theme.colors.textPrimary,
              fontSize: typography.fontSizes.lg,
              fontWeight: typography.fontWeights.heavy,
            }}
          >
            {t.analytics.velocityTitle}
          </Text>
          <Text
            style={{
              color: theme.colors.textSecondary,
              fontSize: typography.fontSizes.xs,
              marginTop: 2,
            }}
          >
            {t.analytics.velocitySubtitle}
          </Text>
        </View>

        <View
          style={{
            backgroundColor: theme.colors.brandLight,
            paddingHorizontal: spacing.sm,
            paddingVertical: spacing.xs,
            borderRadius: radius.md,
            alignItems: 'flex-end',
          }}
        >
          <Text
            style={{
              color: theme.colors.brand,
              fontSize: typography.fontSizes.md,
              fontWeight: typography.fontWeights.heavy,
            }}
          >
            {currency}
            {lastCumulative.toFixed(0)}
          </Text>
        </View>
      </View>

      {/* SVG Trajectory Chart */}
      <View
        onLayout={(e) => {
          const { width } = e.nativeEvent.layout;
          if (width > 0) setChartWidth(width);
        }}
        style={{ height: chartHeight, width: '100%' }}
      >
        <Svg width={chartWidth} height={chartHeight}>
          <Defs>
            <LinearGradient id="gradientArea" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor={theme.colors.brand} stopOpacity={0.35} />
              <Stop offset="100%" stopColor={theme.colors.brand} stopOpacity={0.0} />
            </LinearGradient>
          </Defs>

          {/* Area Fill */}
          {areaPath ? <Path d={areaPath} fill="url(#gradientArea)" /> : null}

          {/* Bold Velocity Line */}
          {linePath ? (
            <Path
              d={linePath}
              fill="none"
              stroke={theme.colors.brand}
              strokeWidth={3.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : null}
        </Svg>
      </View>

      {/* Plain-English Takeaway Banner for Seniors */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
          backgroundColor: theme.colors.surfaceSubtle,
          padding: spacing.md,
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: theme.colors.border,
          marginTop: spacing.md,
        }}
      >
        <Info size={20} color={theme.colors.brand} />
        <Text
          style={{
            color: theme.colors.textPrimary,
            fontSize: typography.fontSizes.sm,
            fontWeight: typography.fontWeights.semibold,
            flex: 1,
          }}
        >
          {t.analytics.spendingPaceNotice}
        </Text>
      </View>
    </Card>
  );
};
