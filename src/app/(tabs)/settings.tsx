import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Platform, Switch } from 'react-native';
import {
  Sun,
  RotateCcw,
  ShieldCheck,
  Download,
  Trash2,
  Cloud,
  Check,
  Edit2,
  Building,
  Users,
  RefreshCw,
  LogOut,
  Bell,
  FileSpreadsheet,
  Edit3,
  ArrowLeftRight,
  UserCheck,
  Shield,
} from 'lucide-react-native';
import { useTheme } from '@/theme';
import { useI18n, SupportedLocale } from '@/i18n';
import { useAppStore } from '@/services/store';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { Badge } from '@/components/common/Badge';
import { Input } from '@/components/common/Input';
import { OptionSelector } from '@/components/common/OptionSelector';
import { exportAndShareFile } from '@/services/fileExporter';
import { authService } from '@/services/authService';
import { syncEngine } from '@/services/syncEngine';
import { realtimeSync } from '@/services/realtimeSync';
import { migrationService } from '@/services/migrationService';
import { pushNotificationService } from '@/services/pushNotificationService';
import { AuthModal } from '@/components/sync/AuthModal';
import { FamilyPairingModal } from '@/components/sync/FamilyPairingModal';
import { SyncBadge } from '@/components/common/SyncBadge';

export default function SettingsScreen() {
  const { theme, colorSchemePreference, setColorSchemePreference, spacing, radius, typography } =
    useTheme();

  const { t, locale, setLocale } = useI18n();

  const {
    family,
    notificationPreferences,
    updateNotificationPreferences,
    updateFamilySettings,
    resetToSampleData,
    clearAllExpenses,
  } = useAppStore();

  const [isEditingFamilyName, setIsEditingFamilyName] = useState(false);
  const [familyNameInput, setFamilyNameInput] = useState(family.name);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showPairingModal, setShowPairingModal] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    authService.getUser().then((user) => {
      setUserEmail(user?.email || null);
      if (user && family?.id) {
        realtimeSync.startRealtimeSync(family.id);
        if (Platform.OS !== 'web' && notificationPreferences.push_enabled) {
          pushNotificationService.registerForPushNotificationsAsync(user.id);
        }
      }
    });

    const sub = authService.onAuthStateChange(async (session, user) => {
      setUserEmail(user?.email || null);
      if (user && family?.id) {
        setShowAuthModal(false);
        if (session) {
          await migrationService.migrateLocalDataToSupabase(family.id, user.id);
        }
        realtimeSync.startRealtimeSync(family.id);
        if (Platform.OS !== 'web' && notificationPreferences.push_enabled) {
          pushNotificationService.registerForPushNotificationsAsync(user.id);
        }
      } else {
        realtimeSync.stopRealtimeSync();
      }
    });

    return () => sub.unsubscribe();
  }, [family?.id, notificationPreferences.push_enabled]);

  const handleManualSync = async () => {
    await syncEngine.flushOutbox();
    if (family?.id) {
      await syncEngine.fetchDelta(family.id);
    }
  };

  const handleSignOut = async () => {
    const user = await authService.getUser();
    if (user && Platform.OS !== 'web') {
      await pushNotificationService.unregisterPushTokenAsync(user.id);
    }
    await authService.signOut();
    realtimeSync.stopRealtimeSync();
    setUserEmail(null);
  };

  const handleTogglePushMaster = async (enabled: boolean) => {
    updateNotificationPreferences({ push_enabled: enabled });
    if (enabled && Platform.OS !== 'web') {
      const user = await authService.getUser();
      if (user) {
        await pushNotificationService.registerForPushNotificationsAsync(user.id);
      }
    }
  };

  const handleSaveFamilyName = () => {
    if (familyNameInput.trim()) {
      updateFamilySettings({ name: familyNameInput.trim() });
      setIsEditingFamilyName(false);
    }
  };

  const handleExportFullArchive = async () => {
    const store = useAppStore.getState();
    const archivePayload = {
      app: "Bert0n's Family Expense Manager",
      version: '1.0.0',
      exported_at: new Date().toISOString(),
      family: store.family,
      members: store.members,
      categories: store.categories,
      expenses: store.expenses,
    };

    const jsonString = JSON.stringify(archivePayload, null, 2);
    const fileName = `family-management-archive-${new Date().toISOString().split('T')[0]}.json`;
    await exportAndShareFile(jsonString, fileName, 'application/json');
  };

  const handleClearLedger = () => {
    const message = `${t.settings.clearLedgerConfirmTitle}\n${t.settings.clearLedgerConfirmMessage}`;
    if (Platform.OS === 'web') {
      if (window.confirm(message)) {
        clearAllExpenses();
      }
    } else {
      // Mobile Alert
      import('react-native').then(({ Alert: NativeAlert }) => {
        NativeAlert.alert(
          t.settings.clearLedgerConfirmTitle,
          t.settings.clearLedgerConfirmMessage,
          [
            { text: t.common.cancel, style: 'cancel' },
            {
              text: t.common.delete,
              style: 'destructive',
              onPress: () => clearAllExpenses(),
            },
          ],
        );
      });
    }
  };

  const themeOptions = [
    { label: t.settings.themeSystem, value: 'system' as const },
    { label: t.settings.themeLight, value: 'light' as const },
    { label: t.settings.themeDark, value: 'dark' as const },
  ];

  const languageOptions = [
    { label: t.settings.english, value: 'en' as SupportedLocale },
    { label: t.settings.italian, value: 'it' as SupportedLocale },
  ];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      contentContainerStyle={{
        padding: spacing.lg,
        paddingBottom: 130,
        maxWidth: 760,
        width: '100%',
        alignSelf: 'center',
      }}
      showsVerticalScrollIndicator={false}
    >
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: spacing.lg,
          gap: spacing.sm,
        }}
      >
        <Text
          style={{
            color: theme.colors.textPrimary,
            fontSize: typography.fontSizes.xxl,
            fontWeight: typography.fontWeights.heavy,
            flexShrink: 1,
          }}
          numberOfLines={1}
        >
          {t.settings.title}
        </Text>
        <View style={{ flexShrink: 0 }}>
          <SyncBadge />
        </View>
      </View>

      {/* 1. Household Profile Card */}
      <Card padding="lg" style={{ marginBottom: spacing.lg }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.xs,
            marginBottom: spacing.md,
          }}
        >
          <Building size={20} color={theme.colors.brand} strokeWidth={2.5} />
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
              fontSize: typography.fontSizes.sm,
              fontWeight: typography.fontWeights.bold,
              marginBottom: 6,
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
                variant="primary"
                size="md"
                icon={<Check size={18} color="#FFFFFF" strokeWidth={3} />}
                onPress={handleSaveFamilyName}
                accessibilityLabel={t.common.save}
              />
            </View>
          ) : (
            <TouchableOpacity
              onPress={() => setIsEditingFamilyName(true)}
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: theme.isDark
                  ? theme.colors.surfaceContainerHigh
                  : theme.colors.surfaceSubtle,
                padding: spacing.md,
                borderRadius: radius.lg,
                borderWidth: 1.5,
                borderColor: theme.colors.borderTactile,
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
              <Edit2 size={16} color={theme.colors.brand} strokeWidth={2.5} />
            </TouchableOpacity>
          )}
        </View>

        {/* Fixed EUR Currency Info */}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: theme.isDark
              ? theme.colors.surfaceContainerHigh
              : theme.colors.surfaceSubtle,
            padding: spacing.md,
            borderRadius: radius.lg,
            borderWidth: 1.5,
            borderColor: theme.colors.borderTactile,
            marginTop: spacing.sm,
          }}
        >
          <View style={{ flex: 1, marginRight: spacing.sm }}>
            <Text
              style={{
                color: theme.colors.textPrimary,
                fontSize: typography.fontSizes.md,
                fontWeight: typography.fontWeights.bold,
              }}
            >
              {t.settings.currencyLabel}
            </Text>
          </View>
          <Badge label="EUR (€)" color={theme.colors.brand} size="md" variant="solid" />
        </View>
      </Card>

      {/* 2. Appearance & Language Card */}
      <Card padding="lg" style={{ marginBottom: spacing.lg }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.xs,
            marginBottom: spacing.md,
          }}
        >
          <Sun size={20} color={theme.colors.brand} strokeWidth={2.5} />
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
        <View style={{ marginBottom: spacing.lg }}>
          <Text
            style={{
              color: theme.colors.textSecondary,
              fontSize: typography.fontSizes.sm,
              fontWeight: typography.fontWeights.bold,
              marginBottom: 8,
            }}
          >
            {t.settings.themeLabel}
          </Text>
          <OptionSelector
            options={themeOptions}
            selectedValue={colorSchemePreference}
            onSelect={(val) => setColorSchemePreference(val as 'system' | 'light' | 'dark')}
          />
        </View>

        {/* Language Selector */}
        <View>
          <Text
            style={{
              color: theme.colors.textSecondary,
              fontSize: typography.fontSizes.sm,
              fontWeight: typography.fontWeights.bold,
              marginBottom: 8,
            }}
          >
            {t.settings.languageLabel}
          </Text>
          <OptionSelector
            options={languageOptions}
            selectedValue={locale}
            onSelect={(val) => setLocale(val as SupportedLocale)}
          />
        </View>
      </Card>

      {/* 3. Backend & Cloud Sync Card */}
      <Card padding="lg" style={{ marginBottom: spacing.lg }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.xs,
            marginBottom: spacing.md,
          }}
        >
          <Cloud size={20} color={theme.colors.brand} strokeWidth={2.5} />
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

        {userEmail ? (
          <View style={{ gap: spacing.sm }}>
            <View
              style={{
                backgroundColor: theme.isDark
                  ? theme.colors.surfaceContainerHigh
                  : theme.colors.surfaceSubtle,
                padding: spacing.md,
                borderRadius: radius.lg,
                borderWidth: 1.5,
                borderColor: theme.colors.borderTactile,
              }}
            >
              <Text
                style={{
                  color: theme.colors.textSecondary,
                  fontSize: typography.fontSizes.xs,
                  fontWeight: typography.fontWeights.semibold,
                }}
              >
                {t.sync.connectedAs}
              </Text>
              <Text
                style={{
                  color: theme.colors.textPrimary,
                  fontSize: typography.fontSizes.md,
                  fontWeight: typography.fontWeights.bold,
                  marginTop: 2,
                }}
              >
                {userEmail}
              </Text>
            </View>

            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <View style={{ flex: 1 }}>
                <Button
                  title={t.sync.syncNowButton}
                  variant="outline"
                  size="md"
                  icon={<RefreshCw size={16} color={theme.colors.textPrimary} strokeWidth={2.5} />}
                  onPress={handleManualSync}
                  fullWidth
                />
              </View>
              <View style={{ flex: 1 }}>
                <Button
                  title={t.sync.pairingButton}
                  variant="outline"
                  size="md"
                  icon={<Users size={16} color={theme.colors.textPrimary} strokeWidth={2.5} />}
                  onPress={() => setShowPairingModal(true)}
                  fullWidth
                />
              </View>
            </View>

            <Button
              title={t.sync.signOutButton}
              variant="secondary"
              size="md"
              icon={<LogOut size={16} color={theme.colors.textMuted} strokeWidth={2.5} />}
              onPress={handleSignOut}
              fullWidth
            />
          </View>
        ) : (
          <View style={{ gap: spacing.sm }}>
            <View
              style={{
                backgroundColor: theme.isDark
                  ? theme.colors.surfaceContainerHigh
                  : theme.colors.surfaceSubtle,
                padding: spacing.md,
                borderRadius: radius.lg,
                borderWidth: 1.5,
                borderColor: theme.colors.borderTactile,
              }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <Text
                  style={{
                    color: theme.colors.textPrimary,
                    fontSize: typography.fontSizes.md,
                    fontWeight: typography.fontWeights.bold,
                  }}
                >
                  {t.settings.cloudStatusLocal}
                </Text>
                <Badge
                  label={t.settings.localFirstBadge}
                  color={theme.colors.success}
                  size="sm"
                  variant="solid"
                />
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <View style={{ flex: 1 }}>
                <Button
                  title={t.sync.connectCloud}
                  variant="primary"
                  size="md"
                  icon={<Cloud size={16} color="#FFFFFF" strokeWidth={2.5} />}
                  onPress={() => setShowAuthModal(true)}
                  fullWidth
                />
              </View>
              <View style={{ flex: 1 }}>
                <Button
                  title={t.sync.pairingButton}
                  variant="outline"
                  size="md"
                  icon={<Users size={16} color={theme.colors.textPrimary} strokeWidth={2.5} />}
                  onPress={() => setShowPairingModal(true)}
                  fullWidth
                />
              </View>
            </View>
          </View>
        )}
      </Card>

      {/* 4. Notification Preferences Card */}
      <Card padding="lg" style={{ marginBottom: spacing.lg }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.xs,
            marginBottom: spacing.md,
          }}
        >
          <Bell size={20} color={theme.colors.brand} strokeWidth={2.5} />
          <Text
            style={{
              color: theme.colors.textPrimary,
              fontSize: typography.fontSizes.lg,
              fontWeight: typography.fontWeights.bold,
            }}
          >
            {t.notifications.title}
          </Text>
        </View>

        {/* Master Switch */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: theme.isDark
              ? theme.colors.surfaceContainerHigh
              : theme.colors.surfaceSubtle,
            padding: spacing.md,
            borderRadius: radius.lg,
            borderWidth: 1.5,
            borderColor: theme.colors.borderTactile,
            marginBottom: spacing.md,
          }}
        >
          <View style={{ flex: 1, marginRight: spacing.sm }}>
            <Text
              style={{
                color: theme.colors.textPrimary,
                fontSize: typography.fontSizes.md,
                fontWeight: typography.fontWeights.bold,
              }}
            >
              {t.notifications.pushEnabledLabel}
            </Text>
            {Platform.OS === 'web' && (
              <Text
                style={{
                  color: theme.colors.textSecondary,
                  fontSize: typography.fontSizes.xs,
                  marginTop: 2,
                }}
              >
                {locale === 'it'
                  ? 'Disattivato su browser Web (supportato su iOS e Android)'
                  : 'Deactivated in Web browser (supported on iOS & Android)'}
              </Text>
            )}
          </View>
          <Switch
            value={Platform.OS === 'web' ? false : notificationPreferences.push_enabled}
            disabled={Platform.OS === 'web'}
            onValueChange={handleTogglePushMaster}
            trackColor={{ false: theme.colors.border, true: theme.colors.brand }}
            thumbColor="#FFFFFF"
          />
        </View>

        {/* Granular Notification Switches */}
        <View
          style={{
            opacity: Platform.OS === 'web' || !notificationPreferences.push_enabled ? 0.45 : 1,
            gap: spacing.sm,
          }}
          pointerEvents={
            Platform.OS === 'web' || !notificationPreferences.push_enabled ? 'none' : 'auto'
          }
        >
          {/* Group 1: Activity */}
          <Text
            style={{
              color: theme.colors.textSecondary,
              fontSize: typography.fontSizes.xs,
              fontWeight: typography.fontWeights.bold,
              textTransform: 'uppercase',
              letterSpacing: 0.5,
              marginTop: spacing.xs,
            }}
          >
            {t.notifications.activityGroup}
          </Text>

          {/* A3: Statement Imports */}
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: theme.isDark
                ? theme.colors.surfaceContainerHigh
                : theme.colors.surfaceSubtle,
              padding: spacing.md,
              borderRadius: radius.md,
              borderWidth: 1,
              borderColor: theme.colors.borderTactile,
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.sm,
                flex: 1,
                marginRight: spacing.sm,
              }}
            >
              <FileSpreadsheet size={18} color={theme.colors.brand} strokeWidth={2.5} />
              <Text
                style={{
                  color: theme.colors.textPrimary,
                  fontSize: typography.fontSizes.sm,
                  fontWeight: typography.fontWeights.semibold,
                  flex: 1,
                }}
              >
                {t.notifications.batchImportLabel}
              </Text>
            </View>
            <Switch
              value={notificationPreferences.notify_batch_import}
              onValueChange={(val) => updateNotificationPreferences({ notify_batch_import: val })}
              disabled={!notificationPreferences.push_enabled}
              trackColor={{ false: theme.colors.border, true: theme.colors.brand }}
              thumbColor="#FFFFFF"
            />
          </View>

          {/* A4: Expense Edits & Deletions */}
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: theme.isDark
                ? theme.colors.surfaceContainerHigh
                : theme.colors.surfaceSubtle,
              padding: spacing.md,
              borderRadius: radius.md,
              borderWidth: 1,
              borderColor: theme.colors.borderTactile,
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.sm,
                flex: 1,
                marginRight: spacing.sm,
              }}
            >
              <Edit3 size={18} color={theme.colors.brand} strokeWidth={2.5} />
              <Text
                style={{
                  color: theme.colors.textPrimary,
                  fontSize: typography.fontSizes.sm,
                  fontWeight: typography.fontWeights.semibold,
                  flex: 1,
                }}
              >
                {t.notifications.expenseUpdatesLabel}
              </Text>
            </View>
            <Switch
              value={notificationPreferences.notify_expense_updates}
              onValueChange={(val) =>
                updateNotificationPreferences({ notify_expense_updates: val })
              }
              disabled={!notificationPreferences.push_enabled}
              trackColor={{ false: theme.colors.border, true: theme.colors.brand }}
              thumbColor="#FFFFFF"
            />
          </View>

          {/* Group 2: Settlements */}
          <Text
            style={{
              color: theme.colors.textSecondary,
              fontSize: typography.fontSizes.xs,
              fontWeight: typography.fontWeights.bold,
              textTransform: 'uppercase',
              letterSpacing: 0.5,
              marginTop: spacing.xs,
            }}
          >
            {t.notifications.debtsGroup}
          </Text>

          {/* B1: Settlement Payments */}
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: theme.isDark
                ? theme.colors.surfaceContainerHigh
                : theme.colors.surfaceSubtle,
              padding: spacing.md,
              borderRadius: radius.md,
              borderWidth: 1,
              borderColor: theme.colors.borderTactile,
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.sm,
                flex: 1,
                marginRight: spacing.sm,
              }}
            >
              <ArrowLeftRight size={18} color={theme.colors.brand} strokeWidth={2.5} />
              <Text
                style={{
                  color: theme.colors.textPrimary,
                  fontSize: typography.fontSizes.sm,
                  fontWeight: typography.fontWeights.semibold,
                  flex: 1,
                }}
              >
                {t.notifications.settlementLabel}
              </Text>
            </View>
            <Switch
              value={notificationPreferences.notify_settlements}
              onValueChange={(val) => updateNotificationPreferences({ notify_settlements: val })}
              disabled={!notificationPreferences.push_enabled}
              trackColor={{ false: theme.colors.border, true: theme.colors.brand }}
              thumbColor="#FFFFFF"
            />
          </View>

          {/* Group 3: Family & Roles */}
          <Text
            style={{
              color: theme.colors.textSecondary,
              fontSize: typography.fontSizes.xs,
              fontWeight: typography.fontWeights.bold,
              textTransform: 'uppercase',
              letterSpacing: 0.5,
              marginTop: spacing.xs,
            }}
          >
            {t.notifications.familyGroup}
          </Text>

          {/* E1: Member Joined */}
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: theme.isDark
                ? theme.colors.surfaceContainerHigh
                : theme.colors.surfaceSubtle,
              padding: spacing.md,
              borderRadius: radius.md,
              borderWidth: 1,
              borderColor: theme.colors.borderTactile,
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.sm,
                flex: 1,
                marginRight: spacing.sm,
              }}
            >
              <UserCheck size={18} color={theme.colors.brand} strokeWidth={2.5} />
              <Text
                style={{
                  color: theme.colors.textPrimary,
                  fontSize: typography.fontSizes.sm,
                  fontWeight: typography.fontWeights.semibold,
                  flex: 1,
                }}
              >
                {t.notifications.memberJoinedLabel}
              </Text>
            </View>
            <Switch
              value={notificationPreferences.notify_member_joined}
              onValueChange={(val) => updateNotificationPreferences({ notify_member_joined: val })}
              disabled={!notificationPreferences.push_enabled}
              trackColor={{ false: theme.colors.border, true: theme.colors.brand }}
              thumbColor="#FFFFFF"
            />
          </View>

          {/* E2: Role Changed */}
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: theme.isDark
                ? theme.colors.surfaceContainerHigh
                : theme.colors.surfaceSubtle,
              padding: spacing.md,
              borderRadius: radius.md,
              borderWidth: 1,
              borderColor: theme.colors.borderTactile,
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.sm,
                flex: 1,
                marginRight: spacing.sm,
              }}
            >
              <Shield size={18} color={theme.colors.brand} strokeWidth={2.5} />
              <Text
                style={{
                  color: theme.colors.textPrimary,
                  fontSize: typography.fontSizes.sm,
                  fontWeight: typography.fontWeights.semibold,
                  flex: 1,
                }}
              >
                {t.notifications.roleChangedLabel}
              </Text>
            </View>
            <Switch
              value={notificationPreferences.notify_role_changed}
              onValueChange={(val) => updateNotificationPreferences({ notify_role_changed: val })}
              disabled={!notificationPreferences.push_enabled}
              trackColor={{ false: theme.colors.border, true: theme.colors.brand }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>
      </Card>

      {/* 5. Data Management & Backup */}
      <Card padding="lg" style={{ marginBottom: spacing.lg }}>
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
            size="md"
            icon={<Download size={18} color={theme.colors.textPrimary} strokeWidth={2.5} />}
            onPress={handleExportFullArchive}
            fullWidth
          />
        </View>

        {/* Reset Demo Data */}
        <View style={{ marginBottom: spacing.md }}>
          <Button
            title={t.settings.resetDemoDataButton}
            variant="outline"
            size="md"
            icon={<RotateCcw size={18} color={theme.colors.textPrimary} strokeWidth={2.5} />}
            onPress={resetToSampleData}
            fullWidth
          />
        </View>

        {/* Clear Ledger (Danger Zone) */}
        <View>
          <Button
            title={t.settings.clearLedgerButton}
            variant="danger"
            size="md"
            icon={<Trash2 size={18} color="#FFFFFF" strokeWidth={2.5} />}
            onPress={handleClearLedger}
            fullWidth
          />
        </View>
      </Card>

      {/* 6. About & Privacy Guarantee Card */}
      <Card
        padding="lg"
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
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
            <ShieldCheck size={20} color={theme.colors.success} strokeWidth={2.5} />
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
      </Card>

      {/* Auth Modal */}
      <AuthModal visible={showAuthModal} onClose={() => setShowAuthModal(false)} />

      {/* Pairing Modal */}
      <FamilyPairingModal visible={showPairingModal} onClose={() => setShowPairingModal(false)} />
    </ScrollView>
  );
}
