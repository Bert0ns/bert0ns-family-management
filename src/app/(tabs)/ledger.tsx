import { useState } from 'react';
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
import { FormModal } from '@/components/common/FormModal';
import { Input } from '@/components/common/Input';
import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { Avatar } from '@/components/common/Avatar';
import { IconHelper } from '@/components/common/IconHelper';
import { Expense, PeriodPreset, AmountBracket } from '@/types';

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

  const activePeriodPreset: PeriodPreset = filters.periodPreset || 'all';
  const activeAmountBracket: AmountBracket = filters.amountBracket || 'all';

  const selectedMember = members.find((m) => m.id === filters.selectedMemberId);
  const selectedCategory = categories.find((c) => c.id === filters.selectedCategoryId);

  // Helper date preset checker
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

  // Helper amount bracket checker
  const matchesAmountBracket = (amount: number, bracket: AmountBracket): boolean => {
    if (bracket === 'all') return true;
    if (bracket === 'under_20') return amount < 20;
    if (bracket === '20_to_100') return amount >= 20 && amount <= 100;
    if (bracket === 'over_100') return amount > 100;
    return true;
  };

  // Apply filters
  let filteredExpenses = expenses.filter((exp) => {
    // Search query
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

  // Apply sorting
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
      {/* Top Search & Actions Header */}
      <View
        style={{
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.lg,
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
              leftIcon={<Search size={20} color={theme.colors.textMuted} />}
              rightIcon={
                filters.searchQuery ? (
                  <TouchableOpacity onPress={() => setFilters({ searchQuery: '' })}>
                    <X size={20} color={theme.colors.textSecondary} />
                  </TouchableOpacity>
                ) : undefined
              }
              containerStyle={{ marginBottom: 0 }}
            />
          </View>

          {/* Filter Modal Button */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setIsFilterModalVisible(true)}
            accessibilityLabel={t.ledger.filtersTitle}
            style={{
              width: 52,
              height: 52,
              borderRadius: radius.lg,
              backgroundColor: hasActiveFilters ? theme.colors.brand : theme.colors.card,
              borderWidth: 1.5,
              borderColor: hasActiveFilters ? theme.colors.brand : theme.colors.border,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Filter size={22} color={hasActiveFilters ? '#FFFFFF' : theme.colors.textPrimary} />
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
                <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: 'bold' }}>
                  {activeFiltersCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Bulk Import JSON Button */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.push('/(tabs)/import')}
            accessibilityLabel={t.ledger.bulkImportButton}
            style={{
              width: 52,
              height: 52,
              borderRadius: radius.lg,
              backgroundColor: theme.colors.surfaceSubtle,
              borderWidth: 1.5,
              borderColor: theme.colors.border,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <FileJson size={22} color={theme.colors.brand} />
          </TouchableOpacity>

          {/* Quick Add Expense Button */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.push('/expense/add')}
            accessibilityLabel={t.common.add}
            style={{
              width: 52,
              height: 52,
              borderRadius: radius.lg,
              backgroundColor: theme.colors.brand,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Plus size={24} color="#FFFFFF" strokeWidth={3} />
          </TouchableOpacity>
        </View>

        {/* Quick Horizontal Period Strip */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: spacing.xs, paddingVertical: spacing.sm }}
        >
          {periodOptions.map((opt) => {
            const isSelected = activePeriodPreset === opt.key;
            return (
              <TouchableOpacity
                key={opt.key}
                activeOpacity={0.7}
                onPress={() => setFilters({ periodPreset: opt.key })}
                style={{
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.xs + 2,
                  borderRadius: radius.full,
                  backgroundColor: isSelected ? theme.colors.brand : theme.colors.surfaceSubtle,
                  borderWidth: 1,
                  borderColor: isSelected ? theme.colors.brand : theme.colors.border,
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
                  borderRadius: radius.full,
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
                  borderRadius: radius.full,
                  backgroundColor: theme.colors.surfaceSubtle,
                  borderWidth: 1.5,
                  borderColor: selectedCategory.color,
                }}
              >
                <IconHelper name={selectedCategory.icon} size={14} color={selectedCategory.color} />
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
                  borderRadius: radius.full,
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
                borderRadius: radius.full,
                backgroundColor: theme.colors.dangerBg,
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
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.md,
        }}
      >
        <TouchableOpacity
          onPress={toggleSort}
          activeOpacity={0.7}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
        >
          <ArrowDownUp size={16} color={theme.colors.brand} />
          <Text
            style={{
              color: theme.colors.brand,
              fontSize: typography.fontSizes.sm,
              fontWeight: typography.fontWeights.bold,
            }}
          >
            {getSortLabel()}
          </Text>
        </TouchableOpacity>

        <Text
          style={{
            color: theme.colors.textPrimary,
            fontSize: typography.fontSizes.md,
            fontWeight: typography.fontWeights.heavy,
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
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120 }}
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
                icon={<FileJson size={18} color={theme.colors.brand} />}
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
        category={categories.find((c) => c.id === selectedExpense?.category_id)}
        member={members.find((m) => m.id === selectedExpense?.paid_by_member_id)}
        allMembers={members}
        currency={family.currency}
        onClose={() => setSelectedExpense(null)}
        onDelete={deleteExpense}
      />

      {/* Detailed Senior-Accessible Filter Modal */}
      <FormModal
        visible={isFilterModalVisible}
        title={t.ledger.filtersTitle}
        icon={<Filter size={24} color={theme.colors.brand} />}
        onClose={() => setIsFilterModalVisible(false)}
        onSubmit={() => setIsFilterModalVisible(false)}
        submitTitle={t.ledger.applyFilters}
        cancelTitle={t.common.close}
      >
        <ScrollView style={{ maxHeight: 460 }} showsVerticalScrollIndicator={false}>
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
                      activeOpacity={0.7}
                      onPress={() => setFilters({ periodPreset: opt.key })}
                      style={{
                        minHeight: 46,
                        paddingHorizontal: spacing.md,
                        borderRadius: radius.lg,
                        backgroundColor: isSelected
                          ? theme.colors.brand
                          : theme.colors.surfaceSubtle,
                        borderWidth: 1.5,
                        borderColor: isSelected ? theme.colors.brand : theme.colors.border,
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
                      activeOpacity={0.7}
                      onPress={() => setFilters({ amountBracket: opt.key })}
                      style={{
                        minHeight: 46,
                        paddingHorizontal: spacing.md,
                        borderRadius: radius.lg,
                        backgroundColor: isSelected
                          ? theme.colors.brand
                          : theme.colors.surfaceSubtle,
                        borderWidth: 1.5,
                        borderColor: isSelected ? theme.colors.brand : theme.colors.border,
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
                  activeOpacity={0.7}
                  onPress={() => setFilters({ selectedMemberId: undefined })}
                  style={{
                    minHeight: 50,
                    paddingHorizontal: spacing.md,
                    borderRadius: radius.lg,
                    backgroundColor: !filters.selectedMemberId
                      ? theme.colors.brand
                      : theme.colors.surfaceSubtle,
                    borderWidth: 1.5,
                    borderColor: !filters.selectedMemberId
                      ? theme.colors.brand
                      : theme.colors.border,
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
                      activeOpacity={0.7}
                      onPress={() => setFilters({ selectedMemberId: m.id })}
                      style={{
                        minHeight: 50,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: spacing.sm,
                        paddingHorizontal: spacing.md,
                        borderRadius: radius.lg,
                        backgroundColor: isSelected
                          ? theme.colors.brand
                          : theme.colors.surfaceSubtle,
                        borderWidth: 1.5,
                        borderColor: isSelected ? theme.colors.brand : theme.colors.border,
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
                          color: isSelected ? '#FFFFFF' : theme.colors.textPrimary,
                          fontSize: typography.fontSizes.sm,
                          fontWeight: typography.fontWeights.bold,
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
                  activeOpacity={0.7}
                  onPress={() => setFilters({ selectedCategoryId: undefined })}
                  style={{
                    minHeight: 50,
                    paddingHorizontal: spacing.md,
                    borderRadius: radius.lg,
                    backgroundColor: !filters.selectedCategoryId
                      ? theme.colors.brand
                      : theme.colors.surfaceSubtle,
                    borderWidth: 1.5,
                    borderColor: !filters.selectedCategoryId
                      ? theme.colors.brand
                      : theme.colors.border,
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
                      activeOpacity={0.7}
                      onPress={() => setFilters({ selectedCategoryId: c.id })}
                      style={{
                        minHeight: 50,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: spacing.sm,
                        paddingHorizontal: spacing.md,
                        borderRadius: radius.lg,
                        backgroundColor: isSelected ? `${c.color}25` : theme.colors.surfaceSubtle,
                        borderWidth: 1.5,
                        borderColor: isSelected ? c.color : theme.colors.border,
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
                activeOpacity={0.7}
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
                  borderWidth: 1,
                  borderColor: theme.colors.danger,
                }}
              >
                <RotateCcw size={18} color={theme.colors.danger} />
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
        </ScrollView>
      </FormModal>
    </View>
  );
}
