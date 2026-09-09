import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { Plus, ArrowRight, FileJson } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { useI18n } from '@/i18n';
import { useAppStore } from '@/services/store';
import { calculateMonthlyMetrics, calculateMemberContributions } from '@/services/analytics';
import { Card } from '@/components/common/Card';
import { Avatar } from '@/components/common/Avatar';
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
    deleteExpense,
  } = useAppStore();

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 600);
  }, []);

  const metrics = calculateMonthlyMetrics(expenses, categories, members, selectedPeriod);
  const periodExpensesAll = expenses.filter((e) => e.transaction_date.startsWith(selectedPeriod));
  const memberContributions = calculateMemberContributions(periodExpensesAll, members);

  // Filter expenses for selected period, sorted newest first, top 5
  const periodExpenses = expenses
    .filter((e) => e.transaction_date.startsWith(selectedPeriod))
    .sort((a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime())
    .slice(0, 5);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      showsVerticalScrollIndicator={false}
    >
      {/* Month Stepper */}
      <View style={{ marginBottom: spacing.lg }}>
        <PeriodSelector selectedPeriod={selectedPeriod} onPeriodChange={setSelectedPeriod} />
      </View>

      {/* Hero Total Spending Card */}
      <View
        style={{
          backgroundColor: theme.colors.card,
          borderRadius: radius.xxl,
          paddingVertical: spacing.xl,
          paddingHorizontal: spacing.xl,
          borderWidth: 2,
          borderColor: theme.colors.brand,
          alignItems: 'center',
          marginBottom: spacing.lg,
          shadowColor: theme.colors.shadow,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.1,
          shadowRadius: 16,
          elevation: 4,
        }}
      >
        <Text
          style={{
            color: theme.colors.textSecondary,
            fontSize: typography.fontSizes.md,
            fontWeight: typography.fontWeights.semibold,
            textTransform: 'uppercase',
            letterSpacing: 1,
            marginBottom: spacing.xs,
          }}
        >
          {t.dashboard.thisMonthSpending}
        </Text>

        <Text
          style={{
            color: theme.colors.textPrimary,
            fontSize: 42,
            fontWeight: '800',
            textAlign: 'center',
            marginVertical: 4,
          }}
        >
          {family.currency}
          {metrics.totalSpend.toFixed(2)}
        </Text>

        <View
          style={{
            backgroundColor: theme.colors.brandLight,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.xs,
            borderRadius: radius.full,
            marginTop: spacing.xs,
          }}
        >
          <Text
            style={{
              color: theme.colors.brand,
              fontSize: typography.fontSizes.sm,
              fontWeight: typography.fontWeights.bold,
            }}
          >
            {metrics.transactionCount} {t.dashboard.totalTransactions}
          </Text>
        </View>
      </View>

      {/* Primary Action Buttons: Giant Add Button & Bulk Import Button */}
      <View style={{ gap: spacing.sm, marginBottom: spacing.xl }}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => router.push('/expense/add')}
          accessibilityLabel={t.dashboard.quickAddButton}
          style={{
            minHeight: 64,
            borderRadius: radius.xl,
            backgroundColor: theme.colors.brand,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: spacing.md,
            shadowColor: theme.colors.brand,
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.3,
            shadowRadius: 14,
            elevation: 6,
          }}
        >
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: radius.full,
              backgroundColor: 'rgba(255, 255, 255, 0.25)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Plus size={24} color="#FFFFFF" strokeWidth={3} />
          </View>
          <Text
            style={{
              color: '#FFFFFF',
              fontSize: typography.fontSizes.xl,
              fontWeight: typography.fontWeights.heavy,
            }}
          >
            {t.dashboard.quickAddButton}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => router.push('/(tabs)/import')}
          accessibilityLabel={t.dashboard.bulkImportButton}
          style={{
            minHeight: 52,
            borderRadius: radius.xl,
            backgroundColor: theme.colors.surfaceSubtle,
            borderWidth: 1.5,
            borderColor: theme.colors.border,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: spacing.sm,
          }}
        >
          <FileJson size={20} color={theme.colors.brand} />
          <Text
            style={{
              color: theme.colors.textPrimary,
              fontSize: typography.fontSizes.md,
              fontWeight: typography.fontWeights.semibold,
            }}
          >
            {t.dashboard.bulkImportButton}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Family Member Contributions Bar */}
      {memberContributions.length > 0 && (
        <View style={{ marginBottom: spacing.xl }}>
          <Text
            style={{
              color: theme.colors.textPrimary,
              fontSize: typography.fontSizes.lg,
              fontWeight: typography.fontWeights.bold,
              marginBottom: spacing.md,
            }}
          >
            {t.dashboard.familyMembers}
          </Text>

          <View style={{ gap: spacing.sm }}>
            {memberContributions.map((mc) => (
              <Card
                key={mc.member.id}
                padding="md"
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: theme.colors.card,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                  <Avatar
                    name={mc.member.display_name}
                    avatarUrl={mc.member.avatar_url}
                    colorCode={mc.member.color_code}
                    size="md"
                  />
                  <View>
                    <Text
                      style={{
                        color: theme.colors.textPrimary,
                        fontSize: typography.fontSizes.md,
                        fontWeight: typography.fontWeights.bold,
                      }}
                    >
                      {mc.member.display_name}
                    </Text>
                    <Text
                      style={{
                        color: theme.colors.textSecondary,
                        fontSize: typography.fontSizes.xs,
                      }}
                    >
                      {mc.percentage.toFixed(0)}% del totale
                    </Text>
                  </View>
                </View>

                <Text
                  style={{
                    color: theme.colors.textPrimary,
                    fontSize: typography.fontSizes.lg,
                    fontWeight: typography.fontWeights.heavy,
                  }}
                >
                  {family.currency}
                  {mc.total.toFixed(2)}
                </Text>
              </Card>
            ))}
          </View>
        </View>
      )}

      {/* Recent Expenses Simplified List */}
      <View style={{ marginBottom: spacing.xl }}>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: spacing.md,
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
            onPress={() => router.push('/ledger')}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
          >
            <Text
              style={{
                color: theme.colors.brand,
                fontSize: typography.fontSizes.md,
                fontWeight: typography.fontWeights.bold,
              }}
            >
              {t.dashboard.viewAll}
            </Text>
            <ArrowRight size={18} color={theme.colors.brand} />
          </TouchableOpacity>
        </View>

        {periodExpenses.length === 0 ? (
          <Card padding="lg" style={{ alignItems: 'center', justifyContent: 'center' }}>
            <Text
              style={{
                color: theme.colors.textSecondary,
                fontSize: typography.fontSizes.md,
                textAlign: 'center',
              }}
            >
              {t.dashboard.noExpensesMonth}
            </Text>
          </Card>
        ) : (
          periodExpenses.map((expense) => {
            const category = categories.find((c) => c.id === expense.category_id);
            const member = members.find((m) => m.id === expense.paid_by_member_id);
            return (
              <ExpenseItem
                key={expense.id}
                expense={expense}
                category={category}
                member={member}
                currency={family.currency}
                onPress={() => setSelectedExpense(expense)}
              />
            );
          })
        )}
      </View>

      {/* Expense Detail Modal */}
      <ExpenseDetailModal
        visible={!!selectedExpense}
        expense={selectedExpense}
        category={categories.find((c) => c.id === selectedExpense?.category_id)}
        member={members.find((m) => m.id === selectedExpense?.paid_by_member_id)}
        allMembers={members}
        currency={family.currency}
        onClose={() => setSelectedExpense(null)}
        onDelete={deleteExpense}
      />
    </ScrollView>
  );
}
