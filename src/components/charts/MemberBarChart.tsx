import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
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

  const maxTotal = Math.max(...data.map((d) => d.total), 100);

  const barData = data.map((item) => ({
    value: item.total,
    label: item.member.display_name,
    frontColor: item.member.color_code || theme.colors.brand,
    topLabelComponent: () => (
      <Text
        style={{
          color: theme.colors.textSecondary,
          fontSize: 10,
          fontWeight: typography.fontWeights.semibold,
          marginBottom: 4,
        }}
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
      >
        {t.analytics.memberSpendingTitle}
      </Text>

      <View style={{ alignItems: 'center', marginTop: spacing.sm }}>
        <BarChart
          data={barData}
          barWidth={32}
          spacing={24}
          roundedTop
          roundedBottom
          hideRules
          xAxisThickness={1}
          yAxisThickness={0}
          xAxisColor={theme.colors.border}
          yAxisTextStyle={{ color: theme.colors.textMuted, fontSize: 10 }}
          xAxisLabelTextStyle={{
            color: theme.colors.textSecondary,
            fontSize: 11,
            fontWeight: typography.fontWeights.medium,
          }}
          noOfSections={4}
          maxValue={maxTotal * 1.25}
          height={160}
        />
      </View>

      {/* Member cards list */}
      <View style={{ marginTop: spacing.md, gap: spacing.sm }}>
        {data.map((item) => (
          <View
            key={item.member.id}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingVertical: spacing.xs,
              paddingHorizontal: spacing.sm,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <Avatar
                name={item.member.display_name}
                avatarUrl={item.member.avatar_url}
                colorCode={item.member.color_code}
                size="sm"
              />
              <Text
                style={{
                  color: theme.colors.textPrimary,
                  fontSize: typography.fontSizes.sm,
                  fontWeight: typography.fontWeights.medium,
                }}
              >
                {item.member.display_name}
              </Text>
            </View>

            <View style={{ alignItems: 'flex-end' }}>
              <Text
                style={{
                  color: theme.colors.textPrimary,
                  fontSize: typography.fontSizes.sm,
                  fontWeight: typography.fontWeights.bold,
                }}
              >
                {currency}
                {item.total.toFixed(2)}
              </Text>
              <Text style={{ color: theme.colors.textMuted, fontSize: typography.fontSizes.xs }}>
                {item.percentage.toFixed(1)}%
              </Text>
            </View>
          </View>
        ))}
      </View>
    </Card>
  );
};
