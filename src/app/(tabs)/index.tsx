import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { Plus, Upload, Flame, ArrowUpRight, ArrowRight, Receipt, Users } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { useI18n } from '@/i18n';
import { useAppStore } from '@/services/store';
import {
  calculateMonthlyMetrics,
  calculateCategoryBreakdown,
  calculateMemberContributions,
} from '@/services/analytics';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { KPIStat } from '@/components/common/KPIStat';
import { Avatar } from '@/components/common/Avatar';
import { Badge } from '@/components/common/Badge';
import { PeriodSelector } from '@/components/common/PeriodSelector';
import { ExpenseItem } from '@/components/ledger/ExpenseItem';
import { ExpenseDetailModal } from '@/components/ledger/ExpenseDetailModal';
import { Expense } from '@/types';

export default function DashboardScreen() {
  const router = useRouter();
  const { theme, spacing, radius, typography } = useTheme();
  const { t } = useI18n();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);

  const {
    family,
    members,
    categories,
    expenses,
    selectedPeriod,
    setSelectedPeriod,
    setFilters,
    deleteExpense,
  } = useAppStore();

  const periodExpenses = React.useMemo(
    () => expenses.filter((e) => e.transaction_date.startsWith(selectedPeriod)),
    [expenses, selectedPeriod],
  );

  const metrics = React.useMemo(
    () => calculateMonthlyMetrics(expenses, categories, members, selectedPeriod),
    [expenses, categories, members, selectedPeriod],
  );

  const categoryBreakdown = React.useMemo(
    () => calculateCategoryBreakdown(periodExpenses, categories),
    [periodExpenses, categories],
  );

  const memberContributions = React.useMemo(
    () => calculateMemberContributions(periodExpenses, members),
    [periodExpenses, members],
  );

  const recentExpenses = React.useMemo(() => {
    return [...periodExpenses]
      .sort(
        (a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime(),
      )
      .slice(0, 5);
  }, [periodExpenses]);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 500);
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      contentContainerStyle={{ padding: spacing.lg, paddingBottom: 100 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      showsVerticalScrollIndicator={false}
    >
      {/* Top Header Card with Quick Actions */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: spacing.md,
        }}
      >
        <View>
          <Text
            style={{
              color: theme.colors.textSecondary,
              fontSize: typography.fontSizes.xs,
              fontWeight: typography.fontWeights.medium,
            }}
          >
            {t.dashboard.householdOverview}
          </Text>
          <Text
            style={{
              color: theme.colors.textPrimary,
              fontSize: typography.fontSizes.xl,
              fontWeight: typography.fontWeights.bold,
            }}
          >
            {family.name}
          </Text>
        </View>

        <View style={{ flexDirection: 'row', gap: spacing.xs }}>
          <Button
            variant="secondary"
            size="sm"
            icon={<Upload size={16} color={theme.colors.brand} />}
            onPress={() => router.push('/(tabs)/import')}
            accessibilityLabel={t.common.import}
          />
          <Button
            variant="primary"
            size="sm"
            icon={<Plus size={16} color="#FFFFFF" />}
            onPress={() => router.push('/expense/add')}
            accessibilityLabel={t.common.add}
          />
        </View>
      </View>

      {/* Interactive Month Stepper */}
      <View style={{ marginBottom: spacing.md }}>
        <PeriodSelector selectedPeriod={selectedPeriod} onPeriodChange={setSelectedPeriod} />
      </View>

      {/* Main Total Spending Card */}
      <Card
        padding="lg"
        style={{
          marginBottom: spacing.lg,
          backgroundColor: theme.colors.brandLight,
          borderColor: theme.colors.brand,
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
          }}
        >
          <View>
            <Text
              style={{
                color: theme.isDark ? '#A5B4FC' : theme.colors.brand,
                fontSize: typography.fontSizes.sm,
                fontWeight: typography.fontWeights.semibold,
              }}
            >
              {t.dashboard.totalSpending}
            </Text>
            <Text
              style={{
                color: theme.colors.textPrimary,
                fontSize: typography.fontSizes.display,
                fontWeight: typography.fontWeights.heavy,
                marginTop: 2,
              }}
            >
              {family.currency}
              {metrics.totalSpend.toFixed(2)}
            </Text>
          </View>

          <Badge
            label={`${metrics.transactionCount} ${t.dashboard.txs}`}
            color={theme.colors.brand}
            variant="solid"
            size="md"
          />
        </View>
      </Card>

      {/* Daily Average Burn KPI */}
      <View style={{ marginBottom: spacing.lg }}>
        <KPIStat
          title={t.dashboard.dailyAverage}
          value={`${family.currency}${metrics.dailyAverageBurn.toFixed(0)}`}
          subtitle={t.dashboard.burnRatePerDay}
          icon={<Flame size={18} color={theme.colors.warning} />}
          variant="warning"
        />
      </View>

      {/* Member Spending Horizontal Carousel */}
      <View style={{ marginBottom: spacing.lg }}>
        <Text
          style={{
            color: theme.colors.textPrimary,
            fontSize: typography.fontSizes.lg,
            fontWeight: typography.fontWeights.bold,
            marginBottom: spacing.sm,
          }}
        >
          {t.dashboard.familyMembers}
        </Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: spacing.sm }}
        >
          {memberContributions.map((mc) => (
            <Card
              key={mc.member.id}
              padding="sm"
              style={{
                width: 140,
                alignItems: 'center',
                paddingVertical: spacing.md,
              }}
            >
              <Avatar
                name={mc.member.display_name}
                avatarUrl={mc.member.avatar_url}
                colorCode={mc.member.color_code}
                size="lg"
              />
              <Text
                style={{
                  color: theme.colors.textPrimary,
                  fontSize: typography.fontSizes.sm,
                  fontWeight: typography.fontWeights.bold,
                  marginTop: spacing.xs,
                }}
                numberOfLines={1}
              >
                {mc.member.display_name}
              </Text>
              <Text
                style={{
                  color: theme.colors.brand,
                  fontSize: typography.fontSizes.md,
                  fontWeight: typography.fontWeights.heavy,
                  marginTop: 2,
                }}
              >
                {family.currency}
                {mc.total.toFixed(0)}
              </Text>
              <Text style={{ color: theme.colors.textMuted, fontSize: 10 }}>
                {mc.percentage.toFixed(0)}%
              </Text>
            </Card>
          ))}
        </ScrollView>
      </View>

      {/* Analytics Shortcut Banner */}
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => router.push('/(tabs)/analytics')}
        style={{ marginBottom: spacing.lg }}
      >
        <Card
          padding="md"
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderLeftWidth: 4,
            borderLeftColor: theme.colors.brand,
          }}
        >
          <View style={{ flex: 1, marginRight: spacing.sm }}>
            <Text
              style={{
                color: theme.colors.textPrimary,
                fontSize: typography.fontSizes.sm,
                fontWeight: typography.fontWeights.bold,
              }}
            >
              {t.tabs.analytics}
            </Text>
            <Text
              style={{
                color: theme.colors.textSecondary,
                fontSize: typography.fontSizes.xs,
                marginTop: 2,
              }}
            >
              {categoryBreakdown.length > 0
                ? `${t.analytics.categoriesTab}: ${categoryBreakdown[0].category.name} (${family.currency}${categoryBreakdown[0].total.toFixed(0)})`
                : t.analytics.categoriesTab}
            </Text>
          </View>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
              backgroundColor: theme.colors.surfaceSubtle,
              paddingHorizontal: spacing.sm,
              paddingVertical: spacing.xs,
              borderRadius: radius.full,
            }}
          >
            <Text
              style={{
                color: theme.colors.brand,
                fontSize: typography.fontSizes.xs,
                fontWeight: typography.fontWeights.semibold,
              }}
            >
              {t.dashboard.viewAll}
            </Text>
            <ArrowUpRight size={14} color={theme.colors.brand} />
          </View>
        </Card>
      </TouchableOpacity>

      {/* Recent Expenses List */}
      <View>
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
              fontSize: typography.fontSizes.lg,
              fontWeight: typography.fontWeights.bold,
            }}
          >
            {t.dashboard.recentExpenses}
          </Text>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.push('/(tabs)/ledger')}
            style={{
              width: 32,
              height: 32,
              borderRadius: radius.full,
              backgroundColor: theme.colors.surfaceSubtle,
              alignItems: 'center',
              justifyContent: 'center',
            }}
            accessibilityLabel={t.dashboard.viewAll}
          >
            <ArrowRight size={16} color={theme.colors.brand} />
          </TouchableOpacity>
        </View>

        {recentExpenses.length === 0 ? (
          <Card padding="lg" style={{ alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: theme.colors.textMuted, fontSize: typography.fontSizes.sm }}>
              {t.dashboard.noExpensesMonth}
            </Text>
          </Card>
        ) : (
          recentExpenses.map((expense) => {
            const member = members.find((m) => m.id === expense.paid_by_member_id);
            const category = categories.find((c) => c.id === expense.category_id);
            return (
              <ExpenseItem
                key={expense.id}
                expense={expense}
                member={member}
                category={category}
                currency={family.currency}
                onPress={() => setSelectedExpense(expense)}
              />
            );
          })
        )}
      </View>

      {/* Expense Detail Modal */}
      <ExpenseDetailModal
        expense={selectedExpense}
        category={categories.find((c) => c.id === selectedExpense?.category_id)}
        member={members.find((m) => m.id === selectedExpense?.paid_by_member_id)}
        allMembers={members}
        visible={!!selectedExpense}
        onClose={() => setSelectedExpense(null)}
        onDelete={(id) => {
          deleteExpense(id);
          setSelectedExpense(null);
        }}
        currency={family.currency}
      />
    </ScrollView>
  );
}
