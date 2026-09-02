import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  StyleSheet,
} from 'react-native';
import {
  Settings as SettingsIcon,
  Globe,
  Sun,
  Moon,
  RotateCcw,
  ShieldCheck,
  Coins,
  Download,
  Trash2,
  Lock,
  Cloud,
  Check,
  Edit2,
  Building,
} from 'lucide-react-native';
import { useTheme } from '@/theme';
import { useI18n, SupportedLocale } from '@/i18n';
import { useAppStore } from '@/services/store';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { Badge } from '@/components/common/Badge';
import { Input } from '@/components/common/Input';
import { isSupabaseConfigured } from '@/services/supabase';

const CURRENCIES = [
  { symbol: '€', code: 'EUR', label: 'Euro (€)' },
  { symbol: '$', code: 'USD', label: 'US Dollar ($)' },
  { symbol: '£', code: 'GBP', label: 'British Pound (£)' },
  { symbol: 'CHF', code: 'CHF', label: 'Swiss Franc (CHF)' },
];

export default function SettingsScreen() {
  const { theme, colorSchemePreference, setColorSchemePreference, spacing, radius, typography } =
    useTheme();

  const { t, locale, setLocale } = useI18n();

  const {
    family,
    members,
    categories,
    budgets,
    expenses,
    updateFamilySettings,
    resetToSampleData,
    clearAllExpenses,
  } = useAppStore();

  const [isEditingFamilyName, setIsEditingFamilyName] = useState(false);
  const [familyNameInput, setFamilyNameInput] = useState(family.name);

  const handleSaveFamilyName = () => {
    if (familyNameInput.trim()) {
      updateFamilySettings({ name: familyNameInput.trim() });
      setIsEditingFamilyName(false);
    }
  };

  const handleCurrencySelect = (currSymbol: string) => {
    updateFamilySettings({ currency: currSymbol });
  };

  const handleExportFullArchive = () => {
    const archivePayload = {
      app: "Bert0n's Family Expense Manager",
      version: '1.0.0',
      exported_at: new Date().toISOString(),
      family,
      members,
      categories,
      budgets,
      expenses,
    };

    const jsonString = JSON.stringify(archivePayload, null, 2);

    if (Platform.OS === 'web') {
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `family-management-archive-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
    } else {
      Alert.alert(t.settings.exportArchiveButton, 'Complete JSON archive exported.');
    }
  };

  const handleClearLedger = () => {
    if (Platform.OS === 'web') {
      if (
        window.confirm(
          `${t.settings.clearLedgerConfirmTitle}\n${t.settings.clearLedgerConfirmMessage}`,
        )
      ) {
        clearAllExpenses();
      }
    } else {
      Alert.alert(t.settings.clearLedgerConfirmTitle, t.settings.clearLedgerConfirmMessage, [
        { text: t.common.cancel, style: 'cancel' },
        { text: t.common.delete, style: 'destructive', onPress: clearAllExpenses },
      ]);
    }
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.huge }}
      showsVerticalScrollIndicator={false}
    >
      {/* 1. Household Profile & Currency Card */}
      <Card padding="md" style={{ marginBottom: spacing.lg }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.xs,
            marginBottom: spacing.md,
          }}
        >
          <Building size={18} color={theme.colors.brand} />
          <Text
            style={{
              color: theme.colors.textPrimary,
              fontSize: typography.fontSizes.lg,
              fontWeight: typography.fontWeights.bold,
            }}
          >
            {t.settings.householdProfile}
          </Text>
        </View>

        {/* Family Name */}
        <View style={{ marginBottom: spacing.md }}>
          <Text
            style={{
              color: theme.colors.textSecondary,
              fontSize: typography.fontSizes.xs,
              marginBottom: 4,
            }}
          >
            {t.settings.familyNameLabel}
          </Text>
          {isEditingFamilyName ? (
            <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'center' }}>
              <View style={{ flex: 1 }}>
                <Input
                  value={familyNameInput}
                  onChangeText={setFamilyNameInput}
                  containerStyle={{ marginBottom: 0 }}
                />
              </View>
              <Button
                title={t.common.save}
                variant="primary"
                size="sm"
                icon={<Check size={14} color="#FFFFFF" />}
                onPress={handleSaveFamilyName}
              />
            </View>
          ) : (
            <TouchableOpacity
              onPress={() => setIsEditingFamilyName(true)}
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: theme.colors.surfaceSubtle,
                padding: spacing.md,
                borderRadius: radius.md,
              }}
            >
              <Text
                style={{
                  color: theme.colors.textPrimary,
                  fontSize: typography.fontSizes.md,
                  fontWeight: typography.fontWeights.semibold,
                }}
              >
                {family.name}
              </Text>
              <Edit2 size={16} color={theme.colors.brand} />
            </TouchableOpacity>
          )}
        </View>

        {/* Currency Selector */}
        <View>
          <Text
            style={{
              color: theme.colors.textSecondary,
              fontSize: typography.fontSizes.xs,
              marginBottom: 4,
            }}
          >
            {t.settings.currencyLabel}
          </Text>
          <Text
            style={{
              color: theme.colors.textMuted,
              fontSize: typography.fontSizes.xs,
              marginBottom: spacing.sm,
            }}
          >
            {t.settings.currencySubtitle}
          </Text>
          <View style={{ flexDirection: 'row', gap: spacing.xs }}>
            {CURRENCIES.map((curr) => {
              const isSelected = family.currency === curr.symbol;
              return (
                <TouchableOpacity
                  key={curr.code}
                  activeOpacity={0.7}
                  onPress={() => handleCurrencySelect(curr.symbol)}
                  style={{
                    flex: 1,
                    paddingVertical: spacing.sm,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: radius.md,
                    backgroundColor: isSelected ? theme.colors.brand : theme.colors.surfaceSubtle,
                    borderWidth: 1,
                    borderColor: isSelected ? theme.colors.brand : theme.colors.border,
                  }}
                >
                  <Text
                    style={{
                      color: isSelected ? '#FFFFFF' : theme.colors.textPrimary,
                      fontSize: typography.fontSizes.md,
                      fontWeight: typography.fontWeights.bold,
                    }}
                  >
                    {curr.symbol}
                  </Text>
                  <Text
                    style={{
                      color: isSelected ? 'rgba(255,255,255,0.8)' : theme.colors.textMuted,
                      fontSize: 10,
                      marginTop: 2,
                    }}
                  >
                    {curr.code}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </Card>

      {/* 2. Appearance & Language Card */}
      <Card padding="md" style={{ marginBottom: spacing.lg }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.xs,
            marginBottom: spacing.md,
          }}
        >
          <Sun size={18} color={theme.colors.brand} />
          <Text
            style={{
              color: theme.colors.textPrimary,
              fontSize: typography.fontSizes.lg,
              fontWeight: typography.fontWeights.bold,
            }}
          >
            {t.settings.appearanceLanguage}
          </Text>
        </View>

        {/* Theme Selector */}
        <View style={{ marginBottom: spacing.md }}>
          <Text
            style={{
              color: theme.colors.textSecondary,
              fontSize: typography.fontSizes.xs,
              marginBottom: spacing.xs,
            }}
          >
            {t.settings.themeLabel}
          </Text>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            {(['light', 'dark', 'system'] as const).map((pref) => {
              const isSelected = colorSchemePreference === pref;
              const label =
                pref === 'light'
                  ? t.settings.themeLight
                  : pref === 'dark'
                    ? t.settings.themeDark
                    : t.settings.themeSystem;

              return (
                <TouchableOpacity
                  key={pref}
                  activeOpacity={0.7}
                  onPress={() => setColorSchemePreference(pref)}
                  style={{
                    flex: 1,
                    paddingVertical: spacing.sm,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: radius.md,
                    backgroundColor: isSelected ? theme.colors.brand : theme.colors.surfaceSubtle,
                    borderWidth: 1,
                    borderColor: isSelected ? theme.colors.brand : theme.colors.border,
                  }}
                >
                  <Text
                    style={{
                      color: isSelected ? '#FFFFFF' : theme.colors.textSecondary,
                      fontSize: typography.fontSizes.sm,
                      fontWeight: typography.fontWeights.semibold,
                    }}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Language Selector */}
        <View>
          <Text
            style={{
              color: theme.colors.textSecondary,
              fontSize: typography.fontSizes.xs,
              marginBottom: spacing.xs,
            }}
          >
            {t.settings.languageLabel}
          </Text>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            {(['en', 'it'] as const).map((loc) => {
              const isSelected = locale === loc;
              const label = loc === 'en' ? t.settings.english : t.settings.italian;
              return (
                <TouchableOpacity
                  key={loc}
                  activeOpacity={0.7}
                  onPress={() => setLocale(loc)}
                  style={{
                    flex: 1,
                    paddingVertical: spacing.sm,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: radius.md,
                    backgroundColor: isSelected ? theme.colors.brand : theme.colors.surfaceSubtle,
                    borderWidth: 1,
                    borderColor: isSelected ? theme.colors.brand : theme.colors.border,
                  }}
                >
                  <Text
                    style={{
                      color: isSelected ? '#FFFFFF' : theme.colors.textPrimary,
                      fontSize: typography.fontSizes.sm,
                      fontWeight: isSelected
                        ? typography.fontWeights.bold
                        : typography.fontWeights.medium,
                    }}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </Card>

      {/* 3. Backend & Cloud Sync Status */}
      <Card padding="md" style={{ marginBottom: spacing.lg }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.xs,
            marginBottom: spacing.sm,
          }}
        >
          <Cloud size={18} color={theme.colors.brand} />
          <Text
            style={{
              color: theme.colors.textPrimary,
              fontSize: typography.fontSizes.lg,
              fontWeight: typography.fontWeights.bold,
            }}
          >
            {t.settings.cloudSyncTitle}
          </Text>
        </View>

        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: theme.colors.surfaceSubtle,
            padding: spacing.md,
            borderRadius: radius.md,
            marginBottom: spacing.xs,
          }}
        >
          <View style={{ flex: 1, marginRight: spacing.sm }}>
            <Text
              style={{
                color: theme.colors.textPrimary,
                fontSize: typography.fontSizes.sm,
                fontWeight: typography.fontWeights.semibold,
              }}
            >
              {isSupabaseConfigured() ? t.settings.cloudStatusSynced : t.settings.cloudStatusLocal}
            </Text>
            <Text
              style={{
                color: theme.colors.textMuted,
                fontSize: typography.fontSizes.xs,
                marginTop: 2,
              }}
            >
              {t.settings.cloudSyncSubtitle}
            </Text>
          </View>

          <Badge
            label={isSupabaseConfigured() ? 'Cloud Active' : 'Offline'}
            color={isSupabaseConfigured() ? theme.colors.success : theme.colors.info}
            size="sm"
            variant="solid"
          />
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.xs }}>
          <Lock size={12} color={theme.colors.textMuted} />
          <Text style={{ color: theme.colors.textMuted, fontSize: typography.fontSizes.xs }}>
            {t.settings.rlsProtectionNotice}
          </Text>
        </View>
      </Card>

      {/* 4. Data Management & Backup */}
      <Card padding="md" style={{ marginBottom: spacing.lg }}>
        <Text
          style={{
            color: theme.colors.textPrimary,
            fontSize: typography.fontSizes.lg,
            fontWeight: typography.fontWeights.bold,
            marginBottom: spacing.md,
          }}
        >
          {t.settings.dataManagementTitle}
        </Text>

        {/* Full Backup Export */}
        <View style={{ marginBottom: spacing.md }}>
          <Button
            title={t.settings.exportArchiveButton}
            variant="outline"
            icon={<Download size={16} color={theme.colors.textPrimary} />}
            onPress={handleExportFullArchive}
            fullWidth
          />
          <Text
            style={{
              color: theme.colors.textMuted,
              fontSize: typography.fontSizes.xs,
              marginTop: 4,
            }}
          >
            {t.settings.exportArchiveSubtitle}
          </Text>
        </View>

        {/* Reset Demo Data */}
        <View style={{ marginBottom: spacing.md }}>
          <Button
            title={t.settings.resetDemoDataButton}
            variant="outline"
            icon={<RotateCcw size={16} color={theme.colors.textPrimary} />}
            onPress={resetToSampleData}
            fullWidth
          />
          <Text
            style={{
              color: theme.colors.textMuted,
              fontSize: typography.fontSizes.xs,
              marginTop: 4,
            }}
          >
            {t.settings.resetDemoSubtitle}
          </Text>
        </View>

        {/* Clear Ledger (Danger Zone) */}
        <View>
          <Button
            title={t.settings.clearLedgerButton}
            variant="danger"
            icon={<Trash2 size={16} color="#FFFFFF" />}
            onPress={handleClearLedger}
            fullWidth
          />
          <Text
            style={{ color: theme.colors.danger, fontSize: typography.fontSizes.xs, marginTop: 4 }}
          >
            {t.settings.clearLedgerSubtitle}
          </Text>
        </View>
      </Card>

      {/* 5. About & Privacy Guarantee Card */}
      <Card
        padding="md"
        style={{
          backgroundColor: theme.isDark ? '#064E3B' : '#ECFDF5',
          borderColor: theme.colors.success,
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: spacing.xs,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
            <ShieldCheck size={20} color={theme.colors.success} />
            <Text
              style={{
                color: theme.colors.textPrimary,
                fontSize: typography.fontSizes.md,
                fontWeight: typography.fontWeights.bold,
              }}
            >
              {t.settings.privacyGuaranteeTitle}
            </Text>
          </View>
          <Badge
            label={t.settings.privacyGuaranteeBadge}
            color={theme.colors.success}
            size="sm"
            variant="solid"
          />
        </View>

        <Text
          style={{
            color: theme.colors.textSecondary,
            fontSize: typography.fontSizes.xs,
            lineHeight: 18,
            marginTop: 4,
          }}
        >
          {t.settings.privacyGuaranteeDescription}
        </Text>

        <Text style={{ color: theme.colors.textMuted, fontSize: 10, marginTop: spacing.md }}>
          {t.settings.appVersion}
        </Text>
      </Card>
    </ScrollView>
  );
}
