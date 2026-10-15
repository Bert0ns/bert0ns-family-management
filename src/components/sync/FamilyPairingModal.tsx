import { uiLogger } from '@/services/logger';
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Alert, Platform } from 'react-native';
import { Users, Copy, Check, LogIn, AlertCircle, RefreshCw } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { FormModal } from '@/components/common/FormModal';
import { Input } from '@/components/common/Input';
import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { useTheme } from '@/theme';
import { useI18n } from '@/i18n';
import { useAppStore } from '@/services/store';
import { pairingService } from '@/services/pairingService';

interface FamilyPairingModalProps {
  visible: boolean;
  onClose: () => void;
  onOpenAuth?: (intent: 'join') => void;
}

export const FamilyPairingModal: React.FC<FamilyPairingModalProps> = ({
  visible,
  onClose,
  onOpenAuth,
}) => {
  const { theme, spacing, typography, radius } = useTheme();
  const { t } = useI18n();
  const family = useAppStore((s) => s.family);

  const [copied, setCopied] = useState(false);
  const [regenerated, setRegenerated] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAuthRequired, setIsAuthRequired] = useState(false);

  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const regenerateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      if (regenerateTimerRef.current) clearTimeout(regenerateTimerRef.current);
    };
  }, []);

  // Ensure family has an invite code
  const currentInviteCode = family.invite_code || 'FAM-8492';

  // Synchronize remote invite code when modal opens or family changes
  useEffect(() => {
    if (!visible) return;
    pairingService.syncInviteCode(family.id, family.invite_code).catch(() => {});
  }, [visible, family.id, family.invite_code]);

  const handleCopyCode = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(currentInviteCode);
      }
      if (Platform.OS !== 'web') {
        try {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch {}
      }
      setCopied(true);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(true);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleRegenerateCode = async () => {
    uiLogger.info('User triggered regenerate household invite code');
    setIsRegenerating(true);
    setError(null);
    setIsAuthRequired(false);

    const res = await pairingService.regenerateInviteCode(family.id);
    setIsRegenerating(false);

    if (!res.success) {
      setError(res.error || 'Failed to regenerate code');
      return;
    }

    if (Platform.OS !== 'web') {
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}
    }

    setRegenerated(true);
    if (regenerateTimerRef.current) clearTimeout(regenerateTimerRef.current);
    regenerateTimerRef.current = setTimeout(() => setRegenerated(false), 2500);
  };

  const handleJoinFamily = async () => {
    const code = joinCode.trim().toUpperCase();
    if (code.length < 4) {
      setError(t.sync.invalidCodeError);
      setIsAuthRequired(false);
      return;
    }

    uiLogger.info('User attempting to join household via invite code', { codeLength: code.length });
    setIsJoining(true);
    setError(null);
    setIsAuthRequired(false);

    const res = await pairingService.joinFamilyByInviteCode(code);
    setIsJoining(false);

    if (!res.success) {
      if (res.error === 'AUTH_REQUIRED') {
        setIsAuthRequired(true);
        setError(t.sync.authRequiredToJoin);
      } else {
        setIsAuthRequired(false);
        setError(res.error || t.sync.invalidCodeError);
      }
      return;
    }

    onClose();

    if (Platform.OS === 'web') {
      window.alert(t.sync.migrateSuccess);
    } else {
      Alert.alert(t.sync.joinedHouseholdTitle, t.sync.migrateSuccess);
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

          <View style={{ gap: spacing.sm, marginTop: spacing.xs }}>
            <View
              style={{
                width: '100%',
                backgroundColor: theme.isDark
                  ? 'rgba(99, 102, 241, 0.2)'
                  : 'rgba(99, 102, 241, 0.1)',
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.sm + 2,
                borderRadius: radius.md,
                borderWidth: 1,
                borderColor: theme.colors.brand,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text
                style={{
                  color: theme.colors.brand,
                  fontSize: typography.fontSizes.xl,
                  fontWeight: typography.fontWeights.heavy,
                  letterSpacing: 3,
                  fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
                }}
              >
                {currentInviteCode}
              </Text>
            </View>

            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <Button
                title={copied ? t.sync.copiedNotice.split('!')[0] : t.sync.copyCodeButton}
                variant={copied ? 'secondary' : 'primary'}
                size="sm"
                icon={
                  copied ? <Check size={14} color="#FFFFFF" /> : <Copy size={14} color="#FFFFFF" />
                }
                onPress={handleCopyCode}
                style={{ flex: 1 }}
              />
              <Button
                title={isRegenerating ? t.sync.regeneratingCode : t.sync.regenerateCodeButton}
                variant="outline"
                size="sm"
                icon={<RefreshCw size={14} color={theme.colors.textPrimary} />}
                onPress={handleRegenerateCode}
                disabled={isRegenerating}
                style={{ flex: 1 }}
              />
            </View>
          </View>

          {regenerated && (
            <Text
              style={{
                color: theme.colors.success,
                fontSize: typography.fontSizes.xs,
                fontWeight: typography.fontWeights.medium,
                marginTop: spacing.xs,
              }}
            >
              ✓ {t.sync.regeneratedNotice}
            </Text>
          )}
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
                gap: spacing.xs,
                backgroundColor: theme.isDark ? '#451A1A' : '#FEE2E2',
                padding: spacing.sm,
                borderRadius: radius.md,
                marginBottom: spacing.xs,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                <AlertCircle size={16} color={theme.colors.danger} />
                <Text
                  style={{ color: theme.colors.danger, fontSize: typography.fontSizes.xs, flex: 1 }}
                >
                  {error}
                </Text>
              </View>
              {isAuthRequired && onOpenAuth && (
                <Button
                  title={t.sync.signInToJoinPrompt}
                  variant="primary"
                  size="sm"
                  onPress={() => {
                    onClose();
                    onOpenAuth('join');
                  }}
                  style={{ marginTop: spacing.xs }}
                />
              )}
            </View>
          )}

          <Input
            placeholder={t.sync.joinCodePlaceholder}
            value={joinCode}
            onChangeText={(text) => {
              setJoinCode(text);
              setError(null);
              setIsAuthRequired(false);
            }}
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
