import React from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '@/theme';
import { useI18n } from '@/i18n';
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
  const { t } = useI18n();

  const maxDaily = data.reduce((max, d) => Math.max(max, d.dailyAmount), 10);

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
  const colWidth = `${100 / 7}%` as const;

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
        {t.analytics.heatmapTitle}
      </Text>

      {/* Weekday headers */}
      <View style={{ flexDirection: 'row', marginBottom: spacing.xs }}>
        {dayHeaders.map((dh, i) => (
          <View key={i} style={{ width: colWidth, alignItems: 'center' }}>
            <Text
              style={{
                textAlign: 'center',
                color: theme.colors.textMuted,
                fontSize: typography.fontSizes.xs,
                fontWeight: typography.fontWeights.semibold,
              }}
            >
              {dh}
            </Text>
          </View>
        ))}
      </View>

      {/* Calendar Grid */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {/* Empty placeholder cells for start offset */}
        {Array.from({ length: adjustedFirstDay }).map((_, i) => (
          <View key={`empty-${i}`} style={{ width: colWidth, height: 34, padding: 2 }} />
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
                width: colWidth,
                height: 34,
                padding: 2,
              }}
            >
              <View
                style={{
                  flex: 1,
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
        <Text style={{ color: theme.colors.textMuted, fontSize: 10 }}>{t.analytics.less}</Text>
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
        <Text style={{ color: theme.colors.textMuted, fontSize: 10 }}>{t.analytics.more}</Text>
      </View>
    </Card>
  );
};
