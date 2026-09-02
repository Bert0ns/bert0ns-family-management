import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import {
  TrendingUp,
  Plus,
  Upload,
  Calendar,
  Wallet,
  Flame,
  ArrowUpRight,
  ShieldAlert,
} from 'lucide-react-native';
import { useTheme } from '@/theme';
import { useAppStore } from '@/services/store';
import {
  calculateMonthlyMetrics,
  calculateCategoryBreakdown,
  calculateMemberContributions,
  calculateSpendingVelocity,
} from '@/services/analytics';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { KPIStat } from '@/components/common/KPIStat';
import { Avatar } from '@/components/common/Avatar';
import { Badge } from '@/components/common/Badge';
import { ExpenseItem } from '@/components/ledger/ExpenseItem';
import { ExpenseDetailModal } from '@/components/ledger/ExpenseDetailModal';
import { CategoryPieChart } from '@/components/charts/CategoryPieChart';
import { SpendingVelocityChart } from '@/components/charts/SpendingVelocityChart';
import { Expense } from '@/types';

export default function DashboardScreen() {
  const router = useRouter();
  const { theme, spacing, radius, typography } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);

  const {
    family,
    members,
    categories,
    budgets,
    expenses,
    selectedPeriod,
    setSelectedPeriod,
    deleteExpense,
  } = useAppStore();

  const metrics = calculateMonthlyMetrics(expenses, budgets, categories, members, selectedPeriod);

  const categoryBreakdown = calculateCategoryBreakdown(
    expenses.filter((e) => e.transaction_date.startsWith(selectedPeriod)),
    categories,
  );

  const memberContributions = calculateMemberContributions(
    expenses.filter((e) => e.transaction_date.startsWith(selectedPeriod)),
    members,
  );

  const velocityData = calculateSpendingVelocity(expenses, metrics.totalBudget, selectedPeriod);

  const recentExpenses = expenses
    .filter((e) => e.transaction_date.startsWith(selectedPeriod))
    .slice(0, 5);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 500);
  };

  const periodLabel = new Date(`${selectedPeriod}-01`).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.huge }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      showsVerticalScrollIndicator={false}
    >
      {/* Top Header Card */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: spacing.lg,
        }}
      >
        <View>
          <Text
            style={{
              color: theme.colors.textSecondary,
              fontSize: typography.fontSizes.sm,
              fontWeight: typography.fontWeights.medium,
            }}
          >
            {family.name}
          </Text>
          <Text
            style={{
              color: theme.colors.textPrimary,
              fontSize: typography.fontSizes.xxl,
              fontWeight: typography.fontWeights.bold,
            }}
          >
            {periodLabel}
          </Text>
        </View>

        <View style={{ flexDirection: 'row', gap: spacing.xs }}>
          <Button
            title="Import"
            variant="secondary"
            size="sm"
            icon={<Upload size={14} color={theme.colors.brand} />}
            onPress={() => router.push('/(tabs)/import')}
          />
          <Button
            title="Add"
            variant="primary"
            size="sm"
            icon={<Plus size={14} color="#FFFFFF" />}
            onPress={() => router.push('/expense/add')}
          />
        </View>
      </View>

      {/* Main Budget Progress Card */}
      <Card
        padding="lg"
        style={{
          marginBottom: spacing.lg,
          backgroundColor: theme.isDark ? '#1E1B4B' : '#EEF2FF',
          borderColor: theme.colors.brandLight,
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
              Total Family Spending
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
            label={
              metrics.isOverBudget
                ? 'Over Budget'
                : `${metrics.budgetProgressPercent.toFixed(0)}% of Budget`
            }
            color={metrics.isOverBudget ? theme.colors.danger : theme.colors.success}
            variant="solid"
            size="md"
          />
        </View>

        {/* Progress Bar */}
        <View
          style={{
            height: 10,
            backgroundColor: theme.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
            borderRadius: radius.full,
            marginTop: spacing.md,
            overflow: 'hidden',
          }}
        >
          <View
            style={{
              height: '100%',
              width: `${Math.min(metrics.budgetProgressPercent, 100)}%`,
              backgroundColor: metrics.isOverBudget ? theme.colors.danger : theme.colors.brand,
              borderRadius: radius.full,
            }}
          />
        </View>

        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: spacing.sm,
          }}
        >
          <Text style={{ color: theme.colors.textSecondary, fontSize: typography.fontSizes.xs }}>
            Monthly Limit: {family.currency}
            {metrics.totalBudget.toFixed(0)}
          </Text>
          <Text
            style={{
              color: metrics.isOverBudget ? theme.colors.danger : theme.colors.textSecondary,
              fontSize: typography.fontSizes.xs,
              fontWeight: typography.fontWeights.semibold,
            }}
          >
            {metrics.isOverBudget
              ? `+${family.currency}${Math.abs(metrics.remainingBudget).toFixed(2)} over`
              : `${family.currency}${metrics.remainingBudget.toFixed(2)} remaining`}
          </Text>
        </View>
      </Card>

      {/* KPI Grid */}
      <View style={{ flexDirection: 'row', gap: spacing.md, marginBottom: spacing.lg }}>
        <KPIStat
          title="Daily Average"
          value={`${family.currency}${metrics.dailyAverageBurn.toFixed(0)}`}
          subtitle="Burn rate per day"
          icon={<Flame size={18} color={theme.colors.warning} />}
          variant="warning"
        />
        <KPIStat
          title="Month Forecast"
          value={`${family.currency}${metrics.projectedMonthEnd.toFixed(0)}`}
          subtitle={
            metrics.projectedMonthEnd > metrics.totalBudget ? 'Exceeds budget target' : 'On track'
          }
          icon={<TrendingUp size={18} color={theme.colors.info} />}
          variant={metrics.projectedMonthEnd > metrics.totalBudget ? 'danger' : 'success'}
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
          Family Members
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
                  fontWeight: typography.fontWeights.bold,
                  marginTop: 2,
                }}
              >
                {family.currency}
                {mc.total.toFixed(0)}
              </Text>
              <Text style={{ color: theme.colors.textMuted, fontSize: typography.fontSizes.xs }}>
                {mc.percentage.toFixed(0)}% • {mc.transactionCount} txs
              </Text>
            </Card>
          ))}
        </ScrollView>
      </View>

      {/* Visual Velocity Trend */}
      <View style={{ marginBottom: spacing.lg }}>
        <SpendingVelocityChart
          data={velocityData}
          totalBudget={metrics.totalBudget}
          currency={family.currency}
        />
      </View>

      {/* Category Donut Summary */}
      <View style={{ marginBottom: spacing.lg }}>
        <CategoryPieChart
          data={categoryBreakdown}
          currency={family.currency}
          onSelectCategory={() => router.push('/(tabs)/analytics')}
        />
      </View>

      {/* Recent Transactions List */}
      <View style={{ marginBottom: spacing.lg }}>
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
            Recent Expenses
          </Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/ledger')}>
            <Text
              style={{
                color: theme.colors.brand,
                fontSize: typography.fontSizes.sm,
                fontWeight: typography.fontWeights.semibold,
              }}
            >
              View All ({expenses.length})
            </Text>
          </TouchableOpacity>
        </View>

        {recentExpenses.map((expense) => {
          const cat = categories.find((c) => c.id === expense.category_id);
          const mem = members.find((m) => m.id === expense.paid_by_member_id);
          return (
            <ExpenseItem
              key={expense.id}
              expense={expense}
              category={cat}
              member={mem}
              currency={family.currency}
              onPress={() => setSelectedExpense(expense)}
            />
          );
        })}
      </View>

      {/* Expense Detail Modal */}
      <ExpenseDetailModal
        visible={!!selectedExpense}
        expense={selectedExpense}
        category={categories.find((c) => c.id === selectedExpense?.category_id)}
        member={members.find((m) => m.id === selectedExpense?.paid_by_member_id)}
        currency={family.currency}
        onClose={() => setSelectedExpense(null)}
        onDelete={deleteExpense}
      />
    </ScrollView>
  );
}
