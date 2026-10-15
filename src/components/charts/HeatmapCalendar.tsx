import React from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '@/theme';
import { useI18n } from '@/i18n';
import { DailySpendPoint } from '@/services/analytics';
import { Card } from '@/components/common/Card';
import { hexToRgba } from '@/utils/color';

interface HeatmapCalendarProps {
  data: DailySpendPoint[];
  period: string; // YYYY-MM
  currency?: string;
}

export function parseSafePeriod(period?: string): {
  year: number;
  month: number;
  daysInMonth: number;
  adjustedFirstDay: number;
} {
  const now = new Date();
  let year = now.getFullYear();
  let month = now.getMonth() + 1;

  if (period && typeof period === 'string') {
    const trimmed = period.trim();
    if (/^\d{4}-(0[1-9]|1[0-2])$/.test(trimmed)) {
      const [yearStr, monthStr] = trimmed.split('-');
      const parsedYear = parseInt(yearStr, 10);
      const parsedMonth = parseInt(monthStr, 10);
      if (!isNaN(parsedYear) && !isNaN(parsedMonth) && parsedMonth >= 1 && parsedMonth <= 12) {
        year = parsedYear;
        month = parsedMonth;
      }
    }
  }

  const rawFirstDay = new Date(year, month - 1, 1).getDay(); // 0 = Sun
  const rawDaysInMonth = new Date(year, month, 0).getDate();

  const adjustedFirstDay = isNaN(rawFirstDay)
    ? 0
    : rawFirstDay === 0
      ? 6
      : Math.max(0, Math.min(6, rawFirstDay - 1));
  const daysInMonth = isNaN(rawDaysInMonth) ? 30 : Math.max(1, Math.min(31, rawDaysInMonth));

  return { year, month, daysInMonth, adjustedFirstDay };
}

export const HeatmapCalendar: React.FC<HeatmapCalendarProps> = ({
  data,
  period,
  currency: _currency = '€',
}) => {
  const { theme, spacing, radius, typography } = useTheme();
  const { t, locale } = useI18n();

  const maxDaily = data.reduce((max, d) => Math.max(max, d.dailyAmount), 10);

  const getHeatColor = (amount: number) => {
    if (amount === 0) return theme.colors.surfaceSubtle;
    const ratio = amount / maxDaily;
    if (ratio < 0.25) return hexToRgba(theme.colors.brand, 0.2);
    if (ratio < 0.5) return hexToRgba(theme.colors.brand, 0.45);
    if (ratio < 0.75) return hexToRgba(theme.colors.brand, 0.7);
    return theme.colors.brand;
  };

  const { adjustedFirstDay, daysInMonth } = parseSafePeriod(period);

  const dateLocale = locale === 'it' ? 'it-IT' : 'en-US';
  const dayHeaders = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(2024, 0, 1 + i);
    return d.toLocaleDateString(dateLocale, { weekday: 'narrow' });
  });
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
                    color: isHigh ? theme.colors.textInverse : theme.colors.textPrimary,
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
            borderRadius: radius.xs,
            backgroundColor: theme.colors.surfaceSubtle,
          }}
        />
        <View
          style={{
            width: 12,
            height: 12,
            borderRadius: radius.xs,
            backgroundColor: hexToRgba(theme.colors.brand, 0.2),
          }}
        />
        <View
          style={{
            width: 12,
            height: 12,
            borderRadius: radius.xs,
            backgroundColor: hexToRgba(theme.colors.brand, 0.45),
          }}
        />
        <View
          style={{
            width: 12,
            height: 12,
            borderRadius: radius.xs,
            backgroundColor: hexToRgba(theme.colors.brand, 0.7),
          }}
        />
        <View
          style={{
            width: 12,
            height: 12,
            borderRadius: radius.xs,
            backgroundColor: theme.colors.brand,
          }}
        />
        <Text style={{ color: theme.colors.textMuted, fontSize: 10 }}>{t.analytics.more}</Text>
      </View>
    </Card>
  );
};
