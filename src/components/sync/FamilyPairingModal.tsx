import React, { useState } from 'react';
import { View, Text, Alert, Platform } from 'react-native';
import { Users, Copy, Check, LogIn, AlertCircle } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { FormModal } from '@/components/common/FormModal';
import { Input } from '@/components/common/Input';
import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { useTheme } from '@/theme';
import { useI18n } from '@/i18n';
import { useAppStore } from '@/services/store';
import { supabase, isSupabaseConfigured } from '@/services/supabase';
import { syncEngine } from '@/services/syncEngine';
import { realtimeSync } from '@/services/realtimeSync';

interface FamilyPairingModalProps {
  visible: boolean;
  onClose: () => void;
}

export const FamilyPairingModal: React.FC<FamilyPairingModalProps> = ({ visible, onClose }) => {
  const { theme, spacing, typography, radius } = useTheme();
  const { t } = useI18n();
  const { family, updateFamilySettings } = useAppStore();

  const [copied, setCopied] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Ensure family has an invite code
  const currentInviteCode = family.invite_code || 'FAM-8492';

  const handleCopyCode = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(currentInviteCode);
      }
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleJoinFamily = async () => {
    const code = joinCode.trim().toUpperCase();
    if (code.length < 4) {
      setError(t.sync.invalidCodeError);
      return;
    }

    setIsJoining(true);
    setError(null);

    try {
      if (!isSupabaseConfigured()) {
        // Mock join for offline demonstration
        updateFamilySettings({ name: `Household (${code})` });
        setIsJoining(false);
        onClose();
        if (Platform.OS === 'web') {
          window.alert(t.sync.migrateSuccess);
        } else {
          Alert.alert(t.sync.joinedHouseholdTitle, t.sync.migrateSuccess);
        }
        return;
      }

      // Query Supabase for the family by invite code
      const { data: remoteFamily, error: findError } = await supabase
        .from('families')
        .select('*')
        .eq('invite_code', code)
        .single();

      if (findError || !remoteFamily) {
        setError(t.sync.invalidCodeError);
        setIsJoining(false);
        return;
      }

      // Update local family record
      useAppStore.setState({
        family: {
          id: remoteFamily.id,
          name: remoteFamily.name,
          currency: '€',
          invite_code: remoteFamily.invite_code,
          created_at: remoteFamily.created_at,
          updated_at: remoteFamily.updated_at,
        },
      });

      // Start realtime sync and fetch remote delta
      realtimeSync.startRealtimeSync(remoteFamily.id);
      await syncEngine.fetchDelta(remoteFamily.id);

      setIsJoining(false);
      onClose();

      if (Platform.OS === 'web') {
        window.alert(t.sync.migrateSuccess);
      } else {
        Alert.alert(t.sync.joinedHouseholdTitle, t.sync.migrateSuccess);
      }
    } catch (err: any) {
      setError(err?.message || t.sync.invalidCodeError);
      setIsJoining(false);
    }
  };

  return (
    <FormModal
      visible={visible}
      title={t.sync.familyPairingTitle}
      icon={<Users size={20} color={theme.colors.brand} />}
      onClose={onClose}
      onSubmit={onClose}
      submitTitle={t.common.close}
      cancelTitle=""
    >
      <View style={{ gap: spacing.lg }}>
        {/* 1. Current Household Code */}
        <Card padding="md" style={{ backgroundColor: theme.colors.surfaceSubtle }}>
          <Text
            style={{
              color: theme.colors.textSecondary,
              fontSize: typography.fontSizes.xs,
              textTransform: 'uppercase',
              letterSpacing: 1,
              fontWeight: typography.fontWeights.bold,
              marginBottom: spacing.xs,
            }}
          >
            {t.sync.inviteCodeLabel}
          </Text>

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: spacing.xs,
            }}
          >
            <View
              style={{
                backgroundColor: theme.isDark
                  ? 'rgba(99, 102, 241, 0.2)'
                  : 'rgba(99, 102, 241, 0.1)',
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.sm,
                borderRadius: radius.md,
                borderWidth: 1,
                borderColor: theme.colors.brand,
              }}
            >
              <Text
                style={{
                  color: theme.colors.brand,
                  fontSize: typography.fontSizes.xl,
                  fontWeight: typography.fontWeights.bold,
                  letterSpacing: 2,
                  fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
                }}
              >
                {currentInviteCode}
              </Text>
            </View>

            <Button
              title={copied ? t.sync.copiedNotice.split('!')[0] : t.sync.copyCodeButton}
              variant={copied ? 'secondary' : 'primary'}
              size="sm"
              icon={
                copied ? <Check size={14} color="#FFFFFF" /> : <Copy size={14} color="#FFFFFF" />
              }
              onPress={handleCopyCode}
            />
          </View>
        </Card>

        {/* 2. Join Another Household */}
        <View style={{ gap: spacing.xs }}>
          <Text
            style={{
              color: theme.colors.textPrimary,
              fontSize: typography.fontSizes.md,
              fontWeight: typography.fontWeights.bold,
            }}
          >
            {t.sync.joinFamilyTitle}
          </Text>
          <Text
            style={{
              color: theme.colors.textMuted,
              fontSize: typography.fontSizes.xs,
              lineHeight: 18,
              marginBottom: spacing.xs,
            }}
          >
            {t.sync.joinFamilySubtitle}
          </Text>

          {error && (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.xs,
                backgroundColor: theme.isDark ? '#451A1A' : '#FEE2E2',
                padding: spacing.sm,
                borderRadius: radius.md,
                marginBottom: spacing.xs,
              }}
            >
              <AlertCircle size={16} color={theme.colors.danger} />
              <Text
                style={{ color: theme.colors.danger, fontSize: typography.fontSizes.xs, flex: 1 }}
              >
                {error}
              </Text>
            </View>
          )}

          <Input
            placeholder={t.sync.joinCodePlaceholder}
            value={joinCode}
            onChangeText={setJoinCode}
            autoCapitalize="characters"
            maxLength={10}
            leftIcon={<LogIn size={16} color={theme.colors.textMuted} />}
          />

          <View style={{ marginTop: spacing.xs }}>
            <Button
              title={isJoining ? '...' : t.sync.joinButton}
              variant="outline"
              fullWidth
              onPress={handleJoinFamily}
              disabled={isJoining}
            />
          </View>
        </View>
      </View>
    </FormModal>
  );
};
