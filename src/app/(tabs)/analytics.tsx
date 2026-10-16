import { useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Platform, type TextStyle } from 'react-native';
import { PieChart, Users, TrendingUp, Activity, Calendar } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { useI18n } from '@/i18n';
import { useAppStore } from '@/services/store';
import {
  CategorySummary,
  calculateCategoryBreakdown,
  calculateMemberContributions,
  calculateSpendingVelocity,
  calculateHistoricalMonthlyTrends,
  calculateComparativeSpendingVelocity,
  calculateDayOfWeekDistribution,
  calculatePaymentMethodDistribution,
} from '@/services/analytics';
import { Card } from '@/components/common/Card';
import { PeriodSelector } from '@/components/common/PeriodSelector';
import { CategoryPieChart } from '@/components/charts/CategoryPieChart';
import { MemberBarChart } from '@/components/charts/MemberBarChart';
import { SpendingVelocityChart } from '@/components/charts/SpendingVelocityChart';
import { HeatmapCalendar } from '@/components/charts/HeatmapCalendar';
import { MonthlyTrendChart } from '@/components/charts/MonthlyTrendChart';
import { DayOfWeekChart } from '@/components/charts/DayOfWeekChart';
import { PaymentMethodChart } from '@/components/charts/PaymentMethodChart';
import { CategoryDetailModal } from '@/components/charts/CategoryDetailModal';

const TABULAR_NUMS: TextStyle =
  Platform.OS === 'web'
    ? ({ fontVariantNumeric: 'tabular-nums' } as unknown as TextStyle)
    : { fontVariant: ['tabular-nums'] };

export default function AnalyticsScreen() {
  const { theme, spacing, radius, typography } = useTheme();
  const { t } = useI18n();
  const family = useAppStore((s) => s.family);
  const members = useAppStore((s) => s.members);
  const categories = useAppStore((s) => s.categories);
  const expenses = useAppStore((s) => s.expenses);
  const selectedPeriod = useAppStore((s) => s.selectedPeriod);
  const setSelectedPeriod = useAppStore((s) => s.setSelectedPeriod);

  const [activeTab, setActiveTab] = useState<
    'categories' | 'members' | 'trends' | 'patterns' | 'heatmap'
  >('categories');

  const [selectedCategory, setSelectedCategory] = useState<CategorySummary | null>(null);

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

  const comparativeVelocity = useMemo(
    () => calculateComparativeSpendingVelocity(expenses, selectedPeriod),
    [expenses, selectedPeriod],
  );

  const historicalTrends = useMemo(
    () => calculateHistoricalMonthlyTrends(expenses, selectedPeriod, 6),
    [expenses, selectedPeriod],
  );

  const dayOfWeekDistribution = useMemo(
    () => calculateDayOfWeekDistribution(periodExpenses),
    [periodExpenses],
  );

  const paymentMethodDistribution = useMemo(
    () => calculatePaymentMethodDistribution(periodExpenses),
    [periodExpenses],
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
      contentContainerStyle={{
        padding: spacing.lg,
        paddingBottom: 130,
        maxWidth: 760,
        width: '100%',
        alignSelf: 'center',
      }}
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
          gap: spacing.sm,
          paddingVertical: 4,
          marginBottom: spacing.lg,
        }}
      >
        {[
          { id: 'categories' as const, label: t.analytics.categoriesTab, icon: PieChart },
          { id: 'members' as const, label: t.analytics.membersTab, icon: Users },
          { id: 'trends' as const, label: t.analytics.trendsTab, icon: TrendingUp },
          { id: 'patterns' as const, label: t.analytics.patternsTab, icon: Activity },
          { id: 'heatmap' as const, label: t.analytics.heatmapTab, icon: Calendar },
        ].map(({ id, label, icon: TabIcon }) => {
          const isActive = activeTab === id;

          return (
            <TouchableOpacity
              key={id}
              activeOpacity={0.75}
              onPress={() => setActiveTab(id)}
              style={{
                flexDirection: 'row',
                gap: 8,
                minHeight: 48,
                paddingHorizontal: spacing.md,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: radius.pill,
                backgroundColor: isActive
                  ? theme.colors.brand
                  : theme.isDark
                    ? theme.colors.surfaceContainerHigh
                    : theme.colors.surfaceSubtle,
                borderWidth: 1.5,
                borderColor: isActive ? theme.colors.brand : theme.colors.borderTactile,
              }}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={label}
            >
              <TabIcon
                size={18}
                color={isActive ? theme.colors.textInverse : theme.colors.textSecondary}
                strokeWidth={2.5}
              />
              <Text
                style={{
                  color: isActive ? theme.colors.textInverse : theme.colors.textPrimary,
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
          <CategoryPieChart
            data={categoryBreakdown}
            currency={family.currency}
            onSelectCategory={(catId) => {
              const found = categoryBreakdown.find((c) => c.category.id === catId);
              if (found) {
                setSelectedCategory(found);
              }
            }}
          />

          <PaymentMethodChart data={paymentMethodDistribution} currency={family.currency} />

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
              <View style={{ gap: spacing.xs }}>
                {topMerchants.map((m, idx) => (
                  <View
                    key={m.name}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingVertical: spacing.sm,
                      borderBottomWidth: idx < topMerchants.length - 1 ? 1 : 0,
                      borderBottomColor: theme.colors.borderSubtle,
                    }}
                  >
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: spacing.sm,
                        flex: 1,
                        minWidth: 0,
                        marginRight: spacing.sm,
                      }}
                    >
                      <View
                        style={{
                          width: 26,
                          height: 26,
                          borderRadius: radius.pill,
                          backgroundColor: theme.isDark
                            ? theme.colors.surfaceContainerHigh
                            : theme.colors.surfaceSubtle,
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderWidth: 1,
                          borderColor: theme.colors.borderTactile,
                        }}
                      >
                        <Text
                          style={[
                            {
                              color: theme.colors.textMuted,
                              fontSize: typography.fontSizes.xs,
                              fontWeight: typography.fontWeights.bold,
                            },
                            TABULAR_NUMS,
                          ]}
                        >
                          {idx + 1}
                        </Text>
                      </View>
                      <Text
                        style={{
                          color: theme.colors.textPrimary,
                          fontSize: typography.fontSizes.sm,
                          fontWeight: typography.fontWeights.semibold,
                          flex: 1,
                        }}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                      >
                        {m.name}
                      </Text>
                    </View>
                    <Text
                      style={[
                        {
                          color: theme.colors.textPrimary,
                          fontSize: typography.fontSizes.sm,
                          fontWeight: typography.fontWeights.heavy,
                          flexShrink: 0,
                        },
                        TABULAR_NUMS,
                      ]}
                      numberOfLines={1}
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
          <SpendingVelocityChart comparativeData={comparativeVelocity} currency={family.currency} />
          <MonthlyTrendChart
            data={historicalTrends}
            currency={family.currency}
            selectedPeriod={selectedPeriod}
            onSelectPeriod={(period) => setSelectedPeriod(period)}
          />
        </View>
      )}

      {activeTab === 'patterns' && (
        <View style={{ gap: spacing.lg }}>
          <DayOfWeekChart data={dayOfWeekDistribution} currency={family.currency} />
          <HeatmapCalendar data={velocityData} period={selectedPeriod} currency={family.currency} />
        </View>
      )}

      {activeTab === 'heatmap' && (
        <View style={{ gap: spacing.lg }}>
          <HeatmapCalendar data={velocityData} period={selectedPeriod} currency={family.currency} />
        </View>
      )}

      {/* Category Drilldown Modal */}
      <CategoryDetailModal
        visible={!!selectedCategory}
        categorySummary={selectedCategory}
        expenses={periodExpenses}
        members={members}
        currency={family.currency}
        onClose={() => setSelectedCategory(null)}
      />
    </ScrollView>
  );
}
