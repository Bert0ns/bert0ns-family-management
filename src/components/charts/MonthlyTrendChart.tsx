import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useTheme } from '@/theme';
import { useI18n } from '@/i18n';
import { MonthlyTrendPoint } from '@/services/interfaces';
import { Card } from '@/components/common/Card';
import { TrendingUp, TrendingDown, Minus, Calendar } from 'lucide-react-native';

interface MonthlyTrendChartProps {
  data: MonthlyTrendPoint[];
  currency?: string;
  onSelectPeriod?: (period: string) => void;
  selectedPeriod?: string;
}

export function formatPeriodLabel(period: string): string {
  if (!period || !/^\d{4}-\d{2}$/.test(period)) return period;
  const parts = period.split('-');
  const monthNum = parseInt(parts[1], 10);
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  const monthName = months[monthNum - 1] || parts[1];
  const yearShort = parts[0].slice(2);
  return `${monthName} '${yearShort}`;
}

export const MonthlyTrendChart: React.FC<MonthlyTrendChartProps> = ({
  data,
  currency = '€',
  onSelectPeriod,
  selectedPeriod,
}) => {
  const { theme, spacing, radius, typography } = useTheme();
  const { t } = useI18n();

  const [activePeriod, setActivePeriod] = useState<string | null>(
    selectedPeriod || (data && data.length > 0 ? data[data.length - 1].period : null),
  );

  if (!data || data.length === 0) {
    return (
      <Card padding="lg">
        <View style={{ alignItems: 'center', paddingVertical: spacing.lg }}>
          <Text style={{ color: theme.colors.textSecondary, fontSize: typography.fontSizes.sm }}>
            {t.analytics.noHistoricalData}
          </Text>
        </View>
      </Card>
    );
  }

  const maxSpend = Math.max(...data.map((d) => d.totalSpend), 100);
  const activePoint = data.find((d) => d.period === activePeriod) || data[data.length - 1];

  const handleSelect = (period: string) => {
    setActivePeriod(period);
    onSelectPeriod?.(period);
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
            {t.analytics.historicalTrendsTitle}
          </Text>
          <Text
            style={{
              color: theme.colors.textSecondary,
              fontSize: typography.fontSizes.xs,
              marginTop: 2,
            }}
          >
            {t.analytics.historicalTrendsSubtitle}
          </Text>
        </View>

        {activePoint && (
          <View
            style={{
              backgroundColor: theme.colors.surfaceSubtle,
              paddingHorizontal: spacing.sm,
              paddingVertical: spacing.xs,
              borderRadius: radius.md,
              borderWidth: 1,
              borderColor: theme.colors.border,
              alignItems: 'flex-end',
            }}
          >
            <Text
              style={{
                color: theme.colors.textPrimary,
                fontSize: typography.fontSizes.md,
                fontWeight: typography.fontWeights.heavy,
              }}
            >
              {currency}
              {activePoint.totalSpend.toFixed(0)}
            </Text>
            <Text
              style={{
                color: theme.colors.textSecondary,
                fontSize: 10,
                fontWeight: typography.fontWeights.semibold,
              }}
            >
              {formatPeriodLabel(activePoint.period)}
            </Text>
          </View>
        )}
      </View>

      {/* Historical Bars */}
      <View
        style={{
          height: 180,
          flexDirection: 'row',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          paddingTop: spacing.lg,
          paddingBottom: spacing.xs,
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.border,
        }}
      >
        {data.map((point) => {
          const isSelected = point.period === activePeriod;
          const barHeightRatio = Math.max(point.totalSpend / maxSpend, 0.04);
          const barHeight = Math.min(barHeightRatio * 130, 130);

          return (
            <TouchableOpacity
              key={point.period}
              onPress={() => handleSelect(point.period)}
              activeOpacity={0.7}
              style={{
                flex: 1,
                alignItems: 'center',
                justifyContent: 'flex-end',
                height: '100%',
                paddingHorizontal: 2,
              }}
            >
              {/* MoM Badge over Bar */}
              <View
                style={{
                  minHeight: 20,
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginBottom: 4,
                }}
              >
                {point.momGrowthPercentage !== null && (
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor:
                        point.momGrowthPercentage > 0
                          ? theme.colors.dangerBg
                          : point.momGrowthPercentage < 0
                            ? theme.colors.successBg
                            : theme.colors.surfaceSubtle,
                      paddingHorizontal: 4,
                      paddingVertical: 1,
                      borderRadius: radius.xs,
                    }}
                  >
                    {point.momGrowthPercentage > 0 ? (
                      <TrendingUp size={9} color={theme.colors.danger} />
                    ) : point.momGrowthPercentage < 0 ? (
                      <TrendingDown size={9} color={theme.colors.success} />
                    ) : (
                      <Minus size={9} color={theme.colors.textSecondary} />
                    )}
                    <Text
                      style={{
                        fontSize: 9,
                        fontWeight: typography.fontWeights.bold,
                        color:
                          point.momGrowthPercentage > 0
                            ? '#EF4444'
                            : point.momGrowthPercentage < 0
                              ? '#10B981'
                              : theme.colors.textSecondary,
                        marginLeft: 1,
                      }}
                    >
                      {Math.abs(point.momGrowthPercentage).toFixed(0)}%
                    </Text>
                  </View>
                )}
              </View>

              {/* Bar */}
              <View
                style={{
                  width: '70%',
                  maxWidth: 28,
                  height: barHeight,
                  backgroundColor: isSelected ? theme.colors.brand : theme.colors.brandLight,
                  borderTopLeftRadius: radius.sm,
                  borderTopRightRadius: radius.sm,
                  borderWidth: isSelected ? 1.5 : 0,
                  borderColor: theme.colors.brand,
                }}
              />

              {/* Month Label */}
              <Text
                style={{
                  marginTop: 6,
                  fontSize: 10,
                  fontWeight: isSelected
                    ? typography.fontWeights.bold
                    : typography.fontWeights.medium,
                  color: isSelected ? theme.colors.brand : theme.colors.textSecondary,
                  textAlign: 'center',
                }}
                numberOfLines={1}
              >
                {formatPeriodLabel(point.period)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Selected Month Inspector Tray */}
      {activePoint && (
        <View
          style={{
            marginTop: spacing.md,
            backgroundColor: theme.colors.surfaceSubtle,
            borderRadius: radius.md,
            padding: spacing.md,
            borderWidth: 1,
            borderColor: theme.colors.border,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: spacing.xs,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
              <Calendar size={14} color={theme.colors.brand} />
              <Text
                style={{
                  color: theme.colors.textPrimary,
                  fontSize: typography.fontSizes.sm,
                  fontWeight: typography.fontWeights.bold,
                }}
              >
                {formatPeriodLabel(activePoint.period)}
              </Text>
            </View>

            <Text
              style={{
                color: theme.colors.textSecondary,
                fontSize: typography.fontSizes.xs,
              }}
            >
              {activePoint.transactionCount} {t.dashboard.txs}
            </Text>
          </View>

          <View
            style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.xs }}
          >
            <View>
              <Text style={{ color: theme.colors.textSecondary, fontSize: 11 }}>
                {t.analytics.totalSpend}
              </Text>
              <Text
                style={{
                  color: theme.colors.textPrimary,
                  fontSize: typography.fontSizes.md,
                  fontWeight: typography.fontWeights.heavy,
                }}
              >
                {currency}
                {activePoint.totalSpend.toFixed(2)}
              </Text>
            </View>

            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ color: theme.colors.textSecondary, fontSize: 11 }}>
                {t.analytics.rollingAvgLabel}
              </Text>
              <Text
                style={{
                  color: theme.colors.textPrimary,
                  fontSize: typography.fontSizes.md,
                  fontWeight: typography.fontWeights.heavy,
                }}
              >
                {currency}
                {activePoint.rollingAverage.toFixed(2)}
              </Text>
            </View>
          </View>
        </View>
      )}
    </Card>
  );
};
