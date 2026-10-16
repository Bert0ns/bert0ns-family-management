import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Platform,
  type TextStyle,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Plus,
  FileJson,
  Receipt,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  Check,
  TrendingUp,
} from 'lucide-react-native';
import { useTheme } from '@/theme';
import { useI18n, getLocalizedCategoryName } from '@/i18n';
import { useAppStore } from '@/services/store';
import {
  calculateMonthlyMetrics,
  calculateMemberContributions,
  calculateCategoryBreakdown,
  calculateComparativeSpendingVelocity,
} from '@/services/analytics';
import { Card } from '@/components/common/Card';
import { Avatar } from '@/components/common/Avatar';
import { PeriodSelector } from '@/components/common/PeriodSelector';
import { IconHelper } from '@/components/common/IconHelper';
import { ExpenseItem } from '@/components/ledger/ExpenseItem';
import { ExpenseDetailModal } from '@/components/ledger/ExpenseDetailModal';
import { EditExpenseModal } from '@/components/ledger/EditExpenseModal';
import { Expense } from '@/types';

const TABULAR_NUMS: TextStyle =
  Platform.OS === 'web'
    ? ({ fontVariantNumeric: 'tabular-nums' } as unknown as TextStyle)
    : { fontVariant: ['tabular-nums'] };

const GROUP_DATE_FORMATTERS: Record<string, Intl.DateTimeFormat> = {
  it: new Intl.DateTimeFormat('it-IT', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
  }),
  en: new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }),
};

function formatGroupDateHeader(dateStr: string, locale: string): string {
  const formatter = locale === 'it' ? GROUP_DATE_FORMATTERS.it : GROUP_DATE_FORMATTERS.en;
  try {
    const [y, m, d] = dateStr.split('-').map((n) => parseInt(n, 10));
    if (y && m && d) {
      return formatter.format(new Date(y, m - 1, d));
    }
    return formatter.format(new Date(dateStr));
  } catch {
    return dateStr;
  }
}

export default function DashboardScreen() {
  const router = useRouter();
  const { theme, spacing, radius, typography } = useTheme();
  const { t, locale } = useI18n();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [selectedExpenseForEdit, setSelectedExpenseForEdit] = useState<Expense | null>(null);

  const family = useAppStore((s) => s.family);
  const members = useAppStore((s) => s.members);
  const categories = useAppStore((s) => s.categories);
  const expenses = useAppStore((s) => s.expenses);
  const currentMemberId = useAppStore((s) => s.currentMemberId);
  const setCurrentMemberId = useAppStore((s) => s.setCurrentMemberId);
  const selectedPeriod = useAppStore((s) => s.selectedPeriod);
  const setSelectedPeriod = useAppStore((s) => s.setSelectedPeriod);
  const setFilters = useAppStore((s) => s.setFilters);
  const resetFilters = useAppStore((s) => s.resetFilters);
  const deleteExpense = useAppStore((s) => s.deleteExpense);
  const updateExpense = useAppStore((s) => s.updateExpense);

  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }
    };
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    refreshTimerRef.current = setTimeout(() => setRefreshing(false), 600);
  }, []);

  const metrics = useMemo(
    () => calculateMonthlyMetrics(expenses, categories, members, selectedPeriod),
    [expenses, categories, members, selectedPeriod],
  );

  const periodExpensesAll = useMemo(
    () => expenses.filter((e) => e.transaction_date.startsWith(selectedPeriod)),
    [expenses, selectedPeriod],
  );

  const categoryBreakdown = useMemo(
    () => calculateCategoryBreakdown(periodExpensesAll, categories),
    [periodExpensesAll, categories],
  );

  const memberContributions = useMemo(
    () => calculateMemberContributions(periodExpensesAll, members),
    [periodExpensesAll, members],
  );

  const velocity = useMemo(
    () => calculateComparativeSpendingVelocity(expenses, selectedPeriod),
    [expenses, selectedPeriod],
  );

  // Filter expenses for selected period, sorted newest first, top 6
  const periodExpenses = useMemo(
    () =>
      [...periodExpensesAll]
        .sort((a, b) => b.transaction_date.localeCompare(a.transaction_date))
        .slice(0, 6),
    [periodExpensesAll],
  );

  // Group recent expenses by date for scannable register display
  const groupedRecentExpenses = useMemo(() => {
    const groups: { date: string; label: string; dayTotal: number; items: Expense[] }[] = [];
    for (const exp of periodExpenses) {
      const dateKey = exp.transaction_date.slice(0, 10);
      const lastGroup = groups[groups.length - 1];
      if (lastGroup && lastGroup.date === dateKey) {
        lastGroup.items.push(exp);
        lastGroup.dayTotal += exp.amount;
      } else {
        groups.push({
          date: dateKey,
          label: formatGroupDateHeader(dateKey, locale),
          dayTotal: exp.amount,
          items: [exp],
        });
      }
    }
    return groups;
  }, [periodExpenses, locale]);

  const categoryMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const memberMap = useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);

  const handleSelectExpense = useCallback((expense: Expense) => {
    setSelectedExpense(expense);
  }, []);

  const handleCloseModal = useCallback(() => {
    setSelectedExpense(null);
  }, []);

  const handleDeleteExpense = useCallback(
    (id: string) => {
      deleteExpense(id);
      setSelectedExpense(null);
    },
    [deleteExpense],
  );

  const handleFilterByCategory = useCallback(
    (categoryId: string) => {
      resetFilters();
      setFilters({ selectedCategoryId: categoryId });
      router.push('/(tabs)/ledger');
    },
    [resetFilters, setFilters, router],
  );

  const handleFilterByMember = useCallback(
    (memberId: string) => {
      resetFilters();
      setFilters({ selectedMemberId: memberId });
      router.push('/(tabs)/ledger');
    },
    [resetFilters, setFilters, router],
  );

  const handleOpenFullLedger = useCallback(() => {
    resetFilters();
    router.push('/(tabs)/ledger');
  }, [resetFilters, router]);

  // Split totalSpend into integer and decimal parts for editorial typographic rendering
  const formattedTotal = metrics.totalSpend.toFixed(2);
  const [wholePart, decimalPart] = formattedTotal.split('.');
  const formattedWhole = Number(wholePart).toLocaleString(locale === 'it' ? 'it-IT' : 'en-US');

  const topCategories = categoryBreakdown.slice(0, 4);
  const pacingPct = velocity.pacingPercentage ?? 0;
  const hasPreviousMonthComparison =
    velocity.previousToDate > 0 && velocity.pacingPercentage !== null;
  const isPacingHigher = pacingPct > 2;
  const isPacingLower = pacingPct < -2;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      contentContainerStyle={{
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.md,
        paddingBottom: 132,
        maxWidth: 780,
        width: '100%',
        alignSelf: 'center',
      }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      showsVerticalScrollIndicator={false}
    >
      {/* 1. Household Masthead & Active Payer Switcher */}
      <View
        style={{
          marginBottom: spacing.md,
          paddingBottom: spacing.sm,
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.border,
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: spacing.sm,
          }}
        >
          <View style={{ flex: 1, minWidth: 0, marginRight: spacing.sm }}>
            <Text
              style={{
                color: theme.colors.brand,
                fontSize: typography.fontSizes.xs,
                fontWeight: typography.fontWeights.bold,
                letterSpacing: 0.8,
                textTransform: 'uppercase',
                marginBottom: 2,
              }}
            >
              {t.dashboard.householdOverview}
            </Text>
            <Text
              style={{
                color: theme.colors.textPrimary,
                fontSize: typography.fontSizes.xl,
                fontWeight: typography.fontWeights.heavy,
                letterSpacing: -0.3,
              }}
              numberOfLines={1}
            >
              {family.name}
            </Text>
          </View>

          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => router.push('/(tabs)/analytics')}
            accessibilityRole="button"
            accessibilityLabel={t.tabs.analytics}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.xs,
              minHeight: 44,
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.xs + 2,
              borderRadius: radius.md,
              backgroundColor: theme.colors.surface,
              borderWidth: 1,
              borderColor: theme.colors.cardBorder,
            }}
          >
            <TrendingUp size={16} color={theme.colors.brand} strokeWidth={2.2} />
            <Text
              style={{
                color: theme.colors.textPrimary,
                fontSize: typography.fontSizes.sm,
                fontWeight: typography.fontWeights.bold,
              }}
            >
              {t.tabs.analytics}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Active Payer Quick-Switcher Strip */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: spacing.xs + 2,
          }}
        >
          <Text
            style={{
              color: theme.colors.textSecondary,
              fontSize: typography.fontSizes.xs,
              fontWeight: typography.fontWeights.semibold,
              marginRight: spacing.xxs,
            }}
          >
            {t.dashboard.payingAs}:
          </Text>
          {members.map((member) => {
            const isSelected = member.id === currentMemberId;
            const memberColor = member.color_code || theme.colors.brand;
            return (
              <TouchableOpacity
                key={member.id}
                activeOpacity={0.75}
                onPress={() => setCurrentMemberId(member.id)}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={`${t.dashboard.payingAs} ${member.display_name}`}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  minHeight: 40,
                  paddingHorizontal: spacing.sm + 2,
                  paddingVertical: 6,
                  borderRadius: radius.pill,
                  backgroundColor: isSelected ? `${memberColor}18` : theme.colors.surface,
                  borderWidth: isSelected ? 1.5 : 1,
                  borderColor: isSelected ? memberColor : theme.colors.cardBorder,
                  gap: 6,
                }}
              >
                <View
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: memberColor,
                  }}
                />
                <Text
                  style={{
                    color: isSelected ? theme.colors.textPrimary : theme.colors.textSecondary,
                    fontSize: typography.fontSizes.xs,
                    fontWeight: isSelected
                      ? typography.fontWeights.bold
                      : typography.fontWeights.medium,
                  }}
                  numberOfLines={1}
                >
                  {member.display_name}
                </Text>
                {isSelected && <Check size={13} color={memberColor} strokeWidth={2.8} />}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* 2. Month Stepper */}
      <View style={{ marginBottom: spacing.md }}>
        <PeriodSelector selectedPeriod={selectedPeriod} onPeriodChange={setSelectedPeriod} />
      </View>

      {/* 3. Household Monthly Statement Sheet (Hero Ledger Artifact) */}
      <Card
        padding="none"
        style={{
          marginBottom: spacing.lg,
          overflow: 'hidden',
        }}
      >
        {/* Top Brand Accent Rule */}
        <View
          style={{
            height: 4,
            backgroundColor: theme.colors.brand,
            width: '100%',
          }}
        />

        <View style={{ padding: spacing.lg }}>
          {/* Statement Header Row */}
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: spacing.xs,
              flexWrap: 'wrap',
              gap: spacing.xs,
            }}
          >
            <Text
              style={{
                color: theme.colors.textSecondary,
                fontSize: typography.fontSizes.sm,
                fontWeight: typography.fontWeights.bold,
                letterSpacing: 0.3,
                textTransform: 'uppercase',
              }}
            >
              {t.dashboard.thisMonthSpending}
            </Text>

            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.xs,
                paddingHorizontal: spacing.sm + 2,
                paddingVertical: 4,
                borderRadius: radius.pill,
                backgroundColor: theme.colors.surfaceSubtle,
                borderWidth: 1,
                borderColor: theme.colors.borderTactile,
              }}
            >
              <Receipt size={13} color={theme.colors.textSecondary} strokeWidth={2.2} />
              <Text
                style={[
                  {
                    color: theme.colors.textPrimary,
                    fontSize: typography.fontSizes.xs,
                    fontWeight: typography.fontWeights.bold,
                  },
                  TABULAR_NUMS,
                ]}
              >
                {metrics.transactionCount} {t.dashboard.totalTransactions}
              </Text>
            </View>
          </View>

          {/* Editorial Tabular Numeral Display */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'baseline',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              marginTop: spacing.xxs,
              marginBottom: spacing.md,
              gap: spacing.sm,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'baseline', flexShrink: 1 }}>
              <Text
                style={[
                  {
                    color: theme.colors.textSecondary,
                    fontSize: typography.fontSizes.xxl,
                    fontWeight: typography.fontWeights.bold,
                    marginRight: 3,
                  },
                  TABULAR_NUMS,
                ]}
              >
                {family.currency}
              </Text>
              <Text
                style={[
                  {
                    color: theme.colors.textPrimary,
                    fontSize: typography.fontSizes.hero,
                    fontWeight: typography.fontWeights.heavy,
                    letterSpacing: -1,
                  },
                  TABULAR_NUMS,
                ]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.65}
              >
                {formattedWhole}
              </Text>
              <Text
                style={[
                  {
                    color: theme.colors.textMuted,
                    fontSize: typography.fontSizes.xl,
                    fontWeight: typography.fontWeights.bold,
                  },
                  TABULAR_NUMS,
                ]}
              >
                .{decimalPart}
              </Text>
            </View>

            {/* Month-over-Month Pacing Badge */}
            {hasPreviousMonthComparison && (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                  paddingHorizontal: spacing.sm,
                  paddingVertical: 5,
                  borderRadius: radius.sm,
                  backgroundColor: isPacingHigher
                    ? theme.colors.warningBg
                    : isPacingLower
                      ? theme.colors.successBg
                      : theme.colors.surfaceSubtle,
                }}
              >
                {isPacingHigher ? (
                  <ArrowUpRight size={15} color={theme.colors.warning} strokeWidth={2.5} />
                ) : isPacingLower ? (
                  <ArrowDownRight size={15} color={theme.colors.success} strokeWidth={2.5} />
                ) : null}
                <Text
                  style={[
                    {
                      color: isPacingHigher
                        ? theme.colors.warning
                        : isPacingLower
                          ? theme.colors.success
                          : theme.colors.textSecondary,
                      fontSize: typography.fontSizes.xs,
                      fontWeight: typography.fontWeights.bold,
                    },
                    TABULAR_NUMS,
                  ]}
                >
                  {pacingPct > 0 ? '+' : ''}
                  {pacingPct.toFixed(0)}% {t.dashboard.vsLastMonth}
                </Text>
              </View>
            )}
          </View>

          {/* Primary Action Dock: Unmistakable 56px+ Touch Targets for All Ages */}
          <View
            style={{
              flexDirection: 'row',
              gap: spacing.sm,
            }}
          >
            <TouchableOpacity
              activeOpacity={0.82}
              onPress={() => router.push('/expense/add')}
              accessibilityRole="button"
              accessibilityLabel={t.dashboard.quickAddButton}
              style={{
                flex: 1.35,
                minHeight: 56,
                borderRadius: radius.md,
                backgroundColor: theme.colors.brand,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                paddingHorizontal: spacing.md,
                gap: spacing.xs + 2,
              }}
            >
              <Plus size={22} color="#FFFFFF" strokeWidth={2.8} />
              <Text
                style={{
                  color: '#FFFFFF',
                  fontSize: typography.fontSizes.md,
                  fontWeight: typography.fontWeights.bold,
                }}
                numberOfLines={1}
              >
                {t.dashboard.quickAddButton}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() => router.push('/(tabs)/import')}
              accessibilityRole="button"
              accessibilityLabel={t.dashboard.bulkImportButton}
              style={{
                flex: 1,
                minHeight: 56,
                borderRadius: radius.md,
                backgroundColor: theme.isDark
                  ? theme.colors.surfaceContainerHigh
                  : theme.colors.surfaceSubtle,
                borderWidth: 1,
                borderColor: theme.colors.borderTactile,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                paddingHorizontal: spacing.md,
                gap: spacing.xs + 2,
              }}
            >
              <FileJson size={19} color={theme.colors.textPrimary} strokeWidth={2.2} />
              <Text
                style={{
                  color: theme.colors.textPrimary,
                  fontSize: typography.fontSizes.sm,
                  fontWeight: typography.fontWeights.bold,
                }}
                numberOfLines={1}
              >
                {t.common.import}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 3-Column Financial Metrics Strip (Separated by Structural Hairlines) */}
        <View
          style={{
            flexDirection: 'row',
            borderTopWidth: 1,
            borderTopColor: theme.colors.border,
            backgroundColor: theme.isDark
              ? theme.colors.surfaceSubtle
              : theme.colors.surfaceElevated,
          }}
        >
          {/* Daily Average */}
          <View
            style={{
              flex: 1,
              paddingVertical: spacing.md,
              paddingHorizontal: spacing.md,
              borderRightWidth: 1,
              borderRightColor: theme.colors.border,
            }}
          >
            <Text
              style={{
                color: theme.colors.textMuted,
                fontSize: typography.fontSizes.xs,
                fontWeight: typography.fontWeights.semibold,
                marginBottom: 4,
              }}
              numberOfLines={1}
            >
              {t.dashboard.dailyAverage}
            </Text>
            <Text
              style={[
                {
                  color: theme.colors.textPrimary,
                  fontSize: typography.fontSizes.lg,
                  fontWeight: typography.fontWeights.heavy,
                },
                TABULAR_NUMS,
              ]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.75}
            >
              {family.currency}
              {metrics.dailyAverageBurn.toFixed(2)}
            </Text>
            <Text
              style={{
                color: theme.colors.textSecondary,
                fontSize: 11,
                fontWeight: typography.fontWeights.medium,
                marginTop: 2,
              }}
              numberOfLines={1}
            >
              {t.dashboard.burnRatePerDay}
            </Text>
          </View>

          {/* Month Forecast */}
          <View
            style={{
              flex: 1,
              paddingVertical: spacing.md,
              paddingHorizontal: spacing.md,
              borderRightWidth: 1,
              borderRightColor: theme.colors.border,
            }}
          >
            <Text
              style={{
                color: theme.colors.textMuted,
                fontSize: typography.fontSizes.xs,
                fontWeight: typography.fontWeights.semibold,
                marginBottom: 4,
              }}
              numberOfLines={1}
            >
              {t.dashboard.monthForecast}
            </Text>
            <Text
              style={[
                {
                  color: theme.colors.textPrimary,
                  fontSize: typography.fontSizes.lg,
                  fontWeight: typography.fontWeights.heavy,
                },
                TABULAR_NUMS,
              ]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.75}
            >
              {family.currency}
              {metrics.projectedMonthEnd.toFixed(0)}
            </Text>
            <Text
              style={{
                color: theme.colors.textSecondary,
                fontSize: 11,
                fontWeight: typography.fontWeights.medium,
                marginTop: 2,
              }}
              numberOfLines={1}
            >
              {t.dashboard.projectedSpend}
            </Text>
          </View>

          {/* Top Category */}
          <View
            style={{
              flex: 1,
              paddingVertical: spacing.md,
              paddingHorizontal: spacing.md,
            }}
          >
            <Text
              style={{
                color: theme.colors.textMuted,
                fontSize: typography.fontSizes.xs,
                fontWeight: typography.fontWeights.semibold,
                marginBottom: 4,
              }}
              numberOfLines={1}
            >
              {t.expenseDetail.category} #1
            </Text>
            {topCategories[0] ? (
              <>
                <Text
                  style={{
                    color: theme.colors.textPrimary,
                    fontSize: typography.fontSizes.md,
                    fontWeight: typography.fontWeights.heavy,
                  }}
                  numberOfLines={1}
                >
                  {getLocalizedCategoryName(topCategories[0].category, t)}
                </Text>
                <Text
                  style={[
                    {
                      color: topCategories[0].category.color || theme.colors.brand,
                      fontSize: 12,
                      fontWeight: typography.fontWeights.bold,
                      marginTop: 2,
                    },
                    TABULAR_NUMS,
                  ]}
                  numberOfLines={1}
                >
                  {family.currency}
                  {topCategories[0].total.toFixed(0)} ({topCategories[0].percentage.toFixed(0)}%)
                </Text>
              </>
            ) : (
              <Text
                style={{
                  color: theme.colors.textMuted,
                  fontSize: typography.fontSizes.md,
                  fontWeight: typography.fontWeights.bold,
                }}
              >
                —
              </Text>
            )}
          </View>
        </View>

        {/* Visual Category Allocation Strip & Interactive Top Categories */}
        {categoryBreakdown.length > 0 && (
          <View
            style={{
              padding: spacing.lg,
              borderTopWidth: 1,
              borderTopColor: theme.colors.border,
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: spacing.sm,
              }}
            >
              <Text
                style={{
                  color: theme.colors.textPrimary,
                  fontSize: typography.fontSizes.sm,
                  fontWeight: typography.fontWeights.bold,
                }}
              >
                {t.dashboard.whereMoneyWent}
              </Text>
              <Text
                style={{
                  color: theme.colors.textMuted,
                  fontSize: typography.fontSizes.xs,
                  fontWeight: typography.fontWeights.medium,
                }}
              >
                {t.dashboard.tapToFilter}
              </Text>
            </View>

            {/* Proportional Multi-Segment Category Bar */}
            <View
              style={{
                height: 10,
                borderRadius: radius.xs,
                backgroundColor: theme.colors.surfaceSubtle,
                flexDirection: 'row',
                overflow: 'hidden',
                gap: 2,
                marginBottom: spacing.md,
              }}
            >
              {categoryBreakdown.map((cb) => (
                <View
                  key={cb.category.id}
                  style={{
                    flex: Math.max(cb.percentage, 3),
                    height: '100%',
                    backgroundColor: cb.category.color || theme.colors.brand,
                  }}
                />
              ))}
            </View>

            {/* Interactive Category Rows (Top 4) */}
            <View style={{ gap: spacing.xs + 2 }}>
              {topCategories.map((cb) => {
                const catName = getLocalizedCategoryName(cb.category, t);
                const catColor = cb.category.color || theme.colors.brand;
                return (
                  <TouchableOpacity
                    key={cb.category.id}
                    activeOpacity={0.7}
                    onPress={() => handleFilterByCategory(cb.category.id)}
                    accessibilityRole="button"
                    accessibilityLabel={`${catName}, ${family.currency}${cb.total.toFixed(2)}, ${cb.percentage.toFixed(0)}%`}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      minHeight: 48,
                      paddingHorizontal: spacing.sm + 2,
                      paddingVertical: spacing.xs + 2,
                      borderRadius: radius.md,
                      backgroundColor: theme.isDark
                        ? theme.colors.surfaceSubtle
                        : theme.colors.surfaceElevated,
                      borderWidth: 1,
                      borderColor: theme.colors.borderSubtle,
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
                      <View
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: radius.sm,
                          backgroundColor: `${catColor}18`,
                          borderWidth: 1,
                          borderColor: `${catColor}35`,
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <IconHelper name={cb.category.icon} size={17} color={catColor} />
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text
                          style={{
                            color: theme.colors.textPrimary,
                            fontSize: typography.fontSizes.sm,
                            fontWeight: typography.fontWeights.bold,
                          }}
                          numberOfLines={1}
                        >
                          {catName}
                        </Text>
                        <Text
                          style={{
                            color: theme.colors.textSecondary,
                            fontSize: typography.fontSizes.xs,
                            fontWeight: typography.fontWeights.medium,
                          }}
                        >
                          {cb.transactionCount} {t.dashboard.txs} • {cb.percentage.toFixed(0)}%
                        </Text>
                      </View>
                    </View>

                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: spacing.xs,
                        marginLeft: spacing.sm,
                      }}
                    >
                      <Text
                        style={[
                          {
                            color: theme.colors.textPrimary,
                            fontSize: typography.fontSizes.md,
                            fontWeight: typography.fontWeights.heavy,
                          },
                          TABULAR_NUMS,
                        ]}
                      >
                        {family.currency}
                        {cb.total.toFixed(2)}
                      </Text>
                      <ChevronRight size={16} color={theme.colors.textMuted} strokeWidth={2.2} />
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}
      </Card>

      {/* 4. Interactive Family Member Ledger ("Who Paid What") */}
      {memberContributions.length > 0 && (
        <Card
          padding="none"
          style={{
            marginBottom: spacing.lg,
            overflow: 'hidden',
          }}
        >
          <View
            style={{
              paddingHorizontal: spacing.lg,
              paddingVertical: spacing.md,
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: theme.isDark
                ? theme.colors.surfaceSubtle
                : theme.colors.surfaceElevated,
              borderBottomWidth: 1,
              borderBottomColor: theme.colors.border,
            }}
          >
            <View>
              <Text
                style={{
                  color: theme.colors.textPrimary,
                  fontSize: typography.fontSizes.md,
                  fontWeight: typography.fontWeights.bold,
                }}
              >
                {t.dashboard.whoPaidWhat}
              </Text>
              <Text
                style={{
                  color: theme.colors.textSecondary,
                  fontSize: typography.fontSizes.xs,
                  fontWeight: typography.fontWeights.medium,
                  marginTop: 1,
                }}
              >
                {t.dashboard.familyMembers} ({memberContributions.length})
              </Text>
            </View>

            <TouchableOpacity
              onPress={() => router.push('/(tabs)/family')}
              accessibilityRole="button"
              accessibilityLabel={t.tabs.family}
              style={{
                minHeight: 40,
                paddingHorizontal: spacing.sm + 2,
                justifyContent: 'center',
              }}
            >
              <Text
                style={{
                  color: theme.colors.brand,
                  fontSize: typography.fontSizes.sm,
                  fontWeight: typography.fontWeights.bold,
                }}
              >
                {t.tabs.family}
              </Text>
            </TouchableOpacity>
          </View>

          {memberContributions.map((mc, index) => {
            const memberColor = mc.member.color_code || theme.colors.brand;
            const isCurrentUser = mc.member.id === currentMemberId;
            return (
              <TouchableOpacity
                key={mc.member.id}
                activeOpacity={0.7}
                onPress={() => handleFilterByMember(mc.member.id)}
                accessibilityRole="button"
                accessibilityLabel={`${mc.member.display_name}, ${family.currency}${mc.total.toFixed(2)}, ${mc.percentage.toFixed(0)}% ${t.dashboard.ofTotal}`}
                style={{
                  paddingHorizontal: spacing.lg,
                  paddingVertical: spacing.md,
                  minHeight: 64,
                  borderTopWidth: index === 0 ? 0 : 1,
                  borderTopColor: theme.colors.border,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: spacing.md,
                    flex: 1,
                    minWidth: 0,
                    marginRight: spacing.sm,
                  }}
                >
                  <Avatar
                    name={mc.member.display_name}
                    avatarUrl={mc.member.avatar_url}
                    colorCode={memberColor}
                    size="md"
                  />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: 6,
                        gap: spacing.xs,
                      }}
                    >
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: spacing.xs,
                          flexShrink: 1,
                        }}
                      >
                        <Text
                          style={{
                            color: theme.colors.textPrimary,
                            fontSize: typography.fontSizes.md,
                            fontWeight: typography.fontWeights.bold,
                          }}
                          numberOfLines={1}
                        >
                          {mc.member.display_name}
                        </Text>
                        {isCurrentUser && (
                          <View
                            style={{
                              paddingHorizontal: 6,
                              paddingVertical: 1,
                              borderRadius: radius.xs,
                              backgroundColor: theme.colors.brandLight,
                            }}
                          >
                            <Text
                              style={{
                                color: theme.colors.brand,
                                fontSize: 10,
                                fontWeight: typography.fontWeights.bold,
                                textTransform: 'uppercase',
                              }}
                            >
                              {t.family.currentUser}
                            </Text>
                          </View>
                        )}
                      </View>

                      <Text
                        style={[
                          {
                            color: theme.colors.textSecondary,
                            fontSize: typography.fontSizes.xs,
                            fontWeight: typography.fontWeights.semibold,
                          },
                          TABULAR_NUMS,
                        ]}
                      >
                        {mc.transactionCount} {t.dashboard.txs} • {mc.percentage.toFixed(0)}%
                      </Text>
                    </View>

                    {/* Tactile Share Bar */}
                    <View
                      style={{
                        height: 6,
                        backgroundColor: theme.colors.surfaceSubtle,
                        borderRadius: radius.xs,
                        overflow: 'hidden',
                      }}
                    >
                      <View
                        style={{
                          height: '100%',
                          width: `${Math.min(mc.percentage, 100)}%`,
                          backgroundColor: memberColor,
                          borderRadius: radius.xs,
                        }}
                      />
                    </View>
                  </View>
                </View>

                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: spacing.xs,
                    flexShrink: 0,
                    marginLeft: spacing.xs,
                  }}
                >
                  <Text
                    style={[
                      {
                        color: theme.colors.textPrimary,
                        fontSize: typography.fontSizes.lg,
                        fontWeight: typography.fontWeights.heavy,
                      },
                      TABULAR_NUMS,
                    ]}
                    numberOfLines={1}
                  >
                    {family.currency}
                    {mc.total.toFixed(2)}
                  </Text>
                  <ChevronRight size={18} color={theme.colors.textMuted} strokeWidth={2.2} />
                </View>
              </TouchableOpacity>
            );
          })}
        </Card>
      )}

      {/* 5. Date-Grouped Recent Activity Register */}
      <View>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: spacing.sm,
          }}
        >
          <View>
            <Text
              style={{
                color: theme.colors.textPrimary,
                fontSize: typography.fontSizes.lg,
                fontWeight: typography.fontWeights.heavy,
              }}
            >
              {t.dashboard.recentExpenses}
            </Text>
          </View>
          <TouchableOpacity
            onPress={handleOpenFullLedger}
            accessibilityRole="button"
            accessibilityLabel={t.dashboard.viewAll}
            style={{
              minHeight: 44,
              paddingHorizontal: spacing.sm,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <Text
              style={{
                color: theme.colors.brand,
                fontSize: typography.fontSizes.sm,
                fontWeight: typography.fontWeights.bold,
              }}
            >
              {t.dashboard.viewAll} ({periodExpensesAll.length})
            </Text>
            <ChevronRight size={16} color={theme.colors.brand} strokeWidth={2.5} />
          </TouchableOpacity>
        </View>

        {groupedRecentExpenses.length === 0 ? (
          <Card padding="lg" style={{ alignItems: 'center', paddingVertical: spacing.xxl }}>
            <View
              style={{
                width: 56,
                height: 56,
                borderRadius: radius.full,
                backgroundColor: theme.colors.brandLight,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: spacing.md,
              }}
            >
              <Receipt size={28} color={theme.colors.brand} strokeWidth={2} />
            </View>
            <Text
              style={{
                color: theme.colors.textPrimary,
                fontSize: typography.fontSizes.md,
                fontWeight: typography.fontWeights.bold,
                marginBottom: spacing.md,
                textAlign: 'center',
              }}
            >
              {t.dashboard.noExpensesMonth}
            </Text>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => router.push('/expense/add')}
              accessibilityRole="button"
              accessibilityLabel={t.dashboard.addFirstExpense}
              style={{
                minHeight: 48,
                paddingHorizontal: spacing.lg,
                borderRadius: radius.md,
                backgroundColor: theme.colors.brand,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: spacing.xs,
              }}
            >
              <Plus size={18} color="#FFFFFF" strokeWidth={2.5} />
              <Text
                style={{
                  color: '#FFFFFF',
                  fontSize: typography.fontSizes.sm,
                  fontWeight: typography.fontWeights.bold,
                }}
              >
                {t.dashboard.addFirstExpense}
              </Text>
            </TouchableOpacity>
          </Card>
        ) : (
          <View>
            {groupedRecentExpenses.map((group) => (
              <View key={group.date} style={{ marginBottom: spacing.sm }}>
                {/* Date Register Subheader */}
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingHorizontal: spacing.xs,
                    paddingVertical: 6,
                    marginBottom: 4,
                  }}
                >
                  <Text
                    style={{
                      color: theme.colors.textSecondary,
                      fontSize: typography.fontSizes.xs,
                      fontWeight: typography.fontWeights.bold,
                      textTransform: 'capitalize',
                      letterSpacing: 0.2,
                    }}
                  >
                    {group.label}
                  </Text>
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
                    {family.currency}
                    {group.dayTotal.toFixed(2)}
                  </Text>
                </View>

                {group.items.map((expense) => (
                  <ExpenseItem
                    key={expense.id}
                    expense={expense}
                    category={categoryMap.get(expense.category_id)}
                    member={memberMap.get(expense.paid_by_member_id)}
                    currency={family.currency}
                    onPress={handleSelectExpense}
                  />
                ))}
              </View>
            ))}

            {/* Full-Width Ledger Register Footer Button */}
            {periodExpensesAll.length > periodExpenses.length && (
              <TouchableOpacity
                activeOpacity={0.75}
                onPress={handleOpenFullLedger}
                accessibilityRole="button"
                accessibilityLabel={t.dashboard.viewAll}
                style={{
                  minHeight: 52,
                  borderRadius: radius.md,
                  backgroundColor: theme.colors.surface,
                  borderWidth: 1,
                  borderColor: theme.colors.cardBorder,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: spacing.xs,
                  marginTop: spacing.xs,
                }}
              >
                <Text
                  style={{
                    color: theme.colors.brand,
                    fontSize: typography.fontSizes.md,
                    fontWeight: typography.fontWeights.bold,
                  }}
                >
                  {t.dashboard.viewAll} ({periodExpensesAll.length} {t.dashboard.totalTransactions})
                </Text>
                <ChevronRight size={18} color={theme.colors.brand} strokeWidth={2.5} />
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {/* Expense Detail Modal */}
      {selectedExpense && (
        <ExpenseDetailModal
          visible={Boolean(selectedExpense)}
          expense={selectedExpense}
          category={categoryMap.get(selectedExpense.category_id)}
          member={memberMap.get(selectedExpense.paid_by_member_id)}
          currency={family.currency}
          onClose={handleCloseModal}
          onDelete={handleDeleteExpense}
          onEdit={(exp) => setSelectedExpenseForEdit(exp)}
        />
      )}

      {/* Edit Expense Modal */}
      <EditExpenseModal
        visible={!!selectedExpenseForEdit}
        expense={selectedExpenseForEdit}
        categories={categories}
        members={members}
        currency={family.currency}
        onClose={() => setSelectedExpenseForEdit(null)}
        onSave={async (id, updates) => {
          await updateExpense(id, updates);
          setSelectedExpenseForEdit(null);
        }}
      />
    </ScrollView>
  );
}
