import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { PieChart, Users, TrendingUp, Calendar, ArrowLeftRight } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { useI18n } from '@/i18n';
import { useAppStore } from '@/services/store';
import {
  calculateCategoryBreakdown,
  calculateMemberContributions,
  calculateSpendingVelocity,
} from '@/services/analytics';
import { calculateSettlements } from '@/services/splitCalculator';
import { Card } from '@/components/common/Card';
import { PeriodSelector } from '@/components/common/PeriodSelector';
import { CategoryPieChart } from '@/components/charts/CategoryPieChart';
import { MemberBarChart } from '@/components/charts/MemberBarChart';
import { SpendingVelocityChart } from '@/components/charts/SpendingVelocityChart';
import { HeatmapCalendar } from '@/components/charts/HeatmapCalendar';
import { SettlementCard } from '@/components/charts/SettlementCard';

export default function AnalyticsScreen() {
  const { theme, spacing, radius, typography } = useTheme();
  const { t } = useI18n();
  const { family, members, categories, expenses, selectedPeriod, setSelectedPeriod } =
    useAppStore();

  const [activeTab, setActiveTab] = useState<
    'categories' | 'members' | 'settlement' | 'trends' | 'heatmap'
  >('categories');

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

  const settlementSummary = useMemo(
    () => calculateSettlements(periodExpenses, members),
    [periodExpenses, members],
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
      contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Interactive Month Stepper */}
      <View style={{ marginBottom: spacing.md }}>
        <PeriodSelector selectedPeriod={selectedPeriod} onPeriodChange={setSelectedPeriod} />
      </View>

      {/* Top Segmented Controls */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          gap: spacing.xs,
          paddingVertical: 4,
          marginBottom: spacing.lg,
        }}
      >
        {[
          { id: 'categories' as const, label: t.analytics.categoriesTab, icon: PieChart },
          { id: 'settlement' as const, label: t.analytics.settlementTab, icon: ArrowLeftRight },
          { id: 'members' as const, label: t.analytics.membersTab, icon: Users },
          { id: 'trends' as const, label: t.analytics.trendsTab, icon: TrendingUp },
          { id: 'heatmap' as const, label: t.analytics.heatmapTab, icon: Calendar },
        ].map(({ id, label, icon: TabIcon }) => {
          const isActive = activeTab === id;

          return (
            <TouchableOpacity
              key={id}
              activeOpacity={0.7}
              onPress={() => setActiveTab(id)}
              style={{
                flexDirection: 'row',
                gap: 6,
                minHeight: 46,
                paddingHorizontal: spacing.md,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: radius.lg,
                backgroundColor: isActive ? theme.colors.brand : theme.colors.surfaceSubtle,
                borderWidth: 1.5,
                borderColor: isActive ? theme.colors.brand : theme.colors.border,
              }}
              accessibilityLabel={label}
            >
              <TabIcon size={18} color={isActive ? '#FFFFFF' : theme.colors.textSecondary} />
              <Text
                style={{
                  color: isActive ? '#FFFFFF' : theme.colors.textPrimary,
                  fontSize: typography.fontSizes.sm,
                  fontWeight: isActive
                    ? typography.fontWeights.bold
                    : typography.fontWeights.medium,
                }}
                numberOfLines={1}
              >
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Tab Panels */}
      {activeTab === 'categories' && (
        <View style={{ gap: spacing.lg }}>
          <CategoryPieChart data={categoryBreakdown} currency={family.currency} />

          {/* Top Merchants Card */}
          <Card padding="lg">
            <Text
              style={{
                color: theme.colors.textPrimary,
                fontSize: typography.fontSizes.lg,
                fontWeight: typography.fontWeights.heavy,
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
                          fontWeight: typography.fontWeights.bold,
                          width: 20,
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

      {activeTab === 'settlement' && (
        <View style={{ gap: spacing.lg }}>
          <SettlementCard summary={settlementSummary} currency={family.currency} />
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
