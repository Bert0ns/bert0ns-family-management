import { useState, useMemo, useCallback } from 'react';
import { View, Text, ScrollView, FlatList, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import {
  Search,
  Filter,
  Plus,
  X,
  ArrowDownUp,
  Coins,
  RotateCcw,
  FileJson,
} from 'lucide-react-native';
import { useTheme } from '@/theme';
import { useI18n, getLocalizedCategoryName } from '@/i18n';
import { useAppStore } from '@/services/store';
import { ExpenseItem } from '@/components/ledger/ExpenseItem';
import { ExpenseDetailModal } from '@/components/ledger/ExpenseDetailModal';
import { EditExpenseModal } from '@/components/ledger/EditExpenseModal';
import { FormModal } from '@/components/common/FormModal';
import { Input } from '@/components/common/Input';
import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { Avatar } from '@/components/common/Avatar';
import { IconHelper } from '@/components/common/IconHelper';
import { Expense, PeriodPreset, AmountBracket } from '@/types';
import { sumBy } from '@/utils/numberParser';

// Hoisted helper date preset checker
const matchesPeriod = (dateStr: string, preset: PeriodPreset): boolean => {
  if (preset === 'all') return true;
  const parts = dateStr.split('-');
  if (parts.length < 2) return true;
  const expYear = parseInt(parts[0], 10);
  const expMonth = parseInt(parts[1], 10); // 1-indexed

  const now = new Date();
  const curYear = now.getFullYear();
  const curMonth = now.getMonth() + 1; // 1-indexed

  if (preset === 'this_month') {
    return expYear === curYear && expMonth === curMonth;
  }
  if (preset === 'last_month') {
    const prevYear = curMonth === 1 ? curYear - 1 : curYear;
    const prevMonth = curMonth === 1 ? 12 : curMonth - 1;
    return expYear === prevYear && expMonth === prevMonth;
  }
  if (preset === 'last_3_months') {
    const diffMonths = (curYear - expYear) * 12 + (curMonth - expMonth);
    return diffMonths >= 0 && diffMonths <= 2;
  }
  if (preset === 'this_year') {
    return expYear === curYear;
  }
  return true;
};

// Hoisted helper amount bracket checker
const matchesAmountBracket = (amount: number, bracket: AmountBracket): boolean => {
  if (bracket === 'all') return true;
  if (bracket === 'under_20') return amount < 20;
  if (bracket === '20_to_100') return amount >= 20 && amount <= 100;
  if (bracket === 'over_100') return amount > 100;
  return true;
};

export default function LedgerScreen() {
  const router = useRouter();
  const { theme, spacing, radius, typography } = useTheme();
  const { t } = useI18n();

  const family = useAppStore((s) => s.family);
  const members = useAppStore((s) => s.members);
  const categories = useAppStore((s) => s.categories);
  const expenses = useAppStore((s) => s.expenses);
  const filters = useAppStore((s) => s.filters);
  const setFilters = useAppStore((s) => s.setFilters);
  const resetFilters = useAppStore((s) => s.resetFilters);
  const deleteExpense = useAppStore((s) => s.deleteExpense);
  const updateExpense = useAppStore((s) => s.updateExpense);

  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [selectedExpenseForEdit, setSelectedExpenseForEdit] = useState<Expense | null>(null);
  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);

  const activePeriodPreset: PeriodPreset = filters.periodPreset || 'all';
  const activeAmountBracket: AmountBracket = filters.amountBracket || 'all';

  const categoryMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const memberMap = useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);

  const selectedMember = useMemo(
    () => (filters.selectedMemberId ? memberMap.get(filters.selectedMemberId) : undefined),
    [filters.selectedMemberId, memberMap],
  );
  const selectedCategory = useMemo(
    () => (filters.selectedCategoryId ? categoryMap.get(filters.selectedCategoryId) : undefined),
    [filters.selectedCategoryId, categoryMap],
  );

  // Apply filters and sorting with ISO comparison
  const filteredExpenses = useMemo(() => {
    const q = filters.searchQuery ? filters.searchQuery.toLowerCase() : '';
    const filtered = expenses.filter((exp) => {
      // Search query
      if (q) {
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

      // Period preset filter
      if (!matchesPeriod(exp.transaction_date, activePeriodPreset)) {
        return false;
      }

      // Amount bracket filter
      if (!matchesAmountBracket(exp.amount, activeAmountBracket)) {
        return false;
      }

      return true;
    });

    return filtered.sort((a, b) => {
      switch (filters.sortBy) {
        case 'date_asc':
          return a.transaction_date.localeCompare(b.transaction_date);
        case 'amount_desc':
          return b.amount - a.amount;
        case 'amount_asc':
          return a.amount - b.amount;
        case 'date_desc':
        default:
          return b.transaction_date.localeCompare(a.transaction_date);
      }
    });
  }, [expenses, filters, activePeriodPreset, activeAmountBracket]);

  const totalFilteredAmount = useMemo(
    () => sumBy(filteredExpenses, (e) => e.amount),
    [filteredExpenses],
  );

  const handleSelectExpense = useCallback((item: Expense) => {
    setSelectedExpense(item);
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

  const keyExtractor = useCallback((item: Expense) => item.id, []);

  const renderItem = useCallback(
    ({ item }: { item: Expense }) => (
      <ExpenseItem
        expense={item}
        category={categoryMap.get(item.category_id)}
        member={memberMap.get(item.paid_by_member_id)}
        currency={family.currency}
        onPress={handleSelectExpense}
      />
    ),
    [categoryMap, memberMap, family.currency, handleSelectExpense],
  );

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

  const handleResetFilters = () => {
    resetFilters();
    setFilters({
      periodPreset: 'all',
      amountBracket: 'all',
      searchQuery: '',
      selectedMemberId: undefined,
      selectedCategoryId: undefined,
    });
  };

  const periodOptions: { key: PeriodPreset; label: string }[] = [
    { key: 'all', label: t.ledger.filterPresetAll },
    { key: 'this_month', label: t.ledger.filterPresetMonth },
    { key: 'last_month', label: t.ledger.filterPresetLastMonth },
    { key: 'last_3_months', label: t.ledger.filterPreset3Months },
    { key: 'this_year', label: t.ledger.filterPresetYear },
  ];

  const amountOptions: { key: AmountBracket; label: string }[] = [
    { key: 'all', label: t.ledger.amountAll },
    { key: 'under_20', label: t.ledger.amountUnder20 },
    { key: '20_to_100', label: t.ledger.amount20to100 },
    { key: 'over_100', label: t.ledger.amountOver100 },
  ];

  const hasActiveFilters =
    Boolean(filters.searchQuery) ||
    Boolean(filters.selectedMemberId) ||
    Boolean(filters.selectedCategoryId) ||
    activePeriodPreset !== 'all' ||
    activeAmountBracket !== 'all';

  const activeFiltersCount =
    (filters.searchQuery ? 1 : 0) +
    (filters.selectedMemberId ? 1 : 0) +
    (filters.selectedCategoryId ? 1 : 0) +
    (activePeriodPreset !== 'all' ? 1 : 0) +
    (activeAmountBracket !== 'all' ? 1 : 0);

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <View style={{ flex: 1, width: '100%', maxWidth: 760, alignSelf: 'center' }}>
        {/* Top Search & Actions Header */}
        <View
          style={{
            paddingHorizontal: spacing.lg,
            paddingTop: spacing.lg,
            paddingBottom: spacing.sm,
            backgroundColor: theme.colors.surface,
            borderBottomWidth: 1.5,
            borderBottomColor: theme.colors.borderTactile,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Input
                placeholder={t.ledger.searchPlaceholder}
                value={filters.searchQuery}
                onChangeText={(text) => setFilters({ searchQuery: text })}
                leftIcon={<Search size={18} color={theme.colors.textMuted} strokeWidth={2.5} />}
                rightIcon={
                  filters.searchQuery ? (
                    <TouchableOpacity onPress={() => setFilters({ searchQuery: '' })}>
                      <X size={18} color={theme.colors.textSecondary} strokeWidth={2.5} />
                    </TouchableOpacity>
                  ) : undefined
                }
                containerStyle={{ marginBottom: 0 }}
              />
            </View>

            {/* Filter Modal Button */}
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() => setIsFilterModalVisible(true)}
              accessibilityLabel={t.ledger.filtersTitle}
              style={{
                width: 42,
                height: 42,
                borderRadius: radius.lg,
                backgroundColor: hasActiveFilters
                  ? theme.colors.brand
                  : theme.isDark
                    ? theme.colors.surfaceContainerHigh
                    : theme.colors.surfaceSubtle,
                borderWidth: 1.5,
                borderColor: hasActiveFilters ? theme.colors.brand : theme.colors.borderTactile,
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Filter
                size={20}
                color={hasActiveFilters ? '#FFFFFF' : theme.colors.textPrimary}
                strokeWidth={2.5}
              />
              {activeFiltersCount > 0 && (
                <View
                  style={{
                    position: 'absolute',
                    top: -4,
                    right: -4,
                    backgroundColor: theme.colors.danger,
                    borderRadius: radius.full,
                    width: 20,
                    height: 20,
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

            {/* Bulk Import JSON Button */}
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() => router.push('/(tabs)/import')}
              accessibilityLabel={t.ledger.bulkImportButton}
              style={{
                width: 42,
                height: 42,
                borderRadius: radius.lg,
                backgroundColor: theme.isDark
                  ? theme.colors.surfaceContainerHigh
                  : theme.colors.surfaceSubtle,
                borderWidth: 1.5,
                borderColor: theme.colors.borderTactile,
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <FileJson size={20} color={theme.colors.brand} strokeWidth={2.5} />
            </TouchableOpacity>

            {/* Quick Add Expense Button */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => router.push('/expense/add')}
              accessibilityLabel={t.common.add}
              style={{
                width: 42,
                height: 42,
                borderRadius: radius.lg,
                backgroundColor: theme.colors.brand,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: theme.isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.08)',
                flexShrink: 0,
              }}
            >
              <Plus size={22} color="#FFFFFF" strokeWidth={3} />
            </TouchableOpacity>
          </View>

          {/* Quick Horizontal Period Strip */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: spacing.sm, paddingVertical: spacing.sm }}
          >
            {periodOptions.map((opt) => {
              const isSelected = activePeriodPreset === opt.key;
              return (
                <TouchableOpacity
                  key={opt.key}
                  activeOpacity={0.75}
                  onPress={() => setFilters({ periodPreset: opt.key })}
                  style={{
                    paddingHorizontal: spacing.md,
                    paddingVertical: spacing.xs + 3,
                    borderRadius: radius.sm,
                    backgroundColor: isSelected
                      ? theme.colors.brand
                      : theme.isDark
                        ? theme.colors.surfaceContainerHigh
                        : theme.colors.surfaceSubtle,
                    borderWidth: 1.5,
                    borderColor: isSelected ? theme.colors.brand : theme.colors.borderTactile,
                  }}
                >
                  <Text
                    style={{
                      color: isSelected ? '#FFFFFF' : theme.colors.textSecondary,
                      fontSize: typography.fontSizes.sm,
                      fontWeight: isSelected
                        ? typography.fontWeights.bold
                        : typography.fontWeights.medium,
                    }}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Active Filter Chips Strip */}
          {hasActiveFilters && (
            <View
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                gap: spacing.xs,
                alignItems: 'center',
                paddingTop: spacing.xs,
              }}
            >
              {selectedMember && (
                <TouchableOpacity
                  onPress={() => setFilters({ selectedMemberId: undefined })}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    paddingVertical: 6,
                    paddingHorizontal: spacing.sm,
                    borderRadius: radius.sm,
                    backgroundColor: theme.colors.surfaceSubtle,
                    borderWidth: 1.5,
                    borderColor: selectedMember.color_code,
                  }}
                >
                  <Avatar
                    name={selectedMember.display_name}
                    colorCode={selectedMember.color_code}
                    size="sm"
                  />
                  <Text
                    style={{
                      color: theme.colors.textPrimary,
                      fontSize: typography.fontSizes.xs,
                      fontWeight: typography.fontWeights.bold,
                    }}
                  >
                    {selectedMember.display_name}
                  </Text>
                  <X size={14} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              )}

              {selectedCategory && (
                <TouchableOpacity
                  onPress={() => setFilters({ selectedCategoryId: undefined })}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    paddingVertical: 6,
                    paddingHorizontal: spacing.sm,
                    borderRadius: radius.sm,
                    backgroundColor: theme.colors.surfaceSubtle,
                    borderWidth: 1.5,
                    borderColor: selectedCategory.color,
                  }}
                >
                  <IconHelper
                    name={selectedCategory.icon}
                    size={14}
                    color={selectedCategory.color}
                  />
                  <Text
                    style={{
                      color: theme.colors.textPrimary,
                      fontSize: typography.fontSizes.xs,
                      fontWeight: typography.fontWeights.bold,
                    }}
                  >
                    {getLocalizedCategoryName(selectedCategory, t)}
                  </Text>
                  <X size={14} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              )}

              {activeAmountBracket !== 'all' && (
                <TouchableOpacity
                  onPress={() => setFilters({ amountBracket: 'all' })}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    paddingVertical: 6,
                    paddingHorizontal: spacing.sm,
                    borderRadius: radius.sm,
                    backgroundColor: theme.colors.surfaceSubtle,
                    borderWidth: 1.5,
                    borderColor: theme.colors.brand,
                  }}
                >
                  <Coins size={14} color={theme.colors.brand} />
                  <Text
                    style={{
                      color: theme.colors.textPrimary,
                      fontSize: typography.fontSizes.xs,
                      fontWeight: typography.fontWeights.bold,
                    }}
                  >
                    {amountOptions.find((a) => a.key === activeAmountBracket)?.label}
                  </Text>
                  <X size={14} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              )}

              {/* Clear All Chip */}
              <TouchableOpacity
                onPress={handleResetFilters}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                  paddingVertical: 6,
                  paddingHorizontal: spacing.sm,
                  borderRadius: radius.sm,
                  backgroundColor: theme.colors.dangerBg,
                  borderWidth: 1,
                  borderColor: theme.colors.danger,
                }}
              >
                <RotateCcw size={12} color={theme.colors.danger} />
                <Text
                  style={{
                    color: theme.colors.danger,
                    fontSize: typography.fontSizes.xs,
                    fontWeight: typography.fontWeights.bold,
                  }}
                >
                  {t.ledger.clearFilters}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Filter Summary & Sorting Header */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: spacing.sm,
            paddingHorizontal: spacing.lg,
            paddingVertical: spacing.sm + 2,
          }}
        >
          <TouchableOpacity
            onPress={toggleSort}
            activeOpacity={0.75}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 }}
          >
            <ArrowDownUp
              size={16}
              color={theme.colors.brand}
              strokeWidth={2.5}
              style={{ flexShrink: 0 }}
            />
            <Text
              style={{
                color: theme.colors.brand,
                fontSize: typography.fontSizes.sm,
                fontWeight: typography.fontWeights.bold,
                flexShrink: 1,
              }}
              numberOfLines={1}
              ellipsizeMode="tail"
              adjustsFontSizeToFit
              minimumFontScale={0.8}
            >
              {getSortLabel()}
            </Text>
          </TouchableOpacity>

          <Text
            style={{
              color: theme.colors.textPrimary,
              fontSize: typography.fontSizes.sm,
              fontWeight: typography.fontWeights.heavy,
              flexShrink: 0,
              maxWidth: '50%',
              textAlign: 'right',
            }}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.85}
          >
            {filteredExpenses.length} {t.ledger.transactionsCount} • {family.currency}
            {totalFilteredAmount.toFixed(2)}
          </Text>
        </View>

        {/* Expense List */}
        <FlatList
          data={filteredExpenses}
          keyExtractor={keyExtractor}
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: 130 }}
          showsVerticalScrollIndicator={false}
          renderItem={renderItem}
          ListEmptyComponent={
            <Card
              padding="lg"
              style={{
                alignItems: 'center',
                justifyContent: 'center',
                marginTop: spacing.xl,
                gap: spacing.md,
              }}
            >
              <Text
                style={{
                  color: theme.colors.textSecondary,
                  fontSize: typography.fontSizes.lg,
                  fontWeight: typography.fontWeights.semibold,
                  textAlign: 'center',
                }}
              >
                {t.ledger.noExpensesMatch}
              </Text>
              <View
                style={{
                  flexDirection: 'row',
                  gap: spacing.sm,
                  flexWrap: 'wrap',
                  justifyContent: 'center',
                }}
              >
                <Button
                  title={t.ledger.resetFilters}
                  variant="outline"
                  size="md"
                  onPress={handleResetFilters}
                />
                <Button
                  title={t.ledger.bulkImportButton}
                  variant="secondary"
                  size="md"
                  icon={<FileJson size={18} color={theme.colors.brand} strokeWidth={2.5} />}
                  onPress={() => router.push('/(tabs)/import')}
                />
              </View>
            </Card>
          }
        />

        {/* Expense Detail Modal */}
        <ExpenseDetailModal
          visible={!!selectedExpense}
          expense={selectedExpense}
          category={selectedExpense ? categoryMap.get(selectedExpense.category_id) : undefined}
          member={selectedExpense ? memberMap.get(selectedExpense.paid_by_member_id) : undefined}
          currency={family.currency}
          onClose={handleCloseModal}
          onDelete={handleDeleteExpense}
          onEdit={(exp) => setSelectedExpenseForEdit(exp)}
        />

        {/* Edit Expense Modal */}
        <EditExpenseModal
          visible={!!selectedExpenseForEdit}
          expense={selectedExpenseForEdit}
          categories={categories}
          members={members}
          currency={family.currency}
          onClose={() => setSelectedExpenseForEdit(null)}
          onSave={(id, updates) => {
            updateExpense(id, updates);
          }}
        />

        {/* Detailed Senior-Accessible Filter Modal */}
        <FormModal
          visible={isFilterModalVisible}
          title={t.ledger.filtersTitle}
          icon={<Filter size={24} color={theme.colors.brand} strokeWidth={2.5} />}
          onClose={() => setIsFilterModalVisible(false)}
          onSubmit={() => setIsFilterModalVisible(false)}
          submitTitle={t.ledger.applyFilters}
          cancelTitle={t.common.close}
        >
          <View style={{ gap: spacing.xl, paddingVertical: spacing.xs }}>
            {/* Period Section */}
            <View>
              <Text
                style={{
                  fontSize: typography.fontSizes.md,
                  fontWeight: typography.fontWeights.bold,
                  color: theme.colors.textPrimary,
                  marginBottom: spacing.sm,
                }}
              >
                {t.expenseDetail.date}
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
                {periodOptions.map((opt) => {
                  const isSelected = activePeriodPreset === opt.key;
                  return (
                    <TouchableOpacity
                      key={opt.key}
                      activeOpacity={0.75}
                      onPress={() => setFilters({ periodPreset: opt.key })}
                      style={{
                        minHeight: 46,
                        paddingHorizontal: spacing.md,
                        borderRadius: radius.lg,
                        backgroundColor: isSelected
                          ? theme.colors.brand
                          : theme.isDark
                            ? theme.colors.surfaceContainerHigh
                            : theme.colors.surfaceSubtle,
                        borderWidth: 1.5,
                        borderColor: isSelected ? theme.colors.brand : theme.colors.borderTactile,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Text
                        style={{
                          color: isSelected ? '#FFFFFF' : theme.colors.textPrimary,
                          fontSize: typography.fontSizes.sm,
                          fontWeight: typography.fontWeights.bold,
                        }}
                      >
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Amount Bracket Section */}
            <View>
              <Text
                style={{
                  fontSize: typography.fontSizes.md,
                  fontWeight: typography.fontWeights.bold,
                  color: theme.colors.textPrimary,
                  marginBottom: spacing.sm,
                }}
              >
                {t.addExpense.amountLabel}
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
                {amountOptions.map((opt) => {
                  const isSelected = activeAmountBracket === opt.key;
                  return (
                    <TouchableOpacity
                      key={opt.key}
                      activeOpacity={0.75}
                      onPress={() => setFilters({ amountBracket: opt.key })}
                      style={{
                        minHeight: 46,
                        paddingHorizontal: spacing.md,
                        borderRadius: radius.lg,
                        backgroundColor: isSelected
                          ? theme.colors.brand
                          : theme.isDark
                            ? theme.colors.surfaceContainerHigh
                            : theme.colors.surfaceSubtle,
                        borderWidth: 1.5,
                        borderColor: isSelected ? theme.colors.brand : theme.colors.borderTactile,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Text
                        style={{
                          color: isSelected ? '#FFFFFF' : theme.colors.textPrimary,
                          fontSize: typography.fontSizes.sm,
                          fontWeight: typography.fontWeights.bold,
                        }}
                      >
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Filter by Member */}
            <View>
              <Text
                style={{
                  fontSize: typography.fontSizes.md,
                  fontWeight: typography.fontWeights.bold,
                  color: theme.colors.textPrimary,
                  marginBottom: spacing.sm,
                }}
              >
                {t.ledger.filterByMember}
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
                <TouchableOpacity
                  activeOpacity={0.75}
                  onPress={() => setFilters({ selectedMemberId: undefined })}
                  style={{
                    minHeight: 50,
                    paddingHorizontal: spacing.md,
                    borderRadius: radius.lg,
                    backgroundColor: !filters.selectedMemberId
                      ? theme.colors.brand
                      : theme.isDark
                        ? theme.colors.surfaceContainerHigh
                        : theme.colors.surfaceSubtle,
                    borderWidth: 1.5,
                    borderColor: !filters.selectedMemberId
                      ? theme.colors.brand
                      : theme.colors.borderTactile,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text
                    style={{
                      color: !filters.selectedMemberId ? '#FFFFFF' : theme.colors.textPrimary,
                      fontSize: typography.fontSizes.sm,
                      fontWeight: typography.fontWeights.bold,
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
                      activeOpacity={0.75}
                      onPress={() => setFilters({ selectedMemberId: m.id })}
                      style={{
                        minHeight: 50,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: spacing.sm,
                        paddingHorizontal: spacing.md,
                        borderRadius: radius.lg,
                        backgroundColor: isSelected
                          ? `${m.color_code}25`
                          : theme.isDark
                            ? theme.colors.surfaceContainerHigh
                            : theme.colors.surfaceSubtle,
                        borderWidth: 1.5,
                        borderColor: isSelected ? m.color_code : theme.colors.borderTactile,
                      }}
                    >
                      <Avatar
                        name={m.display_name}
                        avatarUrl={m.avatar_url}
                        colorCode={m.color_code}
                        size="sm"
                      />
                      <Text
                        style={{
                          color: isSelected ? m.color_code : theme.colors.textPrimary,
                          fontSize: typography.fontSizes.sm,
                          fontWeight: isSelected
                            ? typography.fontWeights.heavy
                            : typography.fontWeights.semibold,
                        }}
                      >
                        {m.display_name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Filter by Category */}
            <View>
              <Text
                style={{
                  fontSize: typography.fontSizes.md,
                  fontWeight: typography.fontWeights.bold,
                  color: theme.colors.textPrimary,
                  marginBottom: spacing.sm,
                }}
              >
                {t.ledger.filterByCategory}
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
                <TouchableOpacity
                  activeOpacity={0.75}
                  onPress={() => setFilters({ selectedCategoryId: undefined })}
                  style={{
                    minHeight: 50,
                    paddingHorizontal: spacing.md,
                    borderRadius: radius.lg,
                    backgroundColor: !filters.selectedCategoryId
                      ? theme.colors.brand
                      : theme.isDark
                        ? theme.colors.surfaceContainerHigh
                        : theme.colors.surfaceSubtle,
                    borderWidth: 1.5,
                    borderColor: !filters.selectedCategoryId
                      ? theme.colors.brand
                      : theme.colors.borderTactile,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text
                    style={{
                      color: !filters.selectedCategoryId ? '#FFFFFF' : theme.colors.textPrimary,
                      fontSize: typography.fontSizes.sm,
                      fontWeight: typography.fontWeights.bold,
                    }}
                  >
                    {t.ledger.allCategories}
                  </Text>
                </TouchableOpacity>

                {categories.map((c) => {
                  const isSelected = filters.selectedCategoryId === c.id;
                  const catDisplayName = getLocalizedCategoryName(c, t);
                  return (
                    <TouchableOpacity
                      key={c.id}
                      activeOpacity={0.75}
                      onPress={() => setFilters({ selectedCategoryId: c.id })}
                      style={{
                        minHeight: 50,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: spacing.sm,
                        paddingHorizontal: spacing.md,
                        borderRadius: radius.lg,
                        backgroundColor: isSelected
                          ? `${c.color}25`
                          : theme.isDark
                            ? theme.colors.surfaceContainerHigh
                            : theme.colors.surfaceSubtle,
                        borderWidth: 1.5,
                        borderColor: isSelected ? c.color : theme.colors.borderTactile,
                      }}
                    >
                      <IconHelper name={c.icon} size={18} color={c.color} />
                      <Text
                        style={{
                          color: isSelected ? c.color : theme.colors.textPrimary,
                          fontSize: typography.fontSizes.sm,
                          fontWeight: isSelected
                            ? typography.fontWeights.heavy
                            : typography.fontWeights.semibold,
                        }}
                      >
                        {catDisplayName}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Reset All Button */}
            {hasActiveFilters && (
              <TouchableOpacity
                activeOpacity={0.75}
                onPress={() => {
                  handleResetFilters();
                  setIsFilterModalVisible(false);
                }}
                style={{
                  minHeight: 50,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: spacing.sm,
                  backgroundColor: theme.colors.dangerBg,
                  borderRadius: radius.lg,
                  borderWidth: 1.5,
                  borderColor: theme.colors.danger,
                }}
              >
                <RotateCcw size={18} color={theme.colors.danger} strokeWidth={2.5} />
                <Text
                  style={{
                    color: theme.colors.danger,
                    fontSize: typography.fontSizes.md,
                    fontWeight: typography.fontWeights.bold,
                  }}
                >
                  {t.ledger.clearFilters}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </FormModal>
      </View>
    </View>
  );
}
