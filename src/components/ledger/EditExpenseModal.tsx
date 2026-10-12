import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Pencil } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { useI18n, getLocalizedCategoryName, getLocalizedPaymentMethod } from '@/i18n';
import { Expense, Category, FamilyMember } from '@/types';
import { Input } from '@/components/common/Input';
import { FormModal } from '@/components/common/FormModal';
import { Avatar } from '@/components/common/Avatar';
import { IconHelper } from '@/components/common/IconHelper';
import { parseLocalizedNumber } from '@/utils/numberParser';

interface EditExpenseModalProps {
  visible: boolean;
  expense: Expense | null;
  categories: Category[];
  members: FamilyMember[];
  currency?: string;
  onClose: () => void;
  onSave: (id: string, updates: Partial<Expense>) => void;
}

const PAYMENT_METHODS = ['Credit Card', 'Debit Card', 'Bank Transfer', 'Cash', 'Other'];

const EditExpenseContent: React.FC<{
  expense: Expense;
  categories: Category[];
  members: FamilyMember[];
  currency: string;
  onClose: () => void;
  onSave: (id: string, updates: Partial<Expense>) => void;
}> = ({ expense, categories, members, currency, onClose, onSave }) => {
  const { theme, spacing, radius, typography } = useTheme();
  const { t } = useI18n();

  const [amount, setAmount] = useState(expense.amount.toFixed(2));
  const [merchant, setMerchant] = useState(expense.merchant_name);
  const [categoryId, setCategoryId] = useState(expense.category_id);
  const [paidByMemberId, setPaidByMemberId] = useState(expense.paid_by_member_id);
  const [transactionDate, setTransactionDate] = useState(expense.transaction_date);
  const [paymentMethod, setPaymentMethod] = useState(expense.payment_method || 'Credit Card');
  const [notes, setNotes] = useState(expense.notes || '');

  const [errors, setErrors] = useState<{
    amount?: string;
    merchant?: string;
    date?: string;
  }>({});

  const handleSave = () => {
    const parsedAmount = parseLocalizedNumber(amount);
    const newErrors: { amount?: string; merchant?: string; date?: string } = {};

    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      newErrors.amount = t.addExpense.errorAmount;
    }
    if (!merchant.trim()) {
      newErrors.merchant = t.addExpense.errorMerchant;
    }
    const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!isoDateRegex.test(transactionDate) || isNaN(Date.parse(transactionDate))) {
      newErrors.date = t.addExpense.errorDate;
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    onSave(expense.id, {
      amount: parsedAmount,
      merchant_name: merchant.trim(),
      category_id: categoryId,
      paid_by_member_id: paidByMemberId,
      transaction_date: transactionDate,
      payment_method: paymentMethod,
      notes: notes.trim() || undefined,
    });
    onClose();
  };

  return (
    <FormModal
      visible={true}
      title={t.expenseDetail.editExpenseTitle}
      icon={<Pencil size={20} color={theme.colors.brand} />}
      onClose={onClose}
      onSubmit={handleSave}
      submitTitle={t.common.save}
      cancelTitle={t.common.cancel}
    >
      {/* Amount input */}
      <Input
        label={`${t.addExpense.amountLabel} (${currency})`}
        placeholder="0.00"
        value={amount}
        onChangeText={(text) => {
          setAmount(text);
          if (errors.amount) setErrors((prev) => ({ ...prev, amount: undefined }));
        }}
        keyboardType="decimal-pad"
        error={errors.amount}
      />

      {/* Merchant input */}
      <Input
        label={t.addExpense.merchantLabel}
        placeholder={t.addExpense.merchantPlaceholder}
        value={merchant}
        onChangeText={(text) => {
          setMerchant(text);
          if (errors.merchant) setErrors((prev) => ({ ...prev, merchant: undefined }));
        }}
        error={errors.merchant}
      />

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
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: spacing.xs, paddingVertical: 2 }}
        >
          {categories.map((cat) => {
            const isSelected = categoryId === cat.id;
            return (
              <TouchableOpacity
                key={cat.id}
                onPress={() => setCategoryId(cat.id)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  paddingHorizontal: spacing.sm,
                  paddingVertical: 8,
                  borderRadius: radius.full,
                  backgroundColor: isSelected
                    ? theme.colors.brandLight
                    : theme.colors.surfaceSubtle,
                  borderWidth: 1.5,
                  borderColor: isSelected ? theme.colors.brand : theme.colors.border,
                }}
              >
                <IconHelper name={cat.icon} size={16} color={cat.color} />
                <Text
                  style={{
                    color: isSelected ? theme.colors.brand : theme.colors.textPrimary,
                    fontSize: typography.fontSizes.xs,
                    fontWeight: isSelected
                      ? typography.fontWeights.bold
                      : typography.fontWeights.medium,
                  }}
                >
                  {getLocalizedCategoryName(cat, t)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Paid By Member Selection */}
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
          contentContainerStyle={{ gap: spacing.xs, paddingVertical: 2 }}
        >
          {members.map((mem) => {
            const isSelected = paidByMemberId === mem.id;
            return (
              <TouchableOpacity
                key={mem.id}
                onPress={() => setPaidByMemberId(mem.id)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                  paddingHorizontal: spacing.sm,
                  paddingVertical: 6,
                  borderRadius: radius.full,
                  backgroundColor: isSelected
                    ? theme.colors.brandLight
                    : theme.colors.surfaceSubtle,
                  borderWidth: 1.5,
                  borderColor: isSelected ? theme.colors.brand : theme.colors.border,
                }}
              >
                <Avatar
                  name={mem.display_name}
                  avatarUrl={mem.avatar_url}
                  colorCode={mem.color_code}
                  size="sm"
                />
                <Text
                  style={{
                    color: isSelected ? theme.colors.brand : theme.colors.textPrimary,
                    fontSize: typography.fontSizes.xs,
                    fontWeight: isSelected
                      ? typography.fontWeights.bold
                      : typography.fontWeights.medium,
                  }}
                >
                  {mem.display_name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Date Input */}
      <Input
        label={t.addExpense.dateLabel}
        placeholder="YYYY-MM-DD"
        value={transactionDate}
        onChangeText={(text) => {
          setTransactionDate(text);
          if (errors.date) setErrors((prev) => ({ ...prev, date: undefined }));
        }}
        error={errors.date}
      />

      {/* Payment Method Selection */}
      <View style={{ marginBottom: spacing.md }}>
        <Text
          style={{
            color: theme.colors.textSecondary,
            fontSize: typography.fontSizes.sm,
            fontWeight: typography.fontWeights.medium,
            marginBottom: spacing.xs,
          }}
        >
          {t.expenseDetail.paymentMethod}
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: spacing.xs, paddingVertical: 2 }}
        >
          {PAYMENT_METHODS.map((method) => {
            const isSelected = paymentMethod.toLowerCase() === method.toLowerCase();
            return (
              <TouchableOpacity
                key={method}
                onPress={() => setPaymentMethod(method)}
                style={{
                  paddingHorizontal: spacing.sm,
                  paddingVertical: 6,
                  borderRadius: radius.md,
                  backgroundColor: isSelected ? theme.colors.brand : theme.colors.surfaceSubtle,
                  borderWidth: 1,
                  borderColor: isSelected ? theme.colors.brand : theme.colors.border,
                }}
              >
                <Text
                  style={{
                    color: isSelected ? '#FFFFFF' : theme.colors.textPrimary,
                    fontSize: typography.fontSizes.xs,
                    fontWeight: typography.fontWeights.medium,
                  }}
                >
                  {getLocalizedPaymentMethod(method, t)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Notes */}
      <Input
        label={t.addExpense.notesLabel}
        placeholder={t.addExpense.notesPlaceholder}
        value={notes}
        onChangeText={setNotes}
        multiline
        numberOfLines={2}
      />
    </FormModal>
  );
};

export const EditExpenseModal: React.FC<EditExpenseModalProps> = ({
  visible,
  expense,
  categories,
  members,
  currency = '€',
  onClose,
  onSave,
}) => {
  if (!visible || !expense) return null;

  return (
    <EditExpenseContent
      key={expense.id}
      expense={expense}
      categories={categories}
      members={members}
      currency={currency}
      onClose={onClose}
      onSave={onSave}
    />
  );
};
