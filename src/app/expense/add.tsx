import { uiLogger } from '@/services/logger';
import { useState, useRef, type ComponentRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Platform,
  type TextStyle,
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
import { TouchTargets } from '@/theme/tokens';
import { useI18n, getLocalizedCategoryName } from '@/i18n';
import { useAppStore } from '@/services/store';
import { IconHelper } from '@/components/common/IconHelper';
import { Avatar } from '@/components/common/Avatar';
import { Input } from '@/components/common/Input';
import { parseLocalizedNumber } from '@/utils/numberParser';
import type { FamilyMember } from '@/types';

const TABULAR_NUMS: TextStyle =
  Platform.OS === 'web'
    ? ({ fontVariantNumeric: 'tabular-nums' } as unknown as TextStyle)
    : { fontVariant: ['tabular-nums'] };

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

export const resolveActivePayerId = (
  paidByMemberId: string,
  currentMemberId: string,
  members: Pick<FamilyMember, 'id'>[],
): string => {
  if (paidByMemberId && members.some((m) => m.id === paidByMemberId)) {
    return paidByMemberId;
  }
  if (currentMemberId && members.some((m) => m.id === currentMemberId)) {
    return currentMemberId;
  }
  return members[0]?.id || '';
};

export default function AddExpenseScreen() {
  const router = useRouter();
  const { theme, spacing, radius, typography } = useTheme();
  const { t } = useI18n();
  const family = useAppStore((s) => s.family);
  const members = useAppStore((s) => s.members);
  const categories = useAppStore((s) => s.categories);
  const addExpense = useAppStore((s) => s.addExpense);
  const currentMemberId = useAppStore((s) => s.currentMemberId);
  const setCurrentMemberId = useAppStore((s) => s.setCurrentMemberId);

  const [amount, setAmount] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [dateMode, setDateMode] = useState<'today' | 'yesterday' | 'custom'>('today');
  const [customDate, setCustomDate] = useState(getTodayLocalIso());
  const [paidByMemberId, setPaidByMemberId] = useState<string>('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [merchant, setMerchant] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<{
    amount?: string;
    merchant?: string;
    date?: string;
    paidBy?: string;
    category?: string;
  }>({});

  const amountInputRef = useRef<ComponentRef<typeof TextInput>>(null);

  // Derived state ensures robust default fallback even if store hydration finishes after initial mount
  const activeCategoryId = selectedCategoryId || categories[0]?.id || 'cat_groceries';
  const activePaidByMemberId = resolveActivePayerId(paidByMemberId, currentMemberId, members);

  const selectedCategory = categories.find((c) => c.id === activeCategoryId) || categories[0];
  const localizedCategoryName = selectedCategory
    ? getLocalizedCategoryName(selectedCategory, t)
    : t.categories.other;

  const activeDate =
    dateMode === 'today'
      ? getTodayLocalIso()
      : dateMode === 'yesterday'
        ? getYesterdayLocalIso()
        : customDate;

  const numericAmount = parseLocalizedNumber(amount);

  const handleQuickAdd = (increment: number) => {
    const current = isNaN(numericAmount) ? 0 : numericAmount;
    const updated = (Math.round((current + increment) * 100) / 100).toFixed(2);
    setAmount(updated);
    if (errors.amount) setErrors((prev) => ({ ...prev, amount: undefined }));
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
  };

  const handleSelectCategory = (catId: string) => {
    setSelectedCategoryId(catId);
    if (errors.category) setErrors((prev) => ({ ...prev, category: undefined }));
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
  };

  const handleSelectMember = (memberId: string) => {
    setPaidByMemberId(memberId);
    setCurrentMemberId(memberId);
    if (errors.paidBy) setErrors((prev) => ({ ...prev, paidBy: undefined }));
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
    const errs: {
      amount?: string;
      merchant?: string;
      date?: string;
      paidBy?: string;
      category?: string;
    } = {};

    if (!amount || isNaN(numericAmount) || numericAmount <= 0) {
      errs.amount = t.addExpense.errorAmount;
      amountInputRef.current?.focus();
    }

    if (!activePaidByMemberId || activePaidByMemberId.trim() === '') {
      errs.paidBy = 'Please select a valid family member who paid';
    }

    if (!activeCategoryId || activeCategoryId.trim() === '') {
      errs.category = 'Please select a valid expense category';
    }

    // Default merchant to localized category name if left empty
    const finalMerchant = merchant.trim() || localizedCategoryName;

    const datePattern = /^\d{4}-\d{2}-\d{2}$/;
    if (!datePattern.test(activeDate.trim())) {
      errs.date = t.addExpense.errorDate;
    }

    if (Object.keys(errs).length > 0) {
      uiLogger.warn('Expense form validation failed', errs);
      setErrors(errs);
      return;
    }

    uiLogger.info('Submitting new expense from UI form', {
      merchant: finalMerchant,
      amount: numericAmount,
      categoryId: activeCategoryId,
      paidBy: activePaidByMemberId,
      date: activeDate.trim(),
    });

    if (activePaidByMemberId !== currentMemberId) {
      setCurrentMemberId(activePaidByMemberId);
    }

    addExpense({
      paid_by_member_id: activePaidByMemberId,
      category_id: activeCategoryId,
      transaction_date: activeDate.trim(),
      merchant_name: finalMerchant,
      amount: numericAmount,
      notes: notes.trim() || undefined,
      payment_method: 'Standard',
      is_recurring: false,
      is_verified: true,
    });

    if (Platform.OS !== 'web') {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}
    }

    router.back();
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      contentContainerStyle={{
        padding: spacing.lg,
        paddingBottom: 140,
        maxWidth: 760,
        width: '100%',
        alignSelf: 'center',
      }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {/* Native Hero Amount Input with Tactile Statement Container */}
      <View
        style={{
          backgroundColor: theme.colors.card,
          borderRadius: radius.lg,
          paddingVertical: spacing.xl,
          paddingHorizontal: spacing.lg,
          borderWidth: 1.5,
          borderColor: errors.amount ? theme.colors.danger : theme.colors.cardBorder,
          marginBottom: spacing.lg,
          alignItems: 'center',
          borderTopWidth: 3,
          borderTopColor: errors.amount ? theme.colors.danger : theme.colors.brand,
          shadowColor: theme.colors.shadow,
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.04,
          shadowRadius: 3,
          elevation: 1,
        }}
      >
        <Text
          style={{
            fontSize: typography.fontSizes.xs,
            fontWeight: typography.fontWeights.heavy,
            color: theme.colors.textSecondary,
            letterSpacing: 0.8,
            textTransform: 'uppercase',
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
            style={[
              {
                fontSize: typography.fontSizes.xxxl,
                fontWeight: typography.fontWeights.heavy,
                color: theme.colors.brand,
                marginRight: spacing.xs,
              },
              TABULAR_NUMS,
            ]}
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
            placeholder="0.00"
            placeholderTextColor={theme.colors.textMuted}
            keyboardType="decimal-pad"
            returnKeyType="done"
            autoFocus={true}
            style={[
              {
                fontSize: 48,
                fontWeight: '900',
                color: theme.colors.textPrimary,
                minWidth: 160,
                textAlign: 'center',
                paddingVertical: 0,
              },
              TABULAR_NUMS,
            ]}
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
              accessibilityRole="button"
              accessibilityLabel={`+${family.currency}${amt}`}
              style={{
                minHeight: 40,
                paddingHorizontal: spacing.md,
                paddingVertical: 8,
                borderRadius: radius.pill,
                backgroundColor: theme.isDark
                  ? theme.colors.surfaceContainerHigh
                  : theme.colors.surfaceSubtle,
                borderWidth: 1.5,
                borderColor: theme.colors.borderTactile,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text
                style={[
                  {
                    color: theme.colors.textPrimary,
                    fontSize: typography.fontSizes.sm,
                    fontWeight: typography.fontWeights.bold,
                  },
                  TABULAR_NUMS,
                ]}
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
            const isSelected = activeCategoryId === c.id;
            const catDisplayName = getLocalizedCategoryName(c, t);
            return (
              <TouchableOpacity
                key={c.id}
                activeOpacity={0.75}
                onPress={() => handleSelectCategory(c.id)}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                style={{
                  width: '48%',
                  flexGrow: 1,
                  minHeight: 64,
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: spacing.sm + 2,
                  paddingVertical: spacing.sm,
                  borderRadius: radius.md,
                  backgroundColor: isSelected ? `${c.color}20` : theme.colors.card,
                  borderWidth: 1.5,
                  borderColor: isSelected ? c.color : theme.colors.cardBorder,
                  gap: spacing.sm,
                }}
              >
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: radius.sm,
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
                      width: 22,
                      height: 22,
                      borderRadius: radius.pill,
                      backgroundColor: c.color,
                      justifyContent: 'center',
                      alignItems: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Check size={14} color="#FFFFFF" strokeWidth={3} />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
        {errors.category && (
          <Text
            style={{
              color: theme.colors.danger,
              fontSize: typography.fontSizes.sm,
              fontWeight: typography.fontWeights.bold,
              marginTop: spacing.sm,
            }}
          >
            {errors.category}
          </Text>
        )}
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
            accessibilityRole="button"
            accessibilityState={{ selected: dateMode === 'today' }}
            style={{
              flex: 1,
              minHeight: 48,
              justifyContent: 'center',
              alignItems: 'center',
              borderRadius: radius.pill,
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
            accessibilityRole="button"
            accessibilityState={{ selected: dateMode === 'yesterday' }}
            style={{
              flex: 1,
              minHeight: 48,
              justifyContent: 'center',
              alignItems: 'center',
              borderRadius: radius.pill,
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
            accessibilityRole="button"
            accessibilityState={{ selected: dateMode === 'custom' }}
            style={{
              flex: 1,
              minHeight: 48,
              justifyContent: 'center',
              alignItems: 'center',
              borderRadius: radius.pill,
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

      {/* Paying as / Paid By Family Member - 1-Tap Active Payer Selector */}
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
          {t.dashboard.payingAs}
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ width: '100%' }}
          contentContainerStyle={{ gap: spacing.sm, paddingVertical: spacing.xxs }}
        >
          {members.map((m) => {
            const isSelected = activePaidByMemberId === m.id;
            return (
              <TouchableOpacity
                key={m.id}
                activeOpacity={0.75}
                onPress={() => handleSelectMember(m.id)}
                accessibilityRole="button"
                accessibilityLabel={`${t.dashboard.payingAs} ${m.display_name}`}
                accessibilityState={{ selected: isSelected }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  minHeight: TouchTargets.sm,
                  paddingHorizontal: spacing.md,
                  borderRadius: radius.pill,
                  backgroundColor: isSelected
                    ? `${m.color_code}22`
                    : theme.isDark
                      ? theme.colors.surfaceContainerHigh
                      : theme.colors.surfaceSubtle,
                  borderWidth: 1.5,
                  borderColor: isSelected ? m.color_code : theme.colors.borderTactile,
                  gap: spacing.sm,
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
                {isSelected && (
                  <View
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: radius.pill,
                      backgroundColor: m.color_code,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Check size={11} color="#FFFFFF" strokeWidth={3} />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
        {errors.paidBy && (
          <Text
            style={{
              color: theme.colors.danger,
              fontSize: typography.fontSizes.sm,
              fontWeight: typography.fontWeights.bold,
              marginTop: spacing.sm,
            }}
          >
            {errors.paidBy}
          </Text>
        )}
      </View>

      {/* Progressive Disclosure: More Options Toggle */}
      <View style={{ marginBottom: spacing.xl }}>
        <TouchableOpacity
          activeOpacity={0.75}
          onPress={() => setShowAdvanced((prev) => !prev)}
          accessibilityRole="button"
          accessibilityLabel={showAdvanced ? t.addExpense.fewerOptions : t.addExpense.moreOptions}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingVertical: spacing.md,
            paddingHorizontal: spacing.lg,
            minHeight: 52,
            borderRadius: radius.md,
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
              borderRadius: radius.md,
              backgroundColor: theme.colors.card,
              borderWidth: 1,
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
        accessibilityRole="button"
        accessibilityLabel={t.addExpense.saveExpense}
        style={{
          minHeight: 60,
          borderRadius: radius.md,
          backgroundColor: theme.colors.brand,
          flexDirection: 'row',
          justifyContent: 'center',
          alignItems: 'center',
          gap: spacing.md,
          shadowColor: theme.colors.shadow,
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.1,
          shadowRadius: 2,
          elevation: 2,
          borderWidth: 1,
          borderColor: theme.colors.borderSubtle,
        }}
      >
        <Check size={26} color="#FFFFFF" strokeWidth={3} />
        <Text
          style={{
            color: '#FFFFFF',
            fontSize: typography.fontSizes.lg,
            fontWeight: typography.fontWeights.heavy,
          }}
        >
          {t.addExpense.saveExpense}
        </Text>
      </TouchableOpacity>

      {/* Bulk Import Button */}
      <TouchableOpacity
        activeOpacity={0.75}
        onPress={() => router.replace('/(tabs)/import')}
        accessibilityRole="button"
        accessibilityLabel={t.addExpense.bulkImportButton}
        style={{
          marginTop: spacing.md,
          minHeight: 52,
          borderRadius: radius.md,
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
        <FileJson size={18} color={theme.colors.brand} strokeWidth={2.5} />
        <Text
          style={{
            color: theme.colors.textPrimary,
            fontSize: typography.fontSizes.sm,
            fontWeight: typography.fontWeights.bold,
          }}
        >
          {t.addExpense.bulkImportButton}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
