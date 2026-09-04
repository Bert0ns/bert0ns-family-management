import React, { useState } from 'react';
import { View, Text, ScrollView, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Search, Filter, Plus, X, ArrowDownUp, UploadCloud } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { useI18n } from '@/i18n';
import { useAppStore } from '@/services/store';
import { ExpenseItem } from '@/components/ledger/ExpenseItem';
import { ExpenseDetailModal } from '@/components/ledger/ExpenseDetailModal';
import { FormModal } from '@/components/common/FormModal';
import { OptionSelector } from '@/components/common/OptionSelector';
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
  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);

  const selectedMember = members.find((m) => m.id === filters.selectedMemberId);
  const selectedCategory = categories.find((c) => c.id === filters.selectedCategoryId);
  const hasActiveFilters = !!(filters.selectedMemberId || filters.selectedCategoryId);
  const activeFiltersCount =
    (filters.selectedMemberId ? 1 : 0) + (filters.selectedCategoryId ? 1 : 0);

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
      {/* Search & Action Header */}
      <View
        style={{
          padding: spacing.lg,
          paddingBottom: spacing.sm,
          backgroundColor: theme.colors.surface,
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.border,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <View style={{ flex: 1 }}>
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
              containerStyle={{ marginBottom: 0 }}
            />
          </View>

          {/* Filter Modal Trigger */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setIsFilterModalVisible(true)}
            style={{
              width: 44,
              height: 44,
              borderRadius: radius.md,
              backgroundColor: hasActiveFilters ? theme.colors.brand : theme.colors.surfaceSubtle,
              borderWidth: 1,
              borderColor: hasActiveFilters ? theme.colors.brand : theme.colors.border,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Filter size={18} color={hasActiveFilters ? '#FFFFFF' : theme.colors.textSecondary} />
            {activeFiltersCount > 0 && (
              <View
                style={{
                  position: 'absolute',
                  top: -4,
                  right: -4,
                  backgroundColor: theme.colors.brand,
                  borderRadius: radius.full,
                  width: 18,
                  height: 18,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 2,
                  borderColor: theme.colors.surface,
                }}
              >
                <Text style={{ color: '#FFFFFF', fontSize: 10, fontWeight: 'bold' }}>
                  {activeFiltersCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Quick Import Shortcut */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.push('/(tabs)/import')}
            style={{
              width: 44,
              height: 44,
              borderRadius: radius.md,
              backgroundColor: theme.colors.surfaceSubtle,
              borderWidth: 1,
              borderColor: theme.colors.border,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <UploadCloud size={18} color={theme.colors.brand} />
          </TouchableOpacity>

          {/* Quick Add Expense Shortcut */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.push('/expense/add')}
            style={{
              width: 44,
              height: 44,
              borderRadius: radius.md,
              backgroundColor: theme.colors.brand,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Plus size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Active Filter Chips (Only rendered when filters are active) */}
        {hasActiveFilters && (
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: spacing.xs,
              marginTop: spacing.sm,
              alignItems: 'center',
            }}
          >
            {selectedMember && (
              <TouchableOpacity
                onPress={() => setFilters({ selectedMemberId: undefined })}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                  paddingVertical: 4,
                  paddingHorizontal: spacing.sm,
                  borderRadius: radius.full,
                  backgroundColor: theme.colors.surfaceSubtle,
                  borderWidth: 1,
                  borderColor: selectedMember.color_code,
                }}
              >
                <View
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: selectedMember.color_code,
                  }}
                />
                <Text
                  style={{
                    color: theme.colors.textPrimary,
                    fontSize: typography.fontSizes.xs,
                    fontWeight: typography.fontWeights.semibold,
                  }}
                >
                  {selectedMember.display_name}
                </Text>
                <X size={12} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            )}

            {selectedCategory && (
              <TouchableOpacity
                onPress={() => setFilters({ selectedCategoryId: undefined })}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                  paddingVertical: 4,
                  paddingHorizontal: spacing.sm,
                  borderRadius: radius.full,
                  backgroundColor: theme.colors.surfaceSubtle,
                  borderWidth: 1,
                  borderColor: selectedCategory.color,
                }}
              >
                <View
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: selectedCategory.color,
                  }}
                />
                <Text
                  style={{
                    color: theme.colors.textPrimary,
                    fontSize: typography.fontSizes.xs,
                    fontWeight: typography.fontWeights.semibold,
                  }}
                >
                  {selectedCategory.name}
                </Text>
                <X size={12} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            )}

            <TouchableOpacity
              onPress={() =>
                setFilters({ selectedMemberId: undefined, selectedCategoryId: undefined })
              }
              style={{ paddingVertical: 4, paddingHorizontal: spacing.xs }}
            >
              <Text
                style={{
                  color: theme.colors.textMuted,
                  fontSize: typography.fontSizes.xs,
                  fontWeight: typography.fontWeights.medium,
                  textDecorationLine: 'underline',
                }}
              >
                {t.ledger.resetFilters}
              </Text>
            </TouchableOpacity>
          </View>
        )}
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
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 100 }}
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

      {/* Filter Modal */}
      <FormModal
        visible={isFilterModalVisible}
        title={t.ledger.filtersTitle}
        icon={<Filter size={20} color={theme.colors.brand} />}
        onClose={() => setIsFilterModalVisible(false)}
        onSubmit={() => setIsFilterModalVisible(false)}
        submitTitle={t.common.save}
        cancelTitle={t.common.close}
      >
        <View style={{ gap: spacing.lg }}>
          <OptionSelector
            label={t.ledger.filterByMember}
            options={[
              { value: 'ALL', label: t.ledger.allMembers },
              ...members.map((m) => ({
                value: m.id,
                label: m.display_name,
                sublabel: m.role,
              })),
            ]}
            selectedValue={filters.selectedMemberId || 'ALL'}
            onSelect={(val) =>
              setFilters({ selectedMemberId: val === 'ALL' ? undefined : (val as string) })
            }
          />

          <OptionSelector
            label={t.ledger.filterByCategory}
            options={[
              { value: 'ALL', label: t.ledger.allCategories },
              ...categories.map((c) => ({
                value: c.id,
                label: c.name,
              })),
            ]}
            selectedValue={filters.selectedCategoryId || 'ALL'}
            onSelect={(val) =>
              setFilters({ selectedCategoryId: val === 'ALL' ? undefined : (val as string) })
            }
          />

          {hasActiveFilters && (
            <Button
              title={t.ledger.resetFilters}
              variant="outline"
              size="sm"
              onPress={() => {
                setFilters({ selectedMemberId: undefined, selectedCategoryId: undefined });
              }}
              style={{ marginTop: spacing.xs }}
            />
          )}
        </View>
      </FormModal>
    </View>
  );
}
