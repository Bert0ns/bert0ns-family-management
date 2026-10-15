import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useTheme } from '@/theme';
import { useI18n } from '@/i18n';
import { DayOfWeekDistribution } from '@/services/interfaces';
import { Card } from '@/components/common/Card';
import { Sparkles } from 'lucide-react-native';

interface DayOfWeekChartProps {
  data: DayOfWeekDistribution;
  currency?: string;
}

export const DayOfWeekChart: React.FC<DayOfWeekChartProps> = ({ data, currency = '€' }) => {
  const { theme, spacing, radius, typography } = useTheme();
  const { t } = useI18n();

  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(
    data?.peakDay?.dayKey || null,
  );

  if (!data || !data.days || data.days.length === 0 || data.totalAmount === 0) {
    return (
      <Card padding="lg">
        <View style={{ alignItems: 'center', paddingVertical: spacing.lg }}>
          <Text style={{ color: theme.colors.textSecondary, fontSize: typography.fontSizes.sm }}>
            {t.analytics.noDayOfWeekData}
          </Text>
        </View>
      </Card>
    );
  }

  const maxDaySpend = Math.max(...data.days.map((d) => d.totalAmount), 10);
  const activeDay =
    data.days.find((d) => d.dayKey === selectedDayKey) || data.peakDay || data.days[0];

  const getDayName = (dayKey: string): string => {
    switch (dayKey) {
      case 'mon':
        return t.analytics.dayMon;
      case 'tue':
        return t.analytics.dayTue;
      case 'wed':
        return t.analytics.dayWed;
      case 'thu':
        return t.analytics.dayThu;
      case 'fri':
        return t.analytics.dayFri;
      case 'sat':
        return t.analytics.daySat;
      case 'sun':
        return t.analytics.daySun;
      default:
        return dayKey;
    }
  };

  return (
    <Card padding="lg">
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: spacing.md,
        }}
      >
        <View style={{ flex: 1, marginRight: spacing.sm }}>
          <Text
            style={{
              color: theme.colors.textPrimary,
              fontSize: typography.fontSizes.lg,
              fontWeight: typography.fontWeights.heavy,
            }}
          >
            {t.analytics.dayOfWeekTitle}
          </Text>
          <Text
            style={{
              color: theme.colors.textSecondary,
              fontSize: typography.fontSizes.xs,
              marginTop: 2,
            }}
          >
            {t.analytics.dayOfWeekSubtitle}
          </Text>
        </View>

        {data.peakDay && (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: theme.colors.warningBg,
              paddingHorizontal: spacing.sm,
              paddingVertical: spacing.xs,
              borderRadius: radius.md,
              gap: 4,
            }}
          >
            <Sparkles size={12} color={theme.colors.warning} />
            <Text
              style={{
                color: theme.colors.warning,
                fontSize: 11,
                fontWeight: typography.fontWeights.heavy,
              }}
            >
              {getDayName(data.peakDay.dayKey)}
            </Text>
          </View>
        )}
      </View>

      {/* Day Bars (Mon - Sun) */}
      <View
        style={{
          height: 160,
          flexDirection: 'row',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          paddingTop: spacing.md,
          paddingBottom: spacing.xs,
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.border,
        }}
      >
        {data.days.map((day) => {
          const isPeak = data.peakDay?.dayKey === day.dayKey;
          const isSelected = activeDay?.dayKey === day.dayKey;
          const ratio = Math.max(day.totalAmount / maxDaySpend, 0.05);
          const barHeight = Math.min(ratio * 110, 110);

          let barBg = theme.colors.brandLight;
          if (isSelected) {
            barBg = isPeak ? theme.colors.warning : theme.colors.brand;
          } else if (isPeak) {
            barBg = theme.colors.warningBg;
          }

          return (
            <TouchableOpacity
              key={day.dayKey}
              onPress={() => setSelectedDayKey(day.dayKey)}
              activeOpacity={0.7}
              style={{
                flex: 1,
                alignItems: 'center',
                justifyContent: 'flex-end',
                height: '100%',
                paddingHorizontal: 2,
              }}
            >
              {/* Value or percentage over bar */}
              <View
                style={{
                  minHeight: 18,
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginBottom: 2,
                }}
              >
                {day.percentage > 0 && (
                  <Text
                    style={{
                      fontSize: 9,
                      fontWeight: isSelected
                        ? typography.fontWeights.bold
                        : typography.fontWeights.medium,
                      color: isSelected ? theme.colors.textPrimary : theme.colors.textSecondary,
                    }}
                  >
                    {day.percentage.toFixed(0)}%
                  </Text>
                )}
              </View>

              {/* Bar */}
              <View
                style={{
                  width: '65%',
                  maxWidth: 24,
                  height: barHeight,
                  backgroundColor: barBg,
                  borderTopLeftRadius: radius.sm,
                  borderTopRightRadius: radius.sm,
                  borderWidth: isSelected ? 1.5 : 0,
                  borderColor: isPeak ? '#D97706' : theme.colors.brand,
                }}
              />

              {/* Day Label */}
              <Text
                style={{
                  marginTop: 6,
                  fontSize: 11,
                  fontWeight: isSelected
                    ? typography.fontWeights.bold
                    : typography.fontWeights.medium,
                  color: isSelected
                    ? isPeak
                      ? '#D97706'
                      : theme.colors.brand
                    : theme.colors.textSecondary,
                  textAlign: 'center',
                }}
              >
                {getDayName(day.dayKey)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Weekday vs Weekend Split Segmented Bar */}
      <View style={{ marginTop: spacing.md }}>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: spacing.xs,
          }}
        >
          <Text
            style={{
              color: theme.colors.textPrimary,
              fontSize: typography.fontSizes.xs,
              fontWeight: typography.fontWeights.bold,
            }}
          >
            {t.analytics.weekdayVsWeekend}
          </Text>
          <Text
            style={{
              color: theme.colors.textSecondary,
              fontSize: 11,
            }}
          >
            {data.weekdayPercentage.toFixed(0)}% / {data.weekendPercentage.toFixed(0)}%
          </Text>
        </View>

        {/* Stacked Progress Bar */}
        <View
          style={{
            height: 10,
            width: '100%',
            backgroundColor: theme.colors.surfaceSubtle,
            borderRadius: radius.full,
            flexDirection: 'row',
            overflow: 'hidden',
          }}
        >
          <View
            style={{
              width: `${Math.max(data.weekdayPercentage, 0)}%`,
              backgroundColor: theme.colors.brand,
            }}
          />
          <View
            style={{
              width: `${Math.max(data.weekendPercentage, 0)}%`,
              backgroundColor: theme.colors.brandSecondary,
            }}
          />
        </View>

        {/* Legend */}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: spacing.xs,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <View
              style={{
                width: 8,
                height: 8,
                borderRadius: radius.xs,
                backgroundColor: theme.colors.brand,
              }}
            />
            <Text style={{ color: theme.colors.textSecondary, fontSize: 11 }}>
              {t.analytics.weekdays}: {currency}
              {data.weekdayTotal.toFixed(0)}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <View
              style={{
                width: 8,
                height: 8,
                borderRadius: radius.xs,
                backgroundColor: theme.colors.brandSecondary,
              }}
            />
            <Text style={{ color: theme.colors.textSecondary, fontSize: 11 }}>
              {t.analytics.weekends}: {currency}
              {data.weekendTotal.toFixed(0)}
            </Text>
          </View>
        </View>
      </View>

      {/* Selected Day Details Tray */}
      {activeDay && (
        <View
          style={{
            marginTop: spacing.md,
            backgroundColor: theme.colors.surfaceSubtle,
            borderRadius: radius.md,
            padding: spacing.md,
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
                fontSize: typography.fontSizes.sm,
                fontWeight: typography.fontWeights.heavy,
              }}
            >
              {getDayName(activeDay.dayKey)}
            </Text>
            <Text style={{ color: theme.colors.textSecondary, fontSize: 11, marginTop: 2 }}>
              {activeDay.transactionCount} {t.dashboard.txs} ({activeDay.percentage.toFixed(1)}% of
              total)
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
              {activeDay.totalAmount.toFixed(2)}
            </Text>
            <Text style={{ color: theme.colors.textSecondary, fontSize: 11, marginTop: 2 }}>
              {t.analytics.avgTransaction}: {currency}
              {activeDay.averageTransaction.toFixed(2)}
            </Text>
          </View>
        </View>
      )}
    </Card>
  );
};
