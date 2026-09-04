import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '@/theme';
import { useI18n } from '@/i18n';
import { useAppStore } from '@/services/store';
import {
  calculateCategoryBreakdown,
  calculateMemberContributions,
  calculateSpendingVelocity,
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
  const { t } = useI18n();
  const { family, members, categories, expenses, selectedPeriod, setSelectedPeriod } =
    useAppStore();

  const [activeTab, setActiveTab] = useState<'categories' | 'members' | 'trends' | 'heatmap'>(
    'categories',
  );

  const periodExpenses = useMemo(
    () => expenses.filter((e) => e.transaction_date.startsWith(selectedPeriod)),
    [expenses, selectedPeriod],
  );

  const categoryBreakdown = useMemo(
    () => calculateCategoryBreakdown(periodExpenses, categories),
    [periodExpenses, categories],
  );

  const memberContributions = useMemo(
    () => calculateMemberContributions(periodExpenses, members),
    [periodExpenses, members],
  );

  const velocityData = useMemo(
    () => calculateSpendingVelocity(expenses, selectedPeriod),
    [expenses, selectedPeriod],
  );

  // Top Merchants summary
  const topMerchants = useMemo(() => {
    const merchantMap = new Map<string, number>();
    periodExpenses.forEach((e) => {
      merchantMap.set(e.merchant_name, (merchantMap.get(e.merchant_name) || 0) + e.amount);
    });
    return Array.from(merchantMap.entries())
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [periodExpenses]);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      contentContainerStyle={{ padding: spacing.lg, paddingBottom: 100 }}
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
              ? t.analytics.categoriesTab
              : tab === 'members'
                ? t.analytics.membersTab
                : tab === 'trends'
                  ? t.analytics.trendsTab
                  : t.analytics.heatmapTab;

          return (
            <TouchableOpacity
              key={tab}
              activeOpacity={0.7}
              onPress={() => setActiveTab(tab)}
              style={{
                flex: 1,
                paddingVertical: spacing.sm,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: radius.sm,
                backgroundColor: isActive ? theme.colors.surface : 'transparent',
                shadowColor: isActive ? theme.colors.shadow : 'transparent',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: isActive ? 0.1 : 0,
                shadowRadius: 2,
                elevation: isActive ? 1 : 0,
              }}
            >
              <Text
                style={{
                  color: isActive ? theme.colors.brand : theme.colors.textSecondary,
                  fontSize: typography.fontSizes.sm,
                  fontWeight: isActive
                    ? typography.fontWeights.bold
                    : typography.fontWeights.medium,
                }}
              >
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Tab Panels */}
      {activeTab === 'categories' && (
        <View style={{ gap: spacing.lg }}>
          <CategoryPieChart data={categoryBreakdown} currency={family.currency} />

          {/* Top Merchants Card */}
          <Card padding="md">
            <Text
              style={{
                color: theme.colors.textPrimary,
                fontSize: typography.fontSizes.lg,
                fontWeight: typography.fontWeights.bold,
                marginBottom: spacing.md,
              }}
            >
              {t.analytics.topMerchants}
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
                {t.analytics.noMerchantData}
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
          <SpendingVelocityChart data={velocityData} currency={family.currency} />
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
