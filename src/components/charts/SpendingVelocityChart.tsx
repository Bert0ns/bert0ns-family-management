import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, {
  Path,
  Line,
  Circle,
  Text as SvgText,
  Defs,
  LinearGradient,
  Stop,
} from 'react-native-svg';
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
  const [chartWidth, setChartWidth] = useState<number>(320);

  if (!data || data.length === 0) return null;

  const chartHeight = 160;
  const paddingLeft = 45;
  const paddingRight = 16;
  const paddingTop = 16;
  const paddingBottom = 26;

  const innerWidth = Math.max(chartWidth - paddingLeft - paddingRight, 100);
  const innerHeight = chartHeight - paddingTop - paddingBottom;

  const maxVal = Math.max(...data.map((d) => d.cumulativeAmount), 50) * 1.15;
  const totalDays = data.length;

  const getX = (index: number) => {
    if (totalDays <= 1) return paddingLeft + innerWidth / 2;
    return paddingLeft + (index / (totalDays - 1)) * innerWidth;
  };

  const getY = (val: number) => {
    const normalized = Math.min(Math.max(val / maxVal, 0), 1);
    return paddingTop + innerHeight - normalized * innerHeight;
  };

  // Generate SVG path for the line
  const points = data.map((d, idx) => ({ x: getX(idx), y: getY(d.cumulativeAmount) }));

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

  // Y-axis grid marks (0%, 50%, 100%)
  const yTicks = [
    { val: maxVal * 0.9, label: `${currency}${Math.round(maxVal * 0.9)}` },
    { val: maxVal * 0.45, label: `${currency}${Math.round(maxVal * 0.45)}` },
    { val: 0, label: `${currency}0` },
  ];

  // X-axis day marks
  const xTicks = [1, 5, 10, 15, 20, 25, totalDays]
    .filter((day) => day <= totalDays)
    .map((day) => ({
      day,
      x: getX(day - 1),
    }));

  const lastCumulative = data[data.length - 1]?.cumulativeAmount || 0;
  const lastPoint = points[points.length - 1];

  return (
    <Card padding="md">
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: spacing.sm,
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
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
          <View
            style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: theme.colors.brand }}
          />
          <Text style={{ color: theme.colors.textSecondary, fontSize: typography.fontSizes.xs }}>
            {currency}
            {lastCumulative.toFixed(0)} total
          </Text>
        </View>
      </View>

      {/* SVG Container */}
      <View
        onLayout={(e) => {
          const width = e.nativeEvent.layout.width;
          if (width > 50) setChartWidth(width);
        }}
        style={{ width: '100%', height: chartHeight }}
      >
        <Svg width={chartWidth} height={chartHeight}>
          <Defs>
            <LinearGradient id="velocityGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor={theme.colors.brand} stopOpacity="0.35" />
              <Stop offset="100%" stopColor={theme.colors.brand} stopOpacity="0.02" />
            </LinearGradient>
          </Defs>

          {/* Grid lines & Y labels */}
          {yTicks.map((tick, i) => {
            const y = getY(tick.val);
            return (
              <React.Fragment key={`ytick-${i}`}>
                <Line
                  x1={paddingLeft}
                  y1={y}
                  x2={paddingLeft + innerWidth}
                  y2={y}
                  stroke={theme.colors.border}
                  strokeWidth="1"
                  strokeDasharray="4 4"
                />
                <SvgText
                  x={paddingLeft - 6}
                  y={y + 3}
                  fill={theme.colors.textMuted}
                  fontSize="9"
                  textAnchor="end"
                >
                  {tick.label}
                </SvgText>
              </React.Fragment>
            );
          })}

          {/* Area Fill */}
          {areaPath ? <Path d={areaPath} fill="url(#velocityGrad)" /> : null}

          {/* Curve Line */}
          {linePath ? (
            <Path
              d={linePath}
              fill="none"
              stroke={theme.colors.brand}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : null}

          {/* End Point Glow */}
          {lastPoint ? (
            <>
              <Circle
                cx={lastPoint.x}
                cy={lastPoint.y}
                r="6"
                fill={theme.colors.brandLight}
                opacity="0.6"
              />
              <Circle cx={lastPoint.x} cy={lastPoint.y} r="3.5" fill={theme.colors.brand} />
            </>
          ) : null}

          {/* X Axis Labels */}
          {xTicks.map((tick) => (
            <SvgText
              key={`xtick-${tick.day}`}
              x={tick.x}
              y={chartHeight - 6}
              fill={theme.colors.textMuted}
              fontSize="9"
              textAnchor="middle"
            >
              {tick.day}
            </SvgText>
          ))}
        </Svg>
      </View>

      <Text
        style={{
          color: theme.colors.textMuted,
          fontSize: 10,
          textAlign: 'center',
          marginTop: 2,
        }}
      >
        Day of month
      </Text>
    </Card>
  );
};
