import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import {
  Check,
  Calendar,
  Building,
  FileText,
  ChevronDown,
  ChevronUp,
  FileJson,
} from 'lucide-react-native';
import { useTheme } from '@/theme';
import { useI18n, getLocalizedCategoryName } from '@/i18n';
import { useAppStore } from '@/services/store';
import { IconHelper } from '@/components/common/IconHelper';
import { Avatar } from '@/components/common/Avatar';
import { Input } from '@/components/common/Input';
import { SplitCalculator } from '@/components/ledger/SplitCalculator';
import { ExpenseSplit } from '@/types';

// Native-safe local ISO date string helper
const getTodayLocalIso = (): string => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getYesterdayLocalIso = (): string => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function AddExpenseScreen() {
  const router = useRouter();
  const { theme, spacing, radius, typography } = useTheme();
  const { t } = useI18n();
  const { family, members, categories, addExpense, currentMemberId } = useAppStore();

  const [amount, setAmount] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(
    categories[0]?.id || 'cat_groceries',
  );
  const [dateMode, setDateMode] = useState<'today' | 'yesterday' | 'custom'>('today');
  const [customDate, setCustomDate] = useState(getTodayLocalIso());
  const [paidByMemberId, setPaidByMemberId] = useState(currentMemberId || members[0]?.id || '');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [merchant, setMerchant] = useState('');
  const [notes, setNotes] = useState('');
  const [splits, setSplits] = useState<ExpenseSplit[] | undefined>(undefined);
  const [errors, setErrors] = useState<{ amount?: string; merchant?: string; date?: string }>({});

  const amountInputRef = useRef<TextInput>(null);

  const selectedCategory = categories.find((c) => c.id === selectedCategoryId) || categories[0];
  const localizedCategoryName = selectedCategory ? getLocalizedCategoryName(selectedCategory, t) : t.categories.other;

  const activeDate =
    dateMode === 'today'
      ? getTodayLocalIso()
      : dateMode === 'yesterday'
        ? getYesterdayLocalIso()
        : customDate;

  const numericAmount = parseFloat(amount.replace(',', '.'));

  const handleSelectCategory = (catId: string) => {
    setSelectedCategoryId(catId);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // safe fallback on unsupported web
    }
  };

  const handleDateModeChange = (mode: 'today' | 'yesterday' | 'custom') => {
    setDateMode(mode);
    if (mode === 'today') {
      setCustomDate(getTodayLocalIso());
    } else if (mode === 'yesterday') {
      setCustomDate(getYesterdayLocalIso());
    }
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // safe fallback
    }
  };

  const handleSave = () => {
    const errs: { amount?: string; merchant?: string; date?: string } = {};

    if (!amount || isNaN(numericAmount) || numericAmount <= 0) {
      errs.amount = t.addExpense.errorAmount;
      amountInputRef.current?.focus();
    }

    // Default merchant to localized category name if left empty
    const finalMerchant = merchant.trim() || localizedCategoryName;

    const datePattern = /^\d{4}-\d{2}-\d{2}$/;
    if (!datePattern.test(activeDate.trim())) {
      errs.date = t.addExpense.errorDate;
    }

    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    addExpense({
      paid_by_member_id: paidByMemberId,
      category_id: selectedCategoryId,
      transaction_date: activeDate.trim(),
      merchant_name: finalMerchant,
      amount: numericAmount,
      notes: notes.trim() || undefined,
      payment_method: 'Standard',
      is_recurring: false,
      is_verified: true,
      splits: splits && splits.length > 0 ? splits : undefined,
    });

    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      // safe fallback
    }

    router.back();
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120 }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {/* Native Hero Amount Input */}
      <View
        style={{
          backgroundColor: theme.colors.card,
          borderRadius: radius.xl,
          paddingVertical: spacing.xl,
          paddingHorizontal: spacing.lg,
          borderWidth: 2,
          borderColor: errors.amount ? theme.colors.danger : theme.colors.border,
          marginBottom: spacing.xl,
          alignItems: 'center',
          shadowColor: theme.colors.shadow,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.08,
          shadowRadius: 12,
          elevation: 3,
        }}
      >
        <Text
          style={{
            fontSize: typography.fontSizes.sm,
            fontWeight: typography.fontWeights.semibold,
            color: theme.colors.textSecondary,
            textTransform: 'uppercase',
            letterSpacing: 1,
            marginBottom: spacing.xs,
          }}
        >
          {t.addExpense.amountLabel}
        </Text>

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
          }}
        >
          <Text
            style={{
              fontSize: typography.fontSizes.xxxl,
              fontWeight: typography.fontWeights.heavy,
              color: theme.colors.brand,
              marginRight: spacing.xs,
            }}
          >
            {family.currency}
          </Text>
          <TextInput
            ref={amountInputRef}
            value={amount}
            onChangeText={(val) => {
              setAmount(val);
              if (errors.amount) setErrors((prev) => ({ ...prev, amount: undefined }));
            }}
            placeholder="0,00"
            placeholderTextColor={theme.colors.textMuted}
            keyboardType="decimal-pad"
            returnKeyType="done"
            autoFocus={true}
            style={{
              fontSize: 52,
              fontWeight: '900',
              color: theme.colors.textPrimary,
              minWidth: 160,
              textAlign: 'center',
              paddingVertical: 0,
            }}
            selectTextOnFocus
          />
        </View>

        {errors.amount && (
          <Text
            style={{
              color: theme.colors.danger,
              fontSize: typography.fontSizes.sm,
              fontWeight: typography.fontWeights.semibold,
              marginTop: spacing.xs,
            }}
          >
            {errors.amount}
          </Text>
        )}
      </View>

      {/* Large Senior-Friendly Category Tiles */}
      <View style={{ marginBottom: spacing.xl }}>
        <Text
          style={{
            color: theme.colors.textPrimary,
            fontSize: typography.fontSizes.lg,
            fontWeight: typography.fontWeights.bold,
            marginBottom: spacing.md,
          }}
        >
          {t.addExpense.categoryLabel}
        </Text>

        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: spacing.sm,
          }}
        >
          {categories.map((c) => {
            const isSelected = selectedCategoryId === c.id;
            const catDisplayName = getLocalizedCategoryName(c, t);
            return (
              <TouchableOpacity
                key={c.id}
                activeOpacity={0.7}
                onPress={() => handleSelectCategory(c.id)}
                style={{
                  width: '48%',
                  flexGrow: 1,
                  minHeight: 72,
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.md,
                  borderRadius: radius.lg,
                  backgroundColor: isSelected ? `${c.color}22` : theme.colors.card,
                  borderWidth: isSelected ? 3 : 1.5,
                  borderColor: isSelected ? c.color : theme.colors.border,
                  gap: spacing.md,
                }}
              >
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: radius.md,
                    backgroundColor: `${c.color}25`,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <IconHelper name={c.icon} size={24} color={c.color} />
                </View>

                <View style={{ flex: 1 }}>
                  <Text
                    numberOfLines={1}
                    style={{
                      color: isSelected ? c.color : theme.colors.textPrimary,
                      fontSize: typography.fontSizes.md,
                      fontWeight: isSelected
                        ? typography.fontWeights.heavy
                        : typography.fontWeights.semibold,
                    }}
                  >
                    {catDisplayName}
                  </Text>
                </View>

                {isSelected && (
                  <View
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: radius.full,
                      backgroundColor: c.color,
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    <Check size={16} color="#FFFFFF" strokeWidth={3} />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Date Quick Pills */}
      <View style={{ marginBottom: spacing.xl }}>
        <Text
          style={{
            color: theme.colors.textPrimary,
            fontSize: typography.fontSizes.lg,
            fontWeight: typography.fontWeights.bold,
            marginBottom: spacing.md,
          }}
        >
          {t.addExpense.dateLabel}
        </Text>

        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => handleDateModeChange('today')}
            style={{
              flex: 1,
              minHeight: 52,
              justifyContent: 'center',
              alignItems: 'center',
              borderRadius: radius.lg,
              backgroundColor: dateMode === 'today' ? theme.colors.brand : theme.colors.card,
              borderWidth: 1.5,
              borderColor: dateMode === 'today' ? theme.colors.brand : theme.colors.border,
            }}
          >
            <Text
              style={{
                color: dateMode === 'today' ? '#FFFFFF' : theme.colors.textPrimary,
                fontSize: typography.fontSizes.md,
                fontWeight: typography.fontWeights.bold,
              }}
            >
              {t.addExpense.today}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => handleDateModeChange('yesterday')}
            style={{
              flex: 1,
              minHeight: 52,
              justifyContent: 'center',
              alignItems: 'center',
              borderRadius: radius.lg,
              backgroundColor: dateMode === 'yesterday' ? theme.colors.brand : theme.colors.card,
              borderWidth: 1.5,
              borderColor: dateMode === 'yesterday' ? theme.colors.brand : theme.colors.border,
            }}
          >
            <Text
              style={{
                color: dateMode === 'yesterday' ? '#FFFFFF' : theme.colors.textPrimary,
                fontSize: typography.fontSizes.md,
                fontWeight: typography.fontWeights.bold,
              }}
            >
              {t.addExpense.yesterday}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => handleDateModeChange('custom')}
            style={{
              flex: 1,
              minHeight: 52,
              justifyContent: 'center',
              alignItems: 'center',
              borderRadius: radius.lg,
              backgroundColor: dateMode === 'custom' ? theme.colors.brand : theme.colors.card,
              borderWidth: 1.5,
              borderColor: dateMode === 'custom' ? theme.colors.brand : theme.colors.border,
            }}
          >
            <Text
              style={{
                color: dateMode === 'custom' ? '#FFFFFF' : theme.colors.textPrimary,
                fontSize: typography.fontSizes.md,
                fontWeight: typography.fontWeights.bold,
              }}
            >
              {t.addExpense.customDate}
            </Text>
          </TouchableOpacity>
        </View>

        {dateMode === 'custom' && (
          <View style={{ marginTop: spacing.md }}>
            <Input
              label={t.addExpense.dateLabel}
              placeholder="YYYY-MM-DD"
              value={customDate}
              onChangeText={(val) => {
                setCustomDate(val);
                if (errors.date) setErrors((prev) => ({ ...prev, date: undefined }));
              }}
              error={errors.date}
              leftIcon={<Calendar size={20} color={theme.colors.textMuted} />}
            />
          </View>
        )}
      </View>

      {/* Paid By Family Member */}
      <View style={{ marginBottom: spacing.xl }}>
        <Text
          style={{
            color: theme.colors.textPrimary,
            fontSize: typography.fontSizes.lg,
            fontWeight: typography.fontWeights.bold,
            marginBottom: spacing.md,
          }}
        >
          {t.addExpense.paidByLabel}
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: spacing.md }}
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
                  minHeight: 56,
                  paddingHorizontal: spacing.lg,
                  borderRadius: radius.xl,
                  backgroundColor: isSelected ? theme.colors.brandLight : theme.colors.card,
                  borderWidth: isSelected ? 2.5 : 1.5,
                  borderColor: isSelected ? theme.colors.brand : theme.colors.border,
                  gap: spacing.md,
                }}
              >
                <Avatar
                  name={m.display_name}
                  avatarUrl={m.avatar_url}
                  colorCode={m.color_code}
                  size="md"
                />
                <Text
                  style={{
                    color: isSelected ? theme.colors.brand : theme.colors.textPrimary,
                    fontSize: typography.fontSizes.md,
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
        </ScrollView>
      </View>

      {/* Progressive Disclosure: More Options Toggle */}
      <View style={{ marginBottom: spacing.xl }}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => setShowAdvanced((prev) => !prev)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingVertical: spacing.md,
            paddingHorizontal: spacing.lg,
            borderRadius: radius.lg,
            backgroundColor: theme.colors.surfaceSubtle,
            borderWidth: 1,
            borderColor: theme.colors.borderSubtle,
          }}
        >
          <Text
            style={{
              color: theme.colors.textSecondary,
              fontSize: typography.fontSizes.md,
              fontWeight: typography.fontWeights.semibold,
            }}
          >
            {showAdvanced ? t.addExpense.fewerOptions : t.addExpense.moreOptions}
          </Text>
          {showAdvanced ? (
            <ChevronUp size={22} color={theme.colors.textSecondary} />
          ) : (
            <ChevronDown size={22} color={theme.colors.textSecondary} />
          )}
        </TouchableOpacity>

        {showAdvanced && (
          <View
            style={{
              marginTop: spacing.md,
              padding: spacing.md,
              borderRadius: radius.lg,
              backgroundColor: theme.colors.card,
              borderWidth: 1,
              borderColor: theme.colors.border,
              gap: spacing.md,
            }}
          >
            {/* Merchant / Description */}
            <Input
              label={t.addExpense.merchantLabel}
              placeholder={localizedCategoryName || t.addExpense.merchantPlaceholder}
              value={merchant}
              onChangeText={(val) => {
                setMerchant(val);
                if (errors.merchant) setErrors((prev) => ({ ...prev, merchant: undefined }));
              }}
              error={errors.merchant}
              leftIcon={<Building size={18} color={theme.colors.textMuted} />}
            />

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
          </View>
        )}
      </View>

      {/* Senior-Accessible Giant Save Button */}
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={handleSave}
        style={{
          minHeight: 64,
          borderRadius: radius.xl,
          backgroundColor: theme.colors.brand,
          flexDirection: 'row',
          justifyContent: 'center',
          alignItems: 'center',
          gap: spacing.md,
          shadowColor: theme.colors.brand,
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.28,
          shadowRadius: 14,
          elevation: 6,
        }}
      >
        <Check size={28} color="#FFFFFF" strokeWidth={3} />
        <Text
          style={{
            color: '#FFFFFF',
            fontSize: typography.fontSizes.xl,
            fontWeight: typography.fontWeights.heavy,
          }}
        >
          {t.addExpense.saveExpense}
        </Text>
      </TouchableOpacity>

      {/* Bulk Import with JSON Schema Button */}
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => router.push('/(tabs)/import')}
        style={{
          marginTop: spacing.md,
          minHeight: 56,
          borderRadius: radius.xl,
          backgroundColor: theme.colors.surfaceSubtle,
          borderWidth: 1.5,
          borderColor: theme.colors.border,
          flexDirection: 'row',
          justifyContent: 'center',
          alignItems: 'center',
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
          {t.addExpense.bulkImportButton}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
