import React, { useState } from 'react';
import { View, Text, ScrollView, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Search, Filter, Plus, X, ArrowDownUp } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { useI18n } from '@/i18n';
import { useAppStore } from '@/services/store';
import { ExpenseItem } from '@/components/ledger/ExpenseItem';
import { ExpenseDetailModal } from '@/components/ledger/ExpenseDetailModal';
import { Input } from '@/components/common/Input';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { Expense } from '@/types';

export default function LedgerScreen() {
  const router = useRouter();
  const { theme, spacing, radius, typography } = useTheme();
  const { t } = useI18n();
  const {
    family,
    members,
    categories,
    expenses,
    filters,
    setFilters,
    resetFilters,
    deleteExpense,
  } = useAppStore();

  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);

  // Apply filters
  let filteredExpenses = expenses.filter((exp) => {
    // Search query filter
    if (filters.searchQuery) {
      const q = filters.searchQuery.toLowerCase();
      const matchMerchant = exp.merchant_name.toLowerCase().includes(q);
      const matchNotes = (exp.notes || '').toLowerCase().includes(q);
      if (!matchMerchant && !matchNotes) return false;
    }

    // Member filter
    if (filters.selectedMemberId && exp.paid_by_member_id !== filters.selectedMemberId) {
      return false;
    }

    // Category filter
    if (filters.selectedCategoryId && exp.category_id !== filters.selectedCategoryId) {
      return false;
    }

    return true;
  });

  // Apply Sorting
  filteredExpenses = [...filteredExpenses].sort((a, b) => {
    switch (filters.sortBy) {
      case 'date_asc':
        return new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime();
      case 'amount_desc':
        return b.amount - a.amount;
      case 'amount_asc':
        return a.amount - b.amount;
      case 'date_desc':
      default:
        return new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime();
    }
  });

  const totalFilteredAmount = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);

  const toggleSort = () => {
    switch (filters.sortBy) {
      case 'date_desc':
        setFilters({ sortBy: 'date_asc' });
        break;
      case 'date_asc':
        setFilters({ sortBy: 'amount_desc' });
        break;
      case 'amount_desc':
        setFilters({ sortBy: 'amount_asc' });
        break;
      case 'amount_asc':
      default:
        setFilters({ sortBy: 'date_desc' });
        break;
    }
  };

  const getSortLabel = () => {
    switch (filters.sortBy) {
      case 'date_asc':
        return t.ledger.sortDateOldest;
      case 'amount_desc':
        return t.ledger.sortAmountHighest;
      case 'amount_asc':
        return t.ledger.sortAmountLowest;
      case 'date_desc':
      default:
        return t.ledger.sortDateNewest;
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      {/* Search & Filter Header */}
      <View
        style={{
          padding: spacing.lg,
          paddingBottom: spacing.sm,
          backgroundColor: theme.colors.surface,
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.border,
        }}
      >
        <Input
          placeholder={t.ledger.searchPlaceholder}
          value={filters.searchQuery}
          onChangeText={(text) => setFilters({ searchQuery: text })}
          leftIcon={<Search size={18} color={theme.colors.textMuted} />}
          rightIcon={
            filters.searchQuery ? (
              <TouchableOpacity onPress={() => setFilters({ searchQuery: '' })}>
                <X size={16} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            ) : undefined
          }
          containerStyle={{ marginBottom: spacing.sm }}
        />

        {/* Filter Pills - Members */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: spacing.xs, paddingBottom: spacing.xs }}
        >
          <TouchableOpacity
            onPress={() => setFilters({ selectedMemberId: undefined })}
            style={{
              paddingVertical: 4,
              paddingHorizontal: spacing.md,
              borderRadius: radius.full,
              backgroundColor: !filters.selectedMemberId
                ? theme.colors.brand
                : theme.colors.surfaceSubtle,
            }}
          >
            <Text
              style={{
                color: !filters.selectedMemberId ? '#FFFFFF' : theme.colors.textSecondary,
                fontSize: typography.fontSizes.xs,
                fontWeight: typography.fontWeights.semibold,
              }}
            >
              {t.ledger.allMembers}
            </Text>
          </TouchableOpacity>

          {members.map((m) => {
            const isSelected = filters.selectedMemberId === m.id;
            return (
              <TouchableOpacity
                key={m.id}
                onPress={() => setFilters({ selectedMemberId: isSelected ? undefined : m.id })}
                style={{
                  paddingVertical: 4,
                  paddingHorizontal: spacing.md,
                  borderRadius: radius.full,
                  backgroundColor: isSelected ? m.color_code : theme.colors.surfaceSubtle,
                }}
              >
                <Text
                  style={{
                    color: isSelected ? '#FFFFFF' : theme.colors.textSecondary,
                    fontSize: typography.fontSizes.xs,
                    fontWeight: typography.fontWeights.semibold,
                  }}
                >
                  {m.display_name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Filter Pills - Categories */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: spacing.xs, paddingTop: spacing.xs }}
        >
          <TouchableOpacity
            onPress={() => setFilters({ selectedCategoryId: undefined })}
            style={{
              paddingVertical: 4,
              paddingHorizontal: spacing.md,
              borderRadius: radius.full,
              backgroundColor: !filters.selectedCategoryId
                ? theme.colors.brand
                : theme.colors.surfaceSubtle,
            }}
          >
            <Text
              style={{
                color: !filters.selectedCategoryId ? '#FFFFFF' : theme.colors.textSecondary,
                fontSize: typography.fontSizes.xs,
                fontWeight: typography.fontWeights.semibold,
              }}
            >
              {t.ledger.allCategories}
            </Text>
          </TouchableOpacity>

          {categories.map((c) => {
            const isSelected = filters.selectedCategoryId === c.id;
            return (
              <TouchableOpacity
                key={c.id}
                onPress={() => setFilters({ selectedCategoryId: isSelected ? undefined : c.id })}
                style={{
                  paddingVertical: 4,
                  paddingHorizontal: spacing.md,
                  borderRadius: radius.full,
                  backgroundColor: isSelected ? c.color : theme.colors.surfaceSubtle,
                }}
              >
                <Text
                  style={{
                    color: isSelected ? '#FFFFFF' : theme.colors.textSecondary,
                    fontSize: typography.fontSizes.xs,
                    fontWeight: typography.fontWeights.semibold,
                  }}
                >
                  {c.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Summary Count & Sort Bar */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.sm,
        }}
      >
        <TouchableOpacity
          onPress={toggleSort}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
        >
          <ArrowDownUp size={14} color={theme.colors.brand} />
          <Text
            style={{
              color: theme.colors.brand,
              fontSize: typography.fontSizes.xs,
              fontWeight: typography.fontWeights.semibold,
            }}
          >
            {getSortLabel()}
          </Text>
        </TouchableOpacity>

        <Text
          style={{
            color: theme.colors.textPrimary,
            fontSize: typography.fontSizes.sm,
            fontWeight: typography.fontWeights.bold,
          }}
        >
          {filteredExpenses.length} {t.ledger.transactionsCount} • {family.currency}
          {totalFilteredAmount.toFixed(2)}
        </Text>
      </View>

      {/* Expense List */}
      <FlatList
        data={filteredExpenses}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.huge }}
        renderItem={({ item }) => {
          const cat = categories.find((c) => c.id === item.category_id);
          const mem = members.find((m) => m.id === item.paid_by_member_id);
          return (
            <ExpenseItem
              expense={item}
              category={cat}
              member={mem}
              currency={family.currency}
              onPress={() => setSelectedExpense(item)}
            />
          );
        }}
        ListEmptyComponent={
          <Card
            padding="lg"
            style={{ alignItems: 'center', justifyContent: 'center', marginTop: spacing.xl }}
          >
            <Text
              style={{
                color: theme.colors.textSecondary,
                fontSize: typography.fontSizes.md,
                fontWeight: typography.fontWeights.medium,
              }}
            >
              {t.ledger.noExpensesMatch}
            </Text>
            <Button
              title={t.ledger.resetFilters}
              variant="outline"
              size="sm"
              onPress={resetFilters}
              style={{ marginTop: spacing.md }}
            />
          </Card>
        }
      />

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
    </View>
  );
}
