import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { Plus, ArrowRight, FileJson, Wallet, Receipt } from 'lucide-react-native';
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
      <View style={{ marginBottom: spacing.lg }}>
        <PeriodSelector selectedPeriod={selectedPeriod} onPeriodChange={setSelectedPeriod} />
      </View>

      {/* Hero Total Spending Card */}
      <Card
        padding="lg"
        style={{
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: spacing.lg,
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.xs,
            marginBottom: spacing.xs,
          }}
        >
          <Wallet size={20} color={theme.colors.brand} strokeWidth={2.5} />
          <Text
            style={{
              color: theme.colors.textSecondary,
              fontSize: typography.fontSizes.sm,
              fontWeight: typography.fontWeights.bold,
              textTransform: 'uppercase',
              letterSpacing: 1,
            }}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {t.dashboard.thisMonthSpending}
          </Text>
        </View>

        <Text
          style={{
            color: theme.colors.textPrimary,
            fontSize: typography.fontSizes.giant,
            fontWeight: typography.fontWeights.heavy,
            textAlign: 'center',
            marginVertical: spacing.xs,
            letterSpacing: -1,
          }}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.7}
        >
          {family.currency}
          {metrics.totalSpend.toFixed(2)}
        </Text>

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: theme.isDark
              ? theme.colors.surfaceContainerHigh
              : theme.colors.surfaceSubtle,
            borderWidth: 1,
            borderColor: theme.colors.borderTactile,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.xs + 2,
            borderRadius: radius.full,
            marginTop: spacing.xs,
            gap: 6,
          }}
        >
          <Receipt size={16} color={theme.colors.brand} strokeWidth={2.5} />
          <Text
            style={{
              color: theme.colors.textPrimary,
              fontSize: typography.fontSizes.sm,
              fontWeight: typography.fontWeights.bold,
            }}
            numberOfLines={1}
          >
            {metrics.transactionCount} {t.dashboard.totalTransactions}
          </Text>
        </View>
      </Card>

      {/* Primary Action Buttons: Giant Add Button & Bulk Import Button */}
      <View style={{ gap: spacing.sm, marginBottom: spacing.xl }}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => router.push('/expense/add')}
          accessibilityLabel={t.dashboard.quickAddButton}
          style={{
            minHeight: 60,
            borderRadius: radius.xl,
            backgroundColor: theme.colors.brand,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: spacing.md,
            gap: spacing.md,
            borderWidth: 1,
            borderColor: theme.isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.08)',
            shadowColor: theme.colors.brand,
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.35,
            shadowRadius: 16,
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
              flexShrink: 0,
            }}
          >
            <Plus size={22} color="#FFFFFF" strokeWidth={3} />
          </View>
          <Text
            style={{
              color: '#FFFFFF',
              fontSize: typography.fontSizes.lg,
              fontWeight: typography.fontWeights.heavy,
              letterSpacing: 0.3,
              flexShrink: 1,
            }}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {t.dashboard.quickAddButton}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.75}
          onPress={() => router.push('/(tabs)/import')}
          accessibilityLabel={t.dashboard.bulkImportButton}
          style={{
            minHeight: 52,
            borderRadius: radius.xl,
            backgroundColor: theme.isDark
              ? theme.colors.surfaceContainerHigh
              : theme.colors.surfaceSubtle,
            borderWidth: 1.5,
            borderColor: theme.colors.borderTactile,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: spacing.md,
            gap: spacing.sm,
          }}
        >
          <FileJson
            size={20}
            color={theme.colors.brand}
            strokeWidth={2.5}
            style={{ flexShrink: 0 }}
          />
          <Text
            style={{
              color: theme.colors.textPrimary,
              fontSize: typography.fontSizes.md,
              fontWeight: typography.fontWeights.bold,
              flexShrink: 1,
            }}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {t.dashboard.bulkImportButton}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Family Member Contributions Section */}
      {memberContributions.length > 0 && (
        <View style={{ marginBottom: spacing.xl }}>
          <Text
            style={{
              color: theme.colors.textPrimary,
              fontSize: typography.fontSizes.lg,
              fontWeight: typography.fontWeights.bold,
              marginBottom: spacing.md,
              letterSpacing: 0.2,
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
                    size="md"
                  />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text
                      style={{
                        color: theme.colors.textPrimary,
                        fontSize: typography.fontSizes.md,
                        fontWeight: typography.fontWeights.bold,
                      }}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {mc.member.display_name}
                    </Text>
                    <Text
                      style={{
                        color: theme.colors.textSecondary,
                        fontSize: typography.fontSizes.sm,
                        fontWeight: typography.fontWeights.medium,
                      }}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {mc.percentage.toFixed(0)}% {t.dashboard.ofTotal}
                    </Text>
                  </View>
                </View>

                <Text
                  style={{
                    color: theme.colors.textPrimary,
                    fontSize: typography.fontSizes.lg,
                    fontWeight: typography.fontWeights.heavy,
                    flexShrink: 0,
                  }}
                  numberOfLines={1}
                >
                  {family.currency}
                  {mc.total.toFixed(2)}
                </Text>
              </Card>
            ))}
          </View>
        </View>
      )}

      {/* Recent Transactions Feed */}
      <View>
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
              letterSpacing: 0.2,
            }}
          >
            {t.dashboard.recentExpenses}
          </Text>
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/ledger')}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4 }}
            accessibilityLabel={t.dashboard.viewAll}
          >
            <Text
              style={{
                color: theme.colors.brand,
                fontSize: typography.fontSizes.sm,
                fontWeight: typography.fontWeights.bold,
              }}
            >
              {t.dashboard.viewAll}
            </Text>
            <ArrowRight size={16} color={theme.colors.brand} strokeWidth={2.5} />
          </TouchableOpacity>
        </View>

        {periodExpenses.length === 0 ? (
          <Card padding="lg" style={{ alignItems: 'center', paddingVertical: spacing.xxl }}>
            <Receipt size={36} color={theme.colors.textMuted} strokeWidth={1.5} />
            <Text
              style={{
                color: theme.colors.textSecondary,
                fontSize: typography.fontSizes.md,
                fontWeight: typography.fontWeights.bold,
                marginTop: spacing.md,
              }}
            >
              {t.dashboard.noExpensesMonth}
            </Text>
          </Card>
        ) : (
          periodExpenses.map((expense) => {
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
          })
        )}
      </View>

      {/* Expense Detail Modal */}
      {selectedExpense && (
        <ExpenseDetailModal
          visible={Boolean(selectedExpense)}
          expense={selectedExpense}
          category={categories.find((c) => c.id === selectedExpense.category_id)}
          member={members.find((m) => m.id === selectedExpense.paid_by_member_id)}
          currency={family.currency}
          onClose={() => setSelectedExpense(null)}
          onDelete={(id) => {
            deleteExpense(id);
            setSelectedExpense(null);
          }}
        />
      )}
    </ScrollView>
  );
}
