import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '@/theme';
import { useAppStore } from '@/services/store';
import {
  calculateCategoryBreakdown,
  calculateMemberContributions,
  calculateSpendingVelocity,
  calculateMonthlyMetrics,
} from '@/services/analytics';
import { Card } from '@/components/common/Card';
import { PeriodSelector } from '@/components/common/PeriodSelector';
import { CategoryPieChart } from '@/components/charts/CategoryPieChart';
import { MemberBarChart } from '@/components/charts/MemberBarChart';
import { SpendingVelocityChart } from '@/components/charts/SpendingVelocityChart';
import { HeatmapCalendar } from '@/components/charts/HeatmapCalendar';
import { IconHelper } from '@/components/common/IconHelper';

export default function AnalyticsScreen() {
  const { theme, spacing, radius, typography } = useTheme();
  const { family, members, categories, budgets, expenses, selectedPeriod, setSelectedPeriod } =
    useAppStore();

  const [activeTab, setActiveTab] = useState<'categories' | 'members' | 'trends' | 'heatmap'>(
    'categories',
  );

  const periodExpenses = expenses.filter((e) => e.transaction_date.startsWith(selectedPeriod));

  const metrics = calculateMonthlyMetrics(expenses, budgets, categories, members, selectedPeriod);

  const categoryBreakdown = calculateCategoryBreakdown(periodExpenses, categories);
  const memberContributions = calculateMemberContributions(periodExpenses, members);
  const velocityData = calculateSpendingVelocity(expenses, metrics.totalBudget, selectedPeriod);

  // Top Merchants summary
  const merchantMap = new Map<string, number>();
  periodExpenses.forEach((e) => {
    merchantMap.set(e.merchant_name, (merchantMap.get(e.merchant_name) || 0) + e.amount);
  });
  const topMerchants = Array.from(merchantMap.entries())
    .map(([name, total]) => ({ name, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.huge }}
      showsVerticalScrollIndicator={false}
    >
      {/* Interactive Month Stepper */}
      <View style={{ marginBottom: spacing.md }}>
        <PeriodSelector selectedPeriod={selectedPeriod} onPeriodChange={setSelectedPeriod} />
      </View>

      {/* Top Segmented Controls */}
      <View
        style={{
          flexDirection: 'row',
          backgroundColor: theme.colors.surfaceSubtle,
          borderRadius: radius.md,
          padding: 4,
          marginBottom: spacing.lg,
        }}
      >
        {(['categories', 'members', 'trends', 'heatmap'] as const).map((tab) => {
          const isActive = activeTab === tab;
          const label =
            tab === 'categories'
              ? 'Categories'
              : tab === 'members'
                ? 'Members'
                : tab === 'trends'
                  ? 'Trends'
                  : 'Heatmap';

          return (
            <TouchableOpacity
              key={tab}
              activeOpacity={0.8}
              onPress={() => setActiveTab(tab)}
              style={{
                flex: 1,
                paddingVertical: spacing.sm,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: radius.sm,
                backgroundColor: isActive ? theme.colors.surface : 'transparent',
                shadowColor: isActive ? theme.colors.shadow : 'transparent',
                shadowOpacity: isActive ? 0.1 : 0,
                shadowRadius: 4,
                elevation: isActive ? 2 : 0,
              }}
            >
              <Text
                style={{
                  fontSize: typography.fontSizes.sm,
                  fontWeight: isActive
                    ? typography.fontWeights.bold
                    : typography.fontWeights.medium,
                  color: isActive ? theme.colors.brand : theme.colors.textSecondary,
                }}
              >
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Main Chart View based on Tab */}
      {activeTab === 'categories' && (
        <View style={{ gap: spacing.lg }}>
          <CategoryPieChart data={categoryBreakdown} currency={family.currency} />

          {/* Top Merchants Leaderboard */}
          <Card padding="md">
            <Text
              style={{
                color: theme.colors.textPrimary,
                fontSize: typography.fontSizes.lg,
                fontWeight: typography.fontWeights.bold,
                marginBottom: spacing.md,
              }}
            >
              Top Merchants ({selectedPeriod})
            </Text>

            {topMerchants.length === 0 ? (
              <Text
                style={{
                  color: theme.colors.textMuted,
                  fontSize: typography.fontSizes.sm,
                  textAlign: 'center',
                  paddingVertical: spacing.md,
                }}
              >
                No merchant data available for this month
              </Text>
            ) : (
              <View style={{ gap: spacing.sm }}>
                {topMerchants.map((m, idx) => (
                  <View
                    key={m.name}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingVertical: spacing.xs,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                      <Text
                        style={{
                          color: theme.colors.textMuted,
                          fontSize: typography.fontSizes.xs,
                          width: 16,
                        }}
                      >
                        #{idx + 1}
                      </Text>
                      <Text
                        style={{
                          color: theme.colors.textPrimary,
                          fontSize: typography.fontSizes.sm,
                          fontWeight: typography.fontWeights.semibold,
                        }}
                      >
                        {m.name}
                      </Text>
                    </View>
                    <Text
                      style={{
                        color: theme.colors.textPrimary,
                        fontSize: typography.fontSizes.sm,
                        fontWeight: typography.fontWeights.bold,
                      }}
                    >
                      {family.currency}
                      {m.total.toFixed(2)}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </Card>
        </View>
      )}

      {activeTab === 'members' && (
        <View style={{ gap: spacing.lg }}>
          <MemberBarChart data={memberContributions} currency={family.currency} />
        </View>
      )}

      {activeTab === 'trends' && (
        <View style={{ gap: spacing.lg }}>
          <SpendingVelocityChart
            data={velocityData}
            totalBudget={metrics.totalBudget}
            currency={family.currency}
          />
        </View>
      )}

      {activeTab === 'heatmap' && (
        <View style={{ gap: spacing.lg }}>
          <HeatmapCalendar data={velocityData} period={selectedPeriod} currency={family.currency} />
        </View>
      )}
    </ScrollView>
  );
}
