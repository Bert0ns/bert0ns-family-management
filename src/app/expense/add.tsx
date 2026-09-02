import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { DollarSign, Building, Tag, User, Calendar, FileText, Check } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { useI18n } from '@/i18n';
import { useAppStore } from '@/services/store';
import { Input } from '@/components/common/Input';
import { Button } from '@/components/common/Button';
import { Avatar } from '@/components/common/Avatar';
import { IconHelper } from '@/components/common/IconHelper';
import { SplitCalculator } from '@/components/ledger/SplitCalculator';
import { ExpenseSplit } from '@/types';

export default function AddExpenseScreen() {
  const router = useRouter();
  const { theme, spacing, radius, typography } = useTheme();
  const { t } = useI18n();
  const { family, members, categories, addExpense, currentMemberId } = useAppStore();

  const [amount, setAmount] = useState('');
  const [merchant, setMerchant] = useState('');
  const [categoryId, setCategoryId] = useState(categories[0]?.id || '');
  const [paidByMemberId, setPaidByMemberId] = useState(currentMemberId || members[0]?.id || '');
  const [transactionDate, setTransactionDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [splits, setSplits] = useState<ExpenseSplit[] | undefined>(undefined);
  const [errors, setErrors] = useState<{ amount?: string; merchant?: string }>({});

  const numericAmount = parseFloat(amount.replace(',', '.')) || 0;

  const handleSave = () => {
    const errs: { amount?: string; merchant?: string } = {};

    if (!amount || isNaN(numericAmount) || numericAmount <= 0) {
      errs.amount = t.addExpense.errorAmount;
    }
    if (!merchant.trim()) {
      errs.merchant = t.addExpense.errorMerchant;
    }

    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    addExpense({
      paid_by_member_id: paidByMemberId,
      category_id: categoryId,
      transaction_date: transactionDate,
      merchant_name: merchant.trim(),
      amount: numericAmount,
      notes: notes.trim() || undefined,
      payment_method: 'Manual Entry',
      is_recurring: false,
      is_verified: true,
      splits: splits,
    });

    router.back();
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.huge }}
      showsVerticalScrollIndicator={false}
    >
      {/* Amount Input */}
      <Input
        label={t.addExpense.amountLabel}
        placeholder="0.00"
        value={amount}
        onChangeText={(tVal) => {
          setAmount(tVal);
          if (errors.amount) setErrors({ ...errors, amount: undefined });
        }}
        keyboardType="decimal-pad"
        error={errors.amount}
        leftIcon={
          <Text
            style={{
              color: theme.colors.brand,
              fontSize: typography.fontSizes.lg,
              fontWeight: typography.fontWeights.bold,
            }}
          >
            {family.currency}
          </Text>
        }
      />

      {/* Merchant Name */}
      <Input
        label={t.addExpense.merchantLabel}
        placeholder={t.addExpense.merchantPlaceholder}
        value={merchant}
        onChangeText={(tVal) => {
          setMerchant(tVal);
          if (errors.merchant) setErrors({ ...errors, merchant: undefined });
        }}
        error={errors.merchant}
        leftIcon={<Building size={18} color={theme.colors.textMuted} />}
      />

      {/* Date */}
      <Input
        label={t.addExpense.dateLabel}
        placeholder="YYYY-MM-DD"
        value={transactionDate}
        onChangeText={setTransactionDate}
        leftIcon={<Calendar size={18} color={theme.colors.textMuted} />}
      />

      {/* Paid By Family Member */}
      <View style={{ marginBottom: spacing.md }}>
        <Text
          style={{
            color: theme.colors.textSecondary,
            fontSize: typography.fontSizes.sm,
            fontWeight: typography.fontWeights.medium,
            marginBottom: spacing.xs,
          }}
        >
          {t.addExpense.paidByLabel}
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: spacing.sm }}
        >
          {members.map((m) => {
            const isSelected = paidByMemberId === m.id;
            return (
              <TouchableOpacity
                key={m.id}
                activeOpacity={0.7}
                onPress={() => setPaidByMemberId(m.id)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: spacing.xs,
                  paddingHorizontal: spacing.md,
                  borderRadius: radius.md,
                  backgroundColor: isSelected ? theme.colors.brandLight : theme.colors.surface,
                  borderWidth: 1.5,
                  borderColor: isSelected ? theme.colors.brand : theme.colors.border,
                  gap: spacing.xs,
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
                    color: isSelected ? theme.colors.brand : theme.colors.textPrimary,
                    fontSize: typography.fontSizes.sm,
                    fontWeight: isSelected
                      ? typography.fontWeights.bold
                      : typography.fontWeights.medium,
                  }}
                >
                  {m.display_name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Category Selection */}
      <View style={{ marginBottom: spacing.md }}>
        <Text
          style={{
            color: theme.colors.textSecondary,
            fontSize: typography.fontSizes.sm,
            fontWeight: typography.fontWeights.medium,
            marginBottom: spacing.xs,
          }}
        >
          {t.addExpense.categoryLabel}
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
          {categories.map((c) => {
            const isSelected = categoryId === c.id;
            return (
              <TouchableOpacity
                key={c.id}
                activeOpacity={0.7}
                onPress={() => setCategoryId(c.id)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: spacing.xs,
                  paddingHorizontal: spacing.sm,
                  borderRadius: radius.md,
                  backgroundColor: isSelected ? `${c.color}25` : theme.colors.surface,
                  borderWidth: 1.5,
                  borderColor: isSelected ? c.color : theme.colors.border,
                  gap: 6,
                }}
              >
                <IconHelper name={c.icon} size={15} color={c.color} />
                <Text
                  style={{
                    color: isSelected ? c.color : theme.colors.textPrimary,
                    fontSize: typography.fontSizes.xs,
                    fontWeight: isSelected
                      ? typography.fontWeights.bold
                      : typography.fontWeights.medium,
                  }}
                >
                  {c.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Split Expense Calculator */}
      <SplitCalculator
        totalAmount={numericAmount}
        members={members}
        currency={family.currency}
        initialSplits={splits}
        onSplitsChange={setSplits}
      />

      {/* Notes */}
      <Input
        label={t.addExpense.notesLabel}
        placeholder={t.addExpense.notesPlaceholder}
        value={notes}
        onChangeText={setNotes}
        leftIcon={<FileText size={18} color={theme.colors.textMuted} />}
      />

      {/* Save Button */}
      <View style={{ marginTop: spacing.md }}>
        <Button
          title={t.addExpense.saveExpense}
          variant="primary"
          size="lg"
          icon={<Check size={20} color="#FFFFFF" />}
          onPress={handleSave}
          fullWidth
        />
      </View>
    </ScrollView>
  );
}
