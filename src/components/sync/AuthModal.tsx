import React, { useState } from 'react';
import { View, Text, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Cloud, Mail, KeyRound, AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react-native';
import { FormModal } from '@/components/common/FormModal';
import { Input } from '@/components/common/Input';
import { Button } from '@/components/common/Button';
import { useTheme } from '@/theme';
import { useI18n } from '@/i18n';
import { authService } from '@/services/authService';
import { migrationService } from '@/services/migrationService';
import { realtimeSync } from '@/services/realtimeSync';
import { useAppStore } from '@/services/store';

interface AuthModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ visible, onClose, onSuccess }) => {
  const { theme, spacing, typography, radius } = useTheme();
  const { t } = useI18n();
  const { family } = useAppStore();

  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const resetForm = () => {
    setStep('email');
    setEmail('');
    setOtp('');
    setIsLoading(false);
    setError(null);
    setSuccess(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSendOtp = async () => {
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    setError(null);

    const res = await authService.sendOtp(trimmedEmail);
    setIsLoading(false);

    if (res.error) {
      setError(res.error);
    } else {
      setStep('otp');
    }
  };

  const handleVerifyOtp = async () => {
    const trimmedOtp = otp.trim();
    if (trimmedOtp.length < 6) {
      setError('Please enter the full 6-digit code');
      return;
    }

    setIsLoading(true);
    setError(null);

    const res = await authService.verifyOtp(email, trimmedOtp);
    if (res.error) {
      setIsLoading(false);
      setError(res.error);
      return;
    }

    // Successfully authenticated: run data migration & start realtime sync
    setSuccess(t.sync.migrateSuccess);
    const userId = res.session?.user?.id;
    await migrationService.migrateLocalDataToSupabase(family.id, userId);
    realtimeSync.startRealtimeSync(family.id);

    setIsLoading(false);
    setTimeout(() => {
      handleClose();
      onSuccess?.();
    }, 1200);
  };

  return (
    <FormModal
      visible={visible}
      title={step === 'email' ? t.sync.signInTitle : t.sync.otpCodeLabel}
      icon={<Cloud size={20} color={theme.colors.brand} />}
      onClose={handleClose}
      onSubmit={step === 'email' ? handleSendOtp : handleVerifyOtp}
      submitTitle={
        isLoading ? '...' : step === 'email' ? t.sync.sendOtpButton : t.sync.verifyButton
      }
      cancelTitle={t.common.cancel}
    >
      <View style={{ gap: spacing.md }}>
        <Text
          style={{
            color: theme.colors.textSecondary,
            fontSize: typography.fontSizes.sm,
            lineHeight: 20,
          }}
        >
          {step === 'email' ? t.sync.signInSubtitle : `${t.sync.signInSubtitle} (${email})`}
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

        {success && (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.xs,
              backgroundColor: theme.isDark ? '#064E3B' : '#ECFDF5',
              padding: spacing.sm,
              borderRadius: radius.md,
            }}
          >
            <CheckCircle2 size={16} color={theme.colors.success} />
            <Text
              style={{ color: theme.colors.success, fontSize: typography.fontSizes.xs, flex: 1 }}
            >
              {success}
            </Text>
          </View>
        )}

        {step === 'email' ? (
          <Input
            label={t.sync.emailLabel}
            placeholder={t.sync.emailPlaceholder}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            leftIcon={<Mail size={16} color={theme.colors.textMuted} />}
          />
        ) : (
          <View style={{ gap: spacing.sm }}>
            <Input
              label={t.sync.otpCodeLabel}
              placeholder={t.sync.otpCodePlaceholder}
              value={otp}
              onChangeText={setOtp}
              keyboardType="number-pad"
              maxLength={8}
              leftIcon={<KeyRound size={16} color={theme.colors.textMuted} />}
            />
            <TouchableOpacity
              onPress={() => {
                setStep('email');
                setError(null);
              }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
                alignSelf: 'flex-start',
                marginTop: 2,
              }}
            >
              <ArrowLeft size={14} color={theme.colors.brand} />
              <Text
                style={{
                  color: theme.colors.brand,
                  fontSize: typography.fontSizes.xs,
                  fontWeight: typography.fontWeights.medium,
                }}
              >
                Change Email / Resend
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {isLoading && (
          <ActivityIndicator
            size="small"
            color={theme.colors.brand}
            style={{ marginVertical: spacing.xs }}
          />
        )}
      </View>
    </FormModal>
  );
};
