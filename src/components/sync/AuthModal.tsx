import React, { useState, useRef, useEffect } from 'react';
import { View, Text, ActivityIndicator, TouchableOpacity, Platform } from 'react-native';
import { Cloud, Mail, KeyRound, AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react-native';
import { FormModal } from '@/components/common/FormModal';
import { Input } from '@/components/common/Input';
import { OptionSelector } from '@/components/common/OptionSelector';
import { useTheme } from '@/theme';
import { useI18n } from '@/i18n';
import { useAppStore } from '@/services/store';
import {
  authWorkflowService,
  VerifyAndMigrateResult,
  AuthIntent,
} from '@/services/authWorkflowService';

export interface AuthModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: (result?: VerifyAndMigrateResult) => void;
  intent?: AuthIntent;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  visible,
  onClose,
  onSuccess,
  intent = 'create',
}) => {
  const { theme, spacing, typography, radius } = useTheme();
  const { t } = useI18n();
  const family = useAppStore((s) => s.family);

  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [selectedIntent, setSelectedIntent] = useState<AuthIntent | null>(null);
  const authIntent = selectedIntent ?? intent;
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
      }
    };
  }, []);

  const resetForm = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
    }
    setStep('email');
    setEmail('');
    setOtp('');
    setSelectedIntent(null);
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
      setError(t.sync.invalidEmailError);
      return;
    }

    setIsLoading(true);
    setError(null);

    const redirectUrl =
      Platform.OS === 'web' && typeof window !== 'undefined' ? window.location.origin : undefined;
    const res = await authWorkflowService.sendOtp(trimmedEmail, redirectUrl);
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
      setError(t.sync.invalidOtpError);
      return;
    }

    setIsLoading(true);
    setError(null);

    const res = await authWorkflowService.verifyOtpAndMigrate(email, trimmedOtp, family.id, {
      intent: authIntent,
    });
    setIsLoading(false);

    if (!res.success) {
      setError(res.error || 'Authentication failed');
      return;
    }

    const successMsg =
      res.actionTaken === 'ready_to_join' || authIntent === 'join'
        ? t.sync.connectedAs
          ? `${t.sync.connectedAs} ${email}`
          : t.sync.migrateSuccess
        : t.sync.migrateSuccess;

    setSuccess(successMsg);
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    closeTimerRef.current = setTimeout(() => {
      handleClose();
      onSuccess?.(res);
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
        {step === 'email' && (
          <OptionSelector
            options={[
              { label: t.sync.createHouseholdOption, value: 'create' as const },
              { label: t.sync.joinHouseholdOption, value: 'join' as const },
            ]}
            selectedValue={authIntent}
            onSelect={(val) => setSelectedIntent(val)}
          />
        )}

        <Text
          style={{
            color: theme.colors.textSecondary,
            fontSize: typography.fontSizes.sm,
            lineHeight: 20,
          }}
        >
          {step === 'email'
            ? authIntent === 'join'
              ? t.sync.signInJoinSubtitle
              : t.sync.signInSubtitle
            : `${authIntent === 'join' ? t.sync.signInJoinSubtitle : t.sync.signInSubtitle} (${email})`}
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
            <Text
              style={{
                color: theme.colors.textMuted,
                fontSize: typography.fontSizes.xs,
                lineHeight: 16,
              }}
            >
              {t.sync.otpCodeHelper}
            </Text>
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
                {t.sync.changeEmailOrResend}
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
