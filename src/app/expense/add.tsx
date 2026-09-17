import { useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView } from 'react-native';
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

const QUICK_AMOUNTS = [5, 10, 20, 50];

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
  const localizedCategoryName = selectedCategory
    ? getLocalizedCategoryName(selectedCategory, t)
    : t.categories.other;

  const activeDate =
    dateMode === 'today'
      ? getTodayLocalIso()
      : dateMode === 'yesterday'
        ? getYesterdayLocalIso()
        : customDate;

  const numericAmount = parseFloat(amount.replace(',', '.'));

  const handleQuickAdd = (increment: number) => {
    const current = isNaN(numericAmount) ? 0 : numericAmount;
    const updated = (current + increment).toFixed(2);
    setAmount(updated);
    if (errors.amount) setErrors((prev) => ({ ...prev, amount: undefined }));
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
  };

  const handleSelectCategory = (catId: string) => {
    setSelectedCategoryId(catId);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
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
    } catch {}
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
    } catch {}

    router.back();
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      contentContainerStyle={{ padding: spacing.lg, paddingBottom: 140 }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {/* Native Hero Amount Input with Tactile Glass Container */}
      <View
        style={{
          backgroundColor: theme.colors.card,
          borderRadius: radius.xxl,
          paddingVertical: spacing.xl,
          paddingHorizontal: spacing.lg,
          borderWidth: 1.5,
          borderColor: errors.amount ? theme.colors.danger : theme.colors.cardBorder,
          marginBottom: spacing.lg,
          alignItems: 'center',
          shadowColor: theme.colors.shadow,
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.12,
          shadowRadius: 16,
          elevation: 4,
        }}
      >
        <Text
          style={{
            fontSize: typography.fontSizes.sm,
            fontWeight: typography.fontWeights.bold,
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
              fontSize: 48,
              fontWeight: '900',
              color: theme.colors.textPrimary,
              minWidth: 160,
              textAlign: 'center',
              paddingVertical: 0,
            }}
            selectTextOnFocus
          />
        </View>

        {/* Quick Amount Increment Chips */}
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            justifyContent: 'center',
            gap: spacing.sm,
            marginTop: spacing.md,
          }}
        >
          {QUICK_AMOUNTS.map((amt) => (
            <TouchableOpacity
              key={amt}
              activeOpacity={0.75}
              onPress={() => handleQuickAdd(amt)}
              style={{
                paddingHorizontal: spacing.md,
                paddingVertical: 6,
                borderRadius: radius.full,
                backgroundColor: theme.isDark
                  ? theme.colors.surfaceContainerHigh
                  : theme.colors.surfaceSubtle,
                borderWidth: 1,
                borderColor: theme.colors.borderTactile,
              }}
            >
              <Text
                style={{
                  color: theme.colors.textPrimary,
                  fontSize: typography.fontSizes.sm,
                  fontWeight: typography.fontWeights.bold,
                }}
              >
                +{family.currency}
                {amt}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {errors.amount && (
          <Text
            style={{
              color: theme.colors.danger,
              fontSize: typography.fontSizes.sm,
              fontWeight: typography.fontWeights.bold,
              marginTop: spacing.sm,
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
            letterSpacing: 0.2,
          }}
        >
          {t.addExpense.categoryLabel}
        </Text>

        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: spacing.xs + 2,
          }}
        >
          {categories.map((c) => {
            const isSelected = selectedCategoryId === c.id;
            const catDisplayName = getLocalizedCategoryName(c, t);
            return (
              <TouchableOpacity
                key={c.id}
                activeOpacity={0.75}
                onPress={() => handleSelectCategory(c.id)}
                style={{
                  width: '48%',
                  flexGrow: 1,
                  minHeight: 64,
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: spacing.sm + 2,
                  paddingVertical: spacing.sm,
                  borderRadius: radius.xl,
                  backgroundColor: isSelected ? `${c.color}20` : theme.colors.card,
                  borderWidth: isSelected ? 2.5 : 1.5,
                  borderColor: isSelected ? c.color : theme.colors.cardBorder,
                  gap: spacing.sm,
                }}
              >
                <View
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: radius.lg,
                    backgroundColor: `${c.color}25`,
                    justifyContent: 'center',
                    alignItems: 'center',
                    flexShrink: 0,
                  }}
                >
                  <IconHelper name={c.icon} size={20} color={c.color} />
                </View>

                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text
                    numberOfLines={2}
                    style={{
                      color: isSelected ? c.color : theme.colors.textPrimary,
                      fontSize: 13,
                      lineHeight: 16,
                      fontWeight: isSelected
                        ? typography.fontWeights.heavy
                        : typography.fontWeights.bold,
                    }}
                  >
                    {catDisplayName}
                  </Text>
                </View>

                {isSelected && (
                  <View
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: radius.full,
                      backgroundColor: c.color,
                      justifyContent: 'center',
                      alignItems: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Check size={13} color="#FFFFFF" strokeWidth={3} />
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
            letterSpacing: 0.2,
          }}
        >
          {t.addExpense.dateLabel}
        </Text>

        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => handleDateModeChange('today')}
            style={{
              flex: 1,
              minHeight: 52,
              justifyContent: 'center',
              alignItems: 'center',
              borderRadius: radius.lg,
              backgroundColor: dateMode === 'today' ? theme.colors.brand : theme.colors.card,
              borderWidth: 1.5,
              borderColor: dateMode === 'today' ? theme.colors.brand : theme.colors.cardBorder,
            }}
          >
            <Text
              style={{
                color: dateMode === 'today' ? '#FFFFFF' : theme.colors.textPrimary,
                fontSize: typography.fontSizes.md,
                fontWeight: typography.fontWeights.bold,
              }}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.8}
            >
              {t.addExpense.today}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => handleDateModeChange('yesterday')}
            style={{
              flex: 1,
              minHeight: 52,
              justifyContent: 'center',
              alignItems: 'center',
              borderRadius: radius.lg,
              backgroundColor: dateMode === 'yesterday' ? theme.colors.brand : theme.colors.card,
              borderWidth: 1.5,
              borderColor: dateMode === 'yesterday' ? theme.colors.brand : theme.colors.cardBorder,
            }}
          >
            <Text
              style={{
                color: dateMode === 'yesterday' ? '#FFFFFF' : theme.colors.textPrimary,
                fontSize: typography.fontSizes.md,
                fontWeight: typography.fontWeights.bold,
              }}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.8}
            >
              {t.addExpense.yesterday}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => handleDateModeChange('custom')}
            style={{
              flex: 1,
              minHeight: 52,
              justifyContent: 'center',
              alignItems: 'center',
              borderRadius: radius.lg,
              backgroundColor: dateMode === 'custom' ? theme.colors.brand : theme.colors.card,
              borderWidth: 1.5,
              borderColor: dateMode === 'custom' ? theme.colors.brand : theme.colors.cardBorder,
            }}
          >
            <Text
              style={{
                color: dateMode === 'custom' ? '#FFFFFF' : theme.colors.textPrimary,
                fontSize: typography.fontSizes.md,
                fontWeight: typography.fontWeights.bold,
              }}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.8}
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
              leftIcon={<Calendar size={20} color={theme.colors.textMuted} strokeWidth={2.5} />}
            />
          </View>
        )}
      </View>

      {/* Paid By Family Member */}
      <View style={{ marginBottom: spacing.xl, width: '100%', overflow: 'hidden' }}>
        <Text
          style={{
            color: theme.colors.textPrimary,
            fontSize: typography.fontSizes.lg,
            fontWeight: typography.fontWeights.bold,
            marginBottom: spacing.md,
            letterSpacing: 0.2,
          }}
        >
          {t.addExpense.paidByLabel}
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ width: '100%' }}
          contentContainerStyle={{ gap: spacing.sm, paddingVertical: 2 }}
        >
          {members.map((m) => {
            const isSelected = paidByMemberId === m.id;
            return (
              <TouchableOpacity
                key={m.id}
                activeOpacity={0.75}
                onPress={() => setPaidByMemberId(m.id)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  minHeight: 52,
                  paddingHorizontal: spacing.md,
                  borderRadius: radius.xl,
                  backgroundColor: isSelected ? theme.colors.brandLight : theme.colors.card,
                  borderWidth: isSelected ? 2.5 : 1.5,
                  borderColor: isSelected ? theme.colors.brand : theme.colors.cardBorder,
                  gap: spacing.sm,
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
                      : typography.fontWeights.bold,
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
          activeOpacity={0.75}
          onPress={() => setShowAdvanced((prev) => !prev)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingVertical: spacing.md,
            paddingHorizontal: spacing.lg,
            minHeight: 56,
            borderRadius: radius.xl,
            backgroundColor: theme.isDark
              ? theme.colors.surfaceContainerHigh
              : theme.colors.surfaceSubtle,
            borderWidth: 1.5,
            borderColor: theme.colors.borderTactile,
          }}
        >
          <Text
            style={{
              color: theme.colors.textPrimary,
              fontSize: typography.fontSizes.md,
              fontWeight: typography.fontWeights.bold,
            }}
          >
            {showAdvanced ? t.addExpense.fewerOptions : t.addExpense.moreOptions}
          </Text>
          {showAdvanced ? (
            <ChevronUp size={22} color={theme.colors.textPrimary} strokeWidth={2.5} />
          ) : (
            <ChevronDown size={22} color={theme.colors.textPrimary} strokeWidth={2.5} />
          )}
        </TouchableOpacity>

        {showAdvanced && (
          <View
            style={{
              marginTop: spacing.md,
              padding: spacing.lg,
              borderRadius: radius.xl,
              backgroundColor: theme.colors.card,
              borderWidth: 1.5,
              borderColor: theme.colors.cardBorder,
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
              leftIcon={<Building size={18} color={theme.colors.textMuted} strokeWidth={2.5} />}
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
              leftIcon={<FileText size={18} color={theme.colors.textMuted} strokeWidth={2.5} />}
            />
          </View>
        )}
      </View>

      {/* Senior-Accessible Giant Save Button */}
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={handleSave}
        accessibilityLabel={t.addExpense.saveExpense}
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
          shadowOpacity: 0.35,
          shadowRadius: 16,
          elevation: 6,
          borderWidth: 1,
          borderColor: theme.isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.08)',
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

      {/* Bulk Import Button */}
      <TouchableOpacity
        activeOpacity={0.75}
        onPress={() => router.push('/(tabs)/import')}
        accessibilityLabel={t.addExpense.bulkImportButton}
        style={{
          marginTop: spacing.md,
          minHeight: 56,
          borderRadius: radius.xl,
          backgroundColor: theme.isDark
            ? theme.colors.surfaceContainerHigh
            : theme.colors.surfaceSubtle,
          borderWidth: 1.5,
          borderColor: theme.colors.borderTactile,
          flexDirection: 'row',
          justifyContent: 'center',
          alignItems: 'center',
          gap: spacing.sm,
        }}
      >
        <FileJson size={20} color={theme.colors.brand} strokeWidth={2.5} />
        <Text
          style={{
            color: theme.colors.textPrimary,
            fontSize: typography.fontSizes.md,
            fontWeight: typography.fontWeights.bold,
          }}
        >
          {t.addExpense.bulkImportButton}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
