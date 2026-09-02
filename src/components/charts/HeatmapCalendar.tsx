import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/theme';
import { DailySpendPoint } from '@/services/analytics';
import { Card } from '@/components/common/Card';

interface HeatmapCalendarProps {
  data: DailySpendPoint[];
  period: string; // YYYY-MM
  currency?: string;
}

export const HeatmapCalendar: React.FC<HeatmapCalendarProps> = ({
  data,
  period,
  currency = '€',
}) => {
  const { theme, spacing, radius, typography } = useTheme();

  const maxDaily = Math.max(...data.map((d) => d.dailyAmount), 10);

  const getHeatColor = (amount: number) => {
    if (amount === 0) return theme.colors.surfaceSubtle;
    const ratio = amount / maxDaily;
    if (ratio < 0.25) return `${theme.colors.brand}30`;
    if (ratio < 0.5) return `${theme.colors.brand}60`;
    if (ratio < 0.75) return `${theme.colors.brand}A0`;
    return theme.colors.brand;
  };

  const [yearStr, monthStr] = period.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const firstDayOfWeek = new Date(year, month - 1, 1).getDay(); // 0 = Sun
  const adjustedFirstDay = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1; // 0 = Mon

  const daysInMonth = new Date(year, month, 0).getDate();

  const dayHeaders = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

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
        Daily Spending Heatmap
      </Text>

      {/* Weekday headers */}
      <View
        style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xs }}
      >
        {dayHeaders.map((dh, i) => (
          <Text
            key={i}
            style={{
              width: 32,
              textAlign: 'center',
              color: theme.colors.textMuted,
              fontSize: typography.fontSizes.xs,
              fontWeight: typography.fontWeights.semibold,
            }}
          >
            {dh}
          </Text>
        ))}
      </View>

      {/* Calendar Grid */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
        {/* Empty placeholder cells for start offset */}
        {Array.from({ length: adjustedFirstDay }).map((_, i) => (
          <View key={`empty-${i}`} style={{ width: 32, height: 32 }} />
        ))}

        {/* Day cells */}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const dayNum = i + 1;
          const dayData = data.find((d) => d.day === dayNum);
          const amount = dayData ? dayData.dailyAmount : 0;
          const cellBg = getHeatColor(amount);
          const isHigh = amount > maxDaily * 0.5;

          return (
            <View
              key={`day-${dayNum}`}
              style={{
                width: 32,
                height: 32,
                borderRadius: radius.xs,
                backgroundColor: cellBg,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text
                style={{
                  fontSize: 10,
                  fontWeight: typography.fontWeights.semibold,
                  color: isHigh ? '#FFFFFF' : theme.colors.textPrimary,
                }}
              >
                {dayNum}
              </Text>
            </View>
          );
        })}
      </View>

      {/* Legend */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'flex-end',
          marginTop: spacing.md,
          gap: spacing.xs,
        }}
      >
        <Text style={{ color: theme.colors.textMuted, fontSize: 10 }}>Less</Text>
        <View
          style={{
            width: 12,
            height: 12,
            borderRadius: 2,
            backgroundColor: theme.colors.surfaceSubtle,
          }}
        />
        <View
          style={{
            width: 12,
            height: 12,
            borderRadius: 2,
            backgroundColor: `${theme.colors.brand}30`,
          }}
        />
        <View
          style={{
            width: 12,
            height: 12,
            borderRadius: 2,
            backgroundColor: `${theme.colors.brand}60`,
          }}
        />
        <View
          style={{
            width: 12,
            height: 12,
            borderRadius: 2,
            backgroundColor: `${theme.colors.brand}A0`,
          }}
        />
        <View
          style={{ width: 12, height: 12, borderRadius: 2, backgroundColor: theme.colors.brand }}
        />
        <Text style={{ color: theme.colors.textMuted, fontSize: 10 }}>More</Text>
      </View>
    </Card>
  );
};
