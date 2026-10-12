import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop, Line } from 'react-native-svg';
import { useTheme } from '@/theme';
import { useI18n } from '@/i18n';
import { DailySpendPoint, ComparativeVelocityData } from '@/services/interfaces';
import { Card } from '@/components/common/Card';
import { Info, TrendingUp, TrendingDown, Minus } from 'lucide-react-native';

interface SpendingVelocityChartProps {
  data?: DailySpendPoint[];
  comparativeData?: ComparativeVelocityData;
  currency?: string;
}

export const SpendingVelocityChart: React.FC<SpendingVelocityChartProps> = ({
  data,
  comparativeData,
  currency = '€',
}) => {
  const { theme, spacing, radius, typography } = useTheme();
  const { t } = useI18n();
  const [chartWidth, setChartWidth] = useState<number>(300);
  const [inspectedDay, setInspectedDay] = useState<number | null>(null);

  const currentPoints = comparativeData ? comparativeData.currentPoints : data || [];
  const previousPoints = comparativeData ? comparativeData.previousPoints : [];

  if (!currentPoints || currentPoints.length === 0) return null;

  const chartHeight = 175;
  const paddingLeft = 35;
  const paddingRight = 16;
  const paddingTop = 16;
  const paddingBottom = 26;

  const innerWidth = Math.max(chartWidth - paddingLeft - paddingRight, 100);
  const innerHeight = chartHeight - paddingTop - paddingBottom;

  const safeCurrentAmounts = currentPoints.map((d) =>
    Number.isFinite(d.cumulativeAmount) ? d.cumulativeAmount : 0,
  );
  const safePreviousAmounts = previousPoints.map((d) =>
    Number.isFinite(d.cumulativeAmount) ? d.cumulativeAmount : 0,
  );

  const maxVal = Math.max(...safeCurrentAmounts, ...safePreviousAmounts, 50) * 1.15;
  const totalDays = Math.max(currentPoints.length, previousPoints.length, 28);

  const getX = (day: number) => {
    if (totalDays <= 1) return paddingLeft + innerWidth / 2;
    const pos = paddingLeft + ((day - 1) / (totalDays - 1)) * innerWidth;
    return Number.isFinite(pos) ? pos : paddingLeft;
  };

  const getY = (val: number) => {
    if (!Number.isFinite(val) || maxVal <= 0) return paddingTop + innerHeight;
    const normalized = Math.min(Math.max(val / maxVal, 0), 1);
    const pos = paddingTop + innerHeight - normalized * innerHeight;
    return Number.isFinite(pos) ? pos : paddingTop + innerHeight;
  };

  // Build SVG paths
  const generatePaths = (pointsData: DailySpendPoint[]) => {
    const coords = pointsData.map((d) => ({
      x: getX(d.day),
      y: getY(Number.isFinite(d.cumulativeAmount) ? d.cumulativeAmount : 0),
    }));

    if (coords.length === 0) return { linePath: '', areaPath: '', coords: [] };

    let linePath = `M ${coords[0].x} ${coords[0].y}`;
    for (let i = 1; i < coords.length; i++) {
      const p0 = coords[i - 1];
      const p1 = coords[i];
      const midX = (p0.x + p1.x) / 2;
      linePath += ` C ${midX} ${p0.y}, ${midX} ${p1.y}, ${p1.x} ${p1.y}`;
    }

    const lastPoint = coords[coords.length - 1];
    const firstPoint = coords[0];
    const bottomY = paddingTop + innerHeight;
    const areaPath = `${linePath} L ${lastPoint.x} ${bottomY} L ${firstPoint.x} ${bottomY} Z`;

    return { linePath, areaPath, coords };
  };

  const currentGenerated = generatePaths(currentPoints);
  const previousGenerated = generatePaths(previousPoints);

  const lastCumulative = currentPoints[currentPoints.length - 1]?.cumulativeAmount || 0;

  // Selected or active inspection point
  const currentDayNum =
    inspectedDay ?? (comparativeData ? comparativeData.currentElapsedDays : currentPoints.length);
  const currentDayPoint = currentPoints.find((p) => p.day === currentDayNum);
  const prevDayPoint = previousPoints.find((p) => p.day === currentDayNum);

  const currentDaySpend = currentDayPoint ? currentDayPoint.cumulativeAmount : 0;
  const prevDaySpend = prevDayPoint ? prevDayPoint.cumulativeAmount : 0;
  const dayDelta = currentDaySpend - prevDaySpend;

  // Pacing notice
  let pacingNotice = t.analytics.spendingPaceNotice;
  let pacingBadgeColor = theme.colors.textSecondary;
  if (comparativeData && comparativeData.pacingPercentage !== null) {
    if (comparativeData.pacingPercentage > 5) {
      pacingNotice = t.analytics.pacingAheadNotice;
      pacingBadgeColor = '#EF4444'; // Higher spending pacing
    } else if (comparativeData.pacingPercentage < -5) {
      pacingNotice = t.analytics.pacingBehindNotice;
      pacingBadgeColor = '#10B981'; // Lower spending pacing
    } else {
      pacingNotice = t.analytics.pacingEqualNotice;
    }
  }

  return (
    <Card padding="lg">
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: spacing.sm,
        }}
      >
        <View style={{ flex: 1, minWidth: 0, marginRight: spacing.sm }}>
          <Text
            style={{
              color: theme.colors.textPrimary,
              fontSize: typography.fontSizes.lg,
              fontWeight: typography.fontWeights.heavy,
            }}
            numberOfLines={1}
          >
            {comparativeData ? t.analytics.comparativeVelocityTitle : t.analytics.velocityTitle}
          </Text>
          <Text
            style={{
              color: theme.colors.textSecondary,
              fontSize: typography.fontSizes.xs,
              marginTop: 2,
            }}
            numberOfLines={1}
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
            flexShrink: 0,
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

      {/* Legend for Comparative Curves */}
      {comparativeData && previousPoints.length > 0 && (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.md,
            marginBottom: spacing.xs,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View
              style={{ width: 12, height: 3, backgroundColor: theme.colors.brand, borderRadius: 2 }}
            />
            <Text
              style={{
                color: theme.colors.textSecondary,
                fontSize: 11,
                fontWeight: typography.fontWeights.semibold,
              }}
            >
              {t.analytics.currentMonthLabel}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View
              style={{
                width: 12,
                height: 2,
                backgroundColor: '#94A3B8',
                borderStyle: 'dashed',
                borderWidth: 1,
                borderColor: '#94A3B8',
              }}
            />
            <Text
              style={{
                color: theme.colors.textSecondary,
                fontSize: 11,
                fontWeight: typography.fontWeights.semibold,
              }}
            >
              {t.analytics.previousMonthLabel}
            </Text>
          </View>
        </View>
      )}

      {/* SVG Trajectory Chart */}
      <View
        onLayout={(e) => {
          const { width } = e.nativeEvent.layout;
          if (width > 0) setChartWidth(width);
        }}
        style={{ height: chartHeight, width: '100%', overflow: 'hidden' }}
      >
        <Svg width={chartWidth} height={chartHeight}>
          <Defs>
            <LinearGradient id="gradientArea" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor={theme.colors.brand} stopOpacity={0.35} />
              <Stop offset="100%" stopColor={theme.colors.brand} stopOpacity={0.0} />
            </LinearGradient>
          </Defs>

          {/* Area Fill for current month */}
          {currentGenerated.areaPath ? (
            <Path d={currentGenerated.areaPath} fill="url(#gradientArea)" />
          ) : null}

          {/* Previous Month Dashed Line */}
          {previousGenerated.linePath ? (
            <Path
              d={previousGenerated.linePath}
              fill="none"
              stroke="#94A3B8"
              strokeWidth={2}
              strokeDasharray="5, 5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : null}

          {/* Current Month Bold Velocity Line */}
          {currentGenerated.linePath ? (
            <Path
              d={currentGenerated.linePath}
              fill="none"
              stroke={theme.colors.brand}
              strokeWidth={3.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : null}

          {/* Vertical scrubber line at inspected day */}
          {currentDayNum && (
            <Line
              x1={getX(currentDayNum)}
              y1={paddingTop}
              x2={getX(currentDayNum)}
              y2={paddingTop + innerHeight}
              stroke={theme.colors.border}
              strokeWidth={1.5}
              strokeDasharray="3, 3"
            />
          )}
        </Svg>
      </View>

      {/* Day Inspection Buttons / Mini Scrubber */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: spacing.xs,
          paddingHorizontal: 4,
        }}
      >
        {[1, 7, 14, 21, 28].map((day) => {
          if (day > totalDays) return null;
          const isSelected = currentDayNum === day;
          return (
            <TouchableOpacity
              key={day}
              onPress={() => setInspectedDay(day === inspectedDay ? null : day)}
              style={{
                paddingHorizontal: 6,
                paddingVertical: 2,
                borderRadius: radius.xs,
                backgroundColor: isSelected ? theme.colors.brand : theme.colors.surfaceSubtle,
              }}
            >
              <Text
                style={{
                  fontSize: 10,
                  fontWeight: isSelected
                    ? typography.fontWeights.bold
                    : typography.fontWeights.medium,
                  color: isSelected ? '#FFFFFF' : theme.colors.textSecondary,
                }}
              >
                {t.analytics.inspectDay} {day}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Day Comparison Tooltip / Box if comparativeData available */}
      {comparativeData && previousPoints.length > 0 && currentDayPoint && (
        <View
          style={{
            marginTop: spacing.sm,
            backgroundColor: theme.colors.surfaceSubtle,
            borderRadius: radius.md,
            padding: spacing.sm,
            borderWidth: 1,
            borderColor: theme.colors.border,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <View>
            <Text
              style={{
                color: theme.colors.textPrimary,
                fontSize: 12,
                fontWeight: typography.fontWeights.bold,
              }}
            >
              {t.analytics.inspectDay} {currentDayNum}: {currency}
              {currentDaySpend.toFixed(0)}
            </Text>
            <Text style={{ color: theme.colors.textSecondary, fontSize: 10 }}>
              {t.analytics.previousMonthLabel}: {currency}
              {prevDaySpend.toFixed(0)}
            </Text>
          </View>

          <View style={{ alignItems: 'flex-end' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
              {dayDelta > 0 ? (
                <TrendingUp size={12} color="#EF4444" />
              ) : dayDelta < 0 ? (
                <TrendingDown size={12} color="#10B981" />
              ) : (
                <Minus size={12} color={theme.colors.textSecondary} />
              )}
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: typography.fontWeights.heavy,
                  color:
                    dayDelta > 0
                      ? '#EF4444'
                      : dayDelta < 0
                        ? '#10B981'
                        : theme.colors.textSecondary,
                }}
              >
                {dayDelta >= 0 ? '+' : ''}
                {currency}
                {dayDelta.toFixed(0)}
              </Text>
            </View>
            <Text style={{ color: theme.colors.textSecondary, fontSize: 10 }}>
              {prevDaySpend > 0
                ? `${dayDelta >= 0 ? '+' : ''}${((dayDelta / prevDaySpend) * 100).toFixed(0)}%`
                : 'vs prev'}
            </Text>
          </View>
        </View>
      )}

      {/* Plain-English Takeaway Banner */}
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
        <Info size={20} color={pacingBadgeColor} style={{ flexShrink: 0 }} />
        <Text
          style={{
            color: theme.colors.textPrimary,
            fontSize: typography.fontSizes.sm,
            fontWeight: typography.fontWeights.semibold,
            flex: 1,
          }}
        >
          {pacingNotice}
        </Text>
      </View>
    </Card>
  );
};
