import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { Plus, FileJson, Receipt } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { useI18n } from '@/i18n';
import { useAppStore } from '@/services/store';
import { calculateMonthlyMetrics, calculateMemberContributions } from '@/services/analytics';
import { Card } from '@/components/common/Card';
import { Avatar } from '@/components/common/Avatar';
import { PeriodSelector } from '@/components/common/PeriodSelector';
import { ExpenseItem } from '@/components/ledger/ExpenseItem';
import { ExpenseDetailModal } from '@/components/ledger/ExpenseDetailModal';
import { EditExpenseModal } from '@/components/ledger/EditExpenseModal';
import { Expense } from '@/types';

export default function DashboardScreen() {
  const router = useRouter();
  const { theme, spacing, radius, typography } = useTheme();
  const { t } = useI18n();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [selectedExpenseForEdit, setSelectedExpenseForEdit] = useState<Expense | null>(null);

  const family = useAppStore((s) => s.family);
  const members = useAppStore((s) => s.members);
  const categories = useAppStore((s) => s.categories);
  const expenses = useAppStore((s) => s.expenses);
  const selectedPeriod = useAppStore((s) => s.selectedPeriod);
  const setSelectedPeriod = useAppStore((s) => s.setSelectedPeriod);
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
  const memberContributions = useMemo(
    () => calculateMemberContributions(periodExpensesAll, members),
    [periodExpensesAll, members],
  );

  // Filter expenses for selected period, sorted newest first, top 5
  const periodExpenses = useMemo(
    () =>
      [...periodExpensesAll]
        .sort((a, b) => b.transaction_date.localeCompare(a.transaction_date))
        .slice(0, 5),
    [periodExpensesAll],
  );

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

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      contentContainerStyle={{
        padding: spacing.lg,
        paddingBottom: 120,
        maxWidth: 760,
        width: '100%',
        alignSelf: 'center',
      }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      showsVerticalScrollIndicator={false}
    >
      {/* Month Stepper */}
      <View style={{ marginBottom: spacing.md }}>
        <PeriodSelector selectedPeriod={selectedPeriod} onPeriodChange={setSelectedPeriod} />
      </View>

      {/* Hero Overview Card */}
      <Card
        padding="lg"
        style={{
          marginBottom: spacing.md,
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: spacing.xs,
          }}
        >
          <Text
            style={{
              color: theme.colors.textSecondary,
              fontSize: typography.fontSizes.sm,
              fontWeight: typography.fontWeights.medium,
            }}
          >
            {t.dashboard.thisMonthSpending}
          </Text>
          <Text
            style={{
              color: theme.colors.textMuted,
              fontSize: typography.fontSizes.xs,
              fontWeight: typography.fontWeights.semibold,
            }}
          >
            {metrics.transactionCount} {t.dashboard.totalTransactions}
          </Text>
        </View>

        <Text
          style={{
            color: theme.colors.textPrimary,
            fontSize: typography.fontSizes.giant,
            fontWeight: typography.fontWeights.heavy,
            letterSpacing: -0.5,
            marginBottom: spacing.md,
          }}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.7}
        >
          {family.currency}
          {metrics.totalSpend.toFixed(2)}
        </Text>

        {/* Balanced Action Bar: Side-by-side Add & Import */}
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.push('/expense/add')}
            accessibilityLabel={t.dashboard.quickAddButton}
            style={{
              flex: 1,
              minHeight: 46,
              borderRadius: radius.sm,
              backgroundColor: theme.colors.brand,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              paddingHorizontal: spacing.md,
              gap: spacing.xs + 2,
            }}
          >
            <Plus size={18} color="#FFFFFF" strokeWidth={2.5} />
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
            accessibilityLabel={t.dashboard.bulkImportButton}
            style={{
              flex: 1,
              minHeight: 46,
              borderRadius: radius.sm,
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
            <FileJson size={18} color={theme.colors.textSecondary} strokeWidth={2} />
            <Text
              style={{
                color: theme.colors.textPrimary,
                fontSize: typography.fontSizes.md,
                fontWeight: typography.fontWeights.semibold,
              }}
              numberOfLines={1}
            >
              {t.dashboard.bulkImportButton}
            </Text>
          </TouchableOpacity>
        </View>
      </Card>

      {/* Family Member Contributions Section */}
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
              paddingTop: spacing.md,
              paddingBottom: spacing.sm,
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Text
              style={{
                color: theme.colors.textPrimary,
                fontSize: typography.fontSizes.md,
                fontWeight: typography.fontWeights.bold,
              }}
            >
              {t.dashboard.familyMembers}
            </Text>
            <Text
              style={{
                color: theme.colors.textMuted,
                fontSize: typography.fontSizes.xs,
                fontWeight: typography.fontWeights.medium,
              }}
            >
              {memberContributions.length}
            </Text>
          </View>

          {memberContributions.map((mc) => (
            <View
              key={mc.member.id}
              style={{
                paddingHorizontal: spacing.lg,
                paddingVertical: spacing.md - 2,
                borderTopWidth: 1,
                borderTopColor: theme.colors.borderSubtle,
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
                  colorCode={mc.member.color_code}
                  size="sm"
                />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 4,
                    }}
                  >
                    <Text
                      style={{
                        color: theme.colors.textPrimary,
                        fontSize: typography.fontSizes.sm,
                        fontWeight: typography.fontWeights.bold,
                      }}
                      numberOfLines={1}
                    >
                      {mc.member.display_name}
                    </Text>
                    <Text
                      style={{
                        color: theme.colors.textMuted,
                        fontSize: typography.fontSizes.xs,
                        fontWeight: typography.fontWeights.medium,
                      }}
                    >
                      {mc.percentage.toFixed(0)}% {t.dashboard.ofTotal}
                    </Text>
                  </View>

                  {/* Slim Progress Bar */}
                  <View
                    style={{
                      height: 3,
                      backgroundColor: theme.colors.borderSubtle,
                      borderRadius: radius.xs,
                      overflow: 'hidden',
                    }}
                  >
                    <View
                      style={{
                        height: '100%',
                        width: `${Math.min(mc.percentage, 100)}%`,
                        backgroundColor: mc.member.color_code || theme.colors.brand,
                      }}
                    />
                  </View>
                </View>
              </View>

              <Text
                style={{
                  color: theme.colors.textPrimary,
                  fontSize: typography.fontSizes.md,
                  fontWeight: typography.fontWeights.bold,
                  flexShrink: 0,
                  marginLeft: spacing.xs,
                }}
                numberOfLines={1}
              >
                {family.currency}
                {mc.total.toFixed(2)}
              </Text>
            </View>
          ))}
        </Card>
      )}

      {/* Recent Transactions Feed */}
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
              fontSize: typography.fontSizes.md,
              fontWeight: typography.fontWeights.bold,
            }}
          >
            {t.dashboard.recentExpenses}
          </Text>
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/ledger')}
            style={{ paddingVertical: 4 }}
            accessibilityLabel={t.dashboard.viewAll}
          >
            <Text
              style={{
                color: theme.colors.brand,
                fontSize: typography.fontSizes.sm,
                fontWeight: typography.fontWeights.semibold,
              }}
            >
              {t.dashboard.viewAll}
            </Text>
          </TouchableOpacity>
        </View>

        {periodExpenses.length === 0 ? (
          <Card padding="lg" style={{ alignItems: 'center', paddingVertical: spacing.xl }}>
            <Receipt size={32} color={theme.colors.textMuted} strokeWidth={1.5} />
            <Text
              style={{
                color: theme.colors.textSecondary,
                fontSize: typography.fontSizes.sm,
                fontWeight: typography.fontWeights.medium,
                marginTop: spacing.sm,
              }}
            >
              {t.dashboard.noExpensesMonth}
            </Text>
          </Card>
        ) : (
          periodExpenses.map((expense) => (
            <ExpenseItem
              key={expense.id}
              expense={expense}
              category={categoryMap.get(expense.category_id)}
              member={memberMap.get(expense.paid_by_member_id)}
              currency={family.currency}
              onPress={handleSelectExpense}
            />
          ))
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
