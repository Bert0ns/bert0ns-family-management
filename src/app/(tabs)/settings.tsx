import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Platform, Switch } from 'react-native';
import {
  Sun,
  RotateCcw,
  ShieldCheck,
  Download,
  Trash2,
  Lock,
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
    members,
    categories,
    expenses,
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
        if (notificationPreferences.push_enabled) {
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
        if (notificationPreferences.push_enabled) {
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
    if (user) {
      await pushNotificationService.unregisterPushTokenAsync(user.id);
    }
    await authService.signOut();
    realtimeSync.stopRealtimeSync();
    setUserEmail(null);
  };

  const handleTogglePushMaster = async (enabled: boolean) => {
    updateNotificationPreferences({ push_enabled: enabled });
    if (enabled) {
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
    const archivePayload = {
      app: "Bert0n's Family Expense Manager",
      version: '1.0.0',
      exported_at: new Date().toISOString(),
      family,
      members,
      categories,
      expenses,
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
      contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xxl }}
    >
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: spacing.lg,
        }}
      >
        <Text
          style={{
            color: theme.colors.textPrimary,
            fontSize: typography.fontSizes.xxl,
            fontWeight: typography.fontWeights.bold,
          }}
        >
          {t.settings.title}
        </Text>
        <SyncBadge />
      </View>

      {/* 1. Household Profile Card */}
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
                variant="primary"
                size="md"
                icon={<Check size={18} color="#FFFFFF" />}
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

        {/* Fixed EUR Currency Info */}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: theme.colors.surfaceSubtle,
            padding: spacing.md,
            borderRadius: radius.md,
            marginTop: spacing.sm,
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
              {t.settings.currencyLabel}
            </Text>
            <Text
              style={{
                color: theme.colors.textMuted,
                fontSize: typography.fontSizes.xs,
                marginTop: 2,
              }}
            >
              {t.settings.currencySubtitle}
            </Text>
          </View>
          <Badge label="EUR (€)" color={theme.colors.brand} size="md" variant="solid" />
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
              marginBottom: 4,
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
              fontSize: typography.fontSizes.xs,
              marginBottom: 4,
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
      <Card padding="md" style={{ marginBottom: spacing.lg }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.xs,
            marginBottom: spacing.xs,
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
        <Text
          style={{
            color: theme.colors.textMuted,
            fontSize: typography.fontSizes.xs,
            marginBottom: spacing.md,
            lineHeight: 18,
          }}
        >
          {t.settings.cloudSyncSubtitle}
        </Text>

        {userEmail ? (
          <View style={{ gap: spacing.sm }}>
            <View
              style={{
                backgroundColor: theme.colors.surfaceSubtle,
                padding: spacing.md,
                borderRadius: radius.md,
              }}
            >
              <Text
                style={{
                  color: theme.colors.textMuted,
                  fontSize: typography.fontSizes.xs,
                  fontWeight: typography.fontWeights.semibold,
                }}
              >
                {t.sync.connectedAs}
              </Text>
              <Text
                style={{
                  color: theme.colors.textPrimary,
                  fontSize: typography.fontSizes.sm,
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
                  size="sm"
                  icon={<RefreshCw size={14} color={theme.colors.textPrimary} />}
                  onPress={handleManualSync}
                  fullWidth
                />
              </View>
              <View style={{ flex: 1 }}>
                <Button
                  title={t.sync.pairingButton}
                  variant="outline"
                  size="sm"
                  icon={<Users size={14} color={theme.colors.textPrimary} />}
                  onPress={() => setShowPairingModal(true)}
                  fullWidth
                />
              </View>
            </View>

            <Button
              title={t.sync.signOutButton}
              variant="secondary"
              size="sm"
              icon={<LogOut size={14} color={theme.colors.textMuted} />}
              onPress={handleSignOut}
              fullWidth
            />
          </View>
        ) : (
          <View style={{ gap: spacing.sm }}>
            <View
              style={{
                backgroundColor: theme.colors.surfaceSubtle,
                padding: spacing.md,
                borderRadius: radius.md,
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
                    fontSize: typography.fontSizes.sm,
                    fontWeight: typography.fontWeights.semibold,
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
              <Text
                style={{
                  color: theme.colors.textMuted,
                  fontSize: typography.fontSizes.xs,
                  marginTop: 4,
                  lineHeight: 18,
                }}
              >
                {t.sync.signInSubtitle}
              </Text>
            </View>

            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <View style={{ flex: 1 }}>
                <Button
                  title={t.sync.connectCloud}
                  variant="primary"
                  size="sm"
                  icon={<Cloud size={14} color="#FFFFFF" />}
                  onPress={() => setShowAuthModal(true)}
                  fullWidth
                />
              </View>
              <View style={{ flex: 1 }}>
                <Button
                  title={t.sync.pairingButton}
                  variant="outline"
                  size="sm"
                  icon={<Users size={14} color={theme.colors.textPrimary} />}
                  onPress={() => setShowPairingModal(true)}
                  fullWidth
                />
              </View>
            </View>
          </View>
        )}

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.xs }}>
          <Lock size={12} color={theme.colors.textMuted} />
          <Text style={{ color: theme.colors.textMuted, fontSize: typography.fontSizes.xs }}>
            {t.settings.privacyGuaranteeTitle}: {t.settings.privacyGuaranteeFooter}
          </Text>
        </View>
      </Card>

      {/* 4. Notification Preferences Card */}
      <Card padding="md" style={{ marginBottom: spacing.lg }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.xs,
            marginBottom: spacing.xs,
          }}
        >
          <Bell size={18} color={theme.colors.brand} />
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
        <Text
          style={{
            color: theme.colors.textMuted,
            fontSize: typography.fontSizes.xs,
            marginBottom: spacing.md,
            lineHeight: 18,
          }}
        >
          {t.notifications.subtitle}
        </Text>

        {/* Master Switch */}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: theme.colors.surfaceSubtle,
            padding: spacing.md,
            borderRadius: radius.md,
            marginBottom: spacing.md,
          }}
        >
          <View style={{ flex: 1, marginRight: spacing.sm }}>
            <Text
              style={{
                color: theme.colors.textPrimary,
                fontSize: typography.fontSizes.sm,
                fontWeight: typography.fontWeights.bold,
              }}
            >
              {t.notifications.pushEnabledLabel}
            </Text>
            <Text
              style={{
                color: theme.colors.textMuted,
                fontSize: typography.fontSizes.xs,
                marginTop: 2,
              }}
            >
              {t.notifications.pushEnabledDesc}
            </Text>
          </View>
          <Switch
            value={notificationPreferences.push_enabled}
            onValueChange={handleTogglePushMaster}
            trackColor={{ false: theme.colors.border, true: theme.colors.brand }}
            thumbColor="#FFFFFF"
          />
        </View>

        {/* Granular Notification Switches */}
        <View
          style={{
            opacity: notificationPreferences.push_enabled ? 1 : 0.45,
            gap: spacing.sm,
          }}
          pointerEvents={notificationPreferences.push_enabled ? 'auto' : 'none'}
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
              backgroundColor: theme.colors.surfaceSubtle,
              padding: spacing.sm,
              borderRadius: radius.sm,
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
              <FileSpreadsheet size={16} color={theme.colors.brand} />
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    color: theme.colors.textPrimary,
                    fontSize: typography.fontSizes.sm,
                    fontWeight: typography.fontWeights.medium,
                  }}
                >
                  {t.notifications.batchImportLabel}
                </Text>
                <Text style={{ color: theme.colors.textMuted, fontSize: typography.fontSizes.xs }}>
                  {t.notifications.batchImportDesc}
                </Text>
              </View>
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
              backgroundColor: theme.colors.surfaceSubtle,
              padding: spacing.sm,
              borderRadius: radius.sm,
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
              <Edit3 size={16} color={theme.colors.brand} />
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    color: theme.colors.textPrimary,
                    fontSize: typography.fontSizes.sm,
                    fontWeight: typography.fontWeights.medium,
                  }}
                >
                  {t.notifications.expenseUpdatesLabel}
                </Text>
                <Text style={{ color: theme.colors.textMuted, fontSize: typography.fontSizes.xs }}>
                  {t.notifications.expenseUpdatesDesc}
                </Text>
              </View>
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
              backgroundColor: theme.colors.surfaceSubtle,
              padding: spacing.sm,
              borderRadius: radius.sm,
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
              <ArrowLeftRight size={16} color={theme.colors.brand} />
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    color: theme.colors.textPrimary,
                    fontSize: typography.fontSizes.sm,
                    fontWeight: typography.fontWeights.medium,
                  }}
                >
                  {t.notifications.settlementLabel}
                </Text>
                <Text style={{ color: theme.colors.textMuted, fontSize: typography.fontSizes.xs }}>
                  {t.notifications.settlementDesc}
                </Text>
              </View>
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
              backgroundColor: theme.colors.surfaceSubtle,
              padding: spacing.sm,
              borderRadius: radius.sm,
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
              <UserCheck size={16} color={theme.colors.brand} />
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    color: theme.colors.textPrimary,
                    fontSize: typography.fontSizes.sm,
                    fontWeight: typography.fontWeights.medium,
                  }}
                >
                  {t.notifications.memberJoinedLabel}
                </Text>
                <Text style={{ color: theme.colors.textMuted, fontSize: typography.fontSizes.xs }}>
                  {t.notifications.memberJoinedDesc}
                </Text>
              </View>
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
              backgroundColor: theme.colors.surfaceSubtle,
              padding: spacing.sm,
              borderRadius: radius.sm,
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
              <Shield size={16} color={theme.colors.brand} />
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    color: theme.colors.textPrimary,
                    fontSize: typography.fontSizes.sm,
                    fontWeight: typography.fontWeights.medium,
                  }}
                >
                  {t.notifications.roleChangedLabel}
                </Text>
                <Text style={{ color: theme.colors.textMuted, fontSize: typography.fontSizes.xs }}>
                  {t.notifications.roleChangedDesc}
                </Text>
              </View>
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

      {/* 6. About & Privacy Guarantee Card */}
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
            marginBottom: spacing.sm,
          }}
        >
          {t.settings.privacyGuaranteeDescription}
        </Text>
        <Text
          style={{
            color: theme.colors.textMuted,
            fontSize: typography.fontSizes.xs,
          }}
        >
          {t.settings.appVersion}
        </Text>
      </Card>

      {/* Auth Modal */}
      <AuthModal visible={showAuthModal} onClose={() => setShowAuthModal(false)} />

      {/* Pairing Modal */}
      <FamilyPairingModal visible={showPairingModal} onClose={() => setShowPairingModal(false)} />
    </ScrollView>
  );
}
