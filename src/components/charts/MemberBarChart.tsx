import React from 'react';
import { View, Text, ScrollView } from 'react-native';
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
  onSelectMember: _onSelectMember,
}) => {
  const { theme, spacing, typography } = useTheme();
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
        </ScrollView>
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
                colorCode={item.member.color_code}
                size="sm"
              />
              <Text
                style={{
                  color: theme.colors.textPrimary,
                  fontSize: typography.fontSizes.sm,
                  fontWeight: typography.fontWeights.medium,
                  flexShrink: 1,
                }}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {item.member.display_name}
              </Text>
            </View>

            <View style={{ alignItems: 'flex-end', flexShrink: 0 }}>
              <Text
                style={{
                  color: theme.colors.textPrimary,
                  fontSize: typography.fontSizes.sm,
                  fontWeight: typography.fontWeights.bold,
                }}
                numberOfLines={1}
              >
                {currency}
                {item.total.toFixed(2)}
              </Text>
              <Text
                style={{ color: theme.colors.textMuted, fontSize: typography.fontSizes.xs }}
                numberOfLines={1}
              >
                {item.percentage.toFixed(1)}%
              </Text>
            </View>
          </View>
        ))}
      </View>
    </Card>
  );
};
