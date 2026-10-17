import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { BarChart } from 'react-native-gifted-charts';
import { useTheme } from '@/theme';
import { useI18n } from '@/i18n';
import { MemberSummary } from '@/services/analytics';
import { Avatar } from '@/components/common/Avatar';
import { Card } from '@/components/common/Card';

interface MemberBarChartProps {
  data: MemberSummary[];
  currency?: string;
  onSelectMember?: (memberId: string) => void;
}

export const MemberBarChart: React.FC<MemberBarChartProps> = ({
  data,
  currency = '€',
  onSelectMember,
}) => {
  const { theme, spacing, radius, typography } = useTheme();
  const { t } = useI18n();

  if (!data || data.length === 0) {
    return (
      <Card padding="md" style={{ alignItems: 'center', justifyContent: 'center', minHeight: 180 }}>
        <Text style={{ color: theme.colors.textMuted, fontSize: typography.fontSizes.md }}>
          {t.dashboard.noExpensesMonth}
        </Text>
      </Card>
    );
  }

  const maxTotal = Math.max(...data.map((d) => d.total), 100);

  const barData = data.map((item) => ({
    value: item.total,
    label: item.member.display_name,
    frontColor: item.member.color_code || theme.colors.brand,
    topLabelComponent: () => (
      <Text
        style={{
          color: theme.colors.textPrimary,
          fontSize: typography.fontSizes.sm,
          fontWeight: typography.fontWeights.bold,
          fontVariant: ['tabular-nums'],
          marginBottom: 4,
        }}
        numberOfLines={1}
      >
        {currency}
        {item.total > 999 ? `${(item.total / 1000).toFixed(1)}k` : item.total.toFixed(0)}
      </Text>
    ),
  }));

  return (
    <Card padding="md">
      <Text
        style={{
          color: theme.colors.textPrimary,
          fontSize: typography.fontSizes.lg,
          fontWeight: typography.fontWeights.bold,
          marginBottom: spacing.md,
        }}
        numberOfLines={1}
      >
        {t.analytics.memberSpendingTitle}
      </Text>

      <View style={{ alignItems: 'center', marginTop: spacing.sm, width: '100%' }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: '100%',
            paddingVertical: spacing.xs,
          }}
        >
          <BarChart
            data={barData}
            barWidth={36}
            spacing={28}
            barBorderTopLeftRadius={radius.sm}
            barBorderTopRightRadius={radius.sm}
            hideRules
            xAxisThickness={1}
            yAxisThickness={0}
            xAxisColor={theme.colors.borderTactile}
            yAxisTextStyle={{
              color: theme.colors.textSecondary,
              fontSize: typography.fontSizes.xs,
            }}
            xAxisLabelTextStyle={{
              color: theme.colors.textPrimary,
              fontSize: typography.fontSizes.sm,
              fontWeight: typography.fontWeights.semibold,
            }}
            noOfSections={4}
            maxValue={maxTotal * 1.25}
            height={180}
          />
        </ScrollView>
      </View>

      {/* Member cards list */}
      <View style={{ marginTop: spacing.lg, gap: spacing.md }}>
        {data.map((item) => {
          const pct = Math.min(Math.max(item.percentage, 0), 100);
          const memberColor = item.member.color_code || theme.colors.brand;

          return (
            <TouchableOpacity
              key={item.member.id}
              activeOpacity={onSelectMember ? 0.7 : 1}
              disabled={!onSelectMember}
              onPress={() => onSelectMember?.(item.member.id)}
              accessibilityRole={onSelectMember ? 'button' : undefined}
              accessibilityLabel={`${item.member.display_name}, ${currency}${item.total.toFixed(2)}, ${item.percentage.toFixed(1)}%`}
              style={{
                paddingVertical: spacing.sm + 2,
                paddingHorizontal: spacing.md,
                backgroundColor: theme.colors.card,
                borderRadius: radius.md,
                borderWidth: 1.5,
                borderColor: theme.colors.borderTactile,
                gap: spacing.sm,
              }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: spacing.sm,
                }}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: spacing.sm,
                    flex: 1,
                    minWidth: 0,
                  }}
                >
                  <Avatar
                    name={item.member.display_name}
                    avatarUrl={item.member.avatar_url}
                    colorCode={memberColor}
                    size="md"
                  />
                  <Text
                    style={{
                      color: theme.colors.textPrimary,
                      fontSize: typography.fontSizes.md,
                      fontWeight: typography.fontWeights.bold,
                      flexShrink: 1,
                    }}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {item.member.display_name}
                  </Text>
                </View>

                <View style={{ alignItems: 'flex-end', flexShrink: 0, gap: 2 }}>
                  <Text
                    style={{
                      color: theme.colors.textPrimary,
                      fontSize: typography.fontSizes.md,
                      fontWeight: typography.fontWeights.heavy,
                      fontVariant: ['tabular-nums'],
                    }}
                    numberOfLines={1}
                  >
                    {currency}
                    {item.total.toFixed(2)}
                  </Text>
                  <Text
                    style={{
                      color: theme.colors.textSecondary,
                      fontSize: typography.fontSizes.sm,
                      fontWeight: typography.fontWeights.semibold,
                      fontVariant: ['tabular-nums'],
                    }}
                    numberOfLines={1}
                  >
                    {item.percentage.toFixed(1)}%
                  </Text>
                </View>
              </View>

              {/* High-contrast progress bar track */}
              <View
                style={{
                  height: 12,
                  backgroundColor: theme.isDark
                    ? theme.colors.surfaceContainerHighest
                    : theme.colors.surfaceSubtle,
                  borderRadius: radius.full,
                  borderWidth: 1,
                  borderColor: theme.colors.borderTactile,
                  overflow: 'hidden',
                }}
              >
                <View
                  style={{
                    height: '100%',
                    width: `${pct}%`,
                    backgroundColor: memberColor,
                    borderRadius: radius.full,
                  }}
                />
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </Card>
  );
};
