import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { X, Check } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { Button } from './Button';

interface FormModalProps {
  visible: boolean;
  title: string;
  icon?: React.ReactNode;
  onClose: () => void;
  onSubmit: () => void;
  submitTitle?: string;
  cancelTitle?: string;
  children: React.ReactNode;
}

export const FormModal: React.FC<FormModalProps> = ({
  visible,
  title,
  icon,
  onClose,
  onSubmit,
  submitTitle = 'Save',
  cancelTitle = 'Cancel',
  children,
}) => {
  const { theme, spacing, radius, typography } = useTheme();

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{
          flex: 1,
          backgroundColor: theme.isDark ? 'rgba(0,0,0,0.65)' : 'rgba(15,23,42,0.35)',
          justifyContent: 'flex-end',
        }}
      >
        <View
          style={[
            {
              backgroundColor: theme.colors.surface,
              borderTopLeftRadius: radius.xxl,
              borderTopRightRadius: radius.xxl,
              paddingHorizontal: spacing.xl,
              paddingBottom: spacing.xl,
              paddingTop: spacing.sm,
              maxHeight: '90%',
              borderWidth: 1,
              borderColor: theme.isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.8)',
              borderBottomWidth: 0,
            },
            Platform.OS === 'web' &&
              ({
                backdropFilter: 'blur(24px)',
                WebkitBackdropFilter: 'blur(24px)',
                boxShadow: theme.isDark
                  ? '0 -8px 32px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.15)'
                  : '0 -8px 32px rgba(148, 163, 184, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.95)',
              } as any),
          ]}
        >
          {/* Apple Sheet Grabber Handle */}
          <View
            style={{ alignItems: 'center', paddingVertical: spacing.xs, marginBottom: spacing.md }}
          >
            <View
              style={{
                width: 36,
                height: 4,
                borderRadius: 2,
                backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.15)',
              }}
            />
          </View>
          {/* Header */}
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: spacing.lg,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
              {icon}
              <Text
                style={{
                  color: theme.colors.textPrimary,
                  fontSize: typography.fontSizes.xl,
                  fontWeight: typography.fontWeights.bold,
                }}
              >
                {title}
              </Text>
            </View>

            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <X size={24} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Form Content */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: spacing.sm }}
          >
            {children}
          </ScrollView>

          {/* Footer Actions */}
          <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg }}>
            <Button title={cancelTitle} variant="outline" onPress={onClose} style={{ flex: 1 }} />
            <Button
              title={submitTitle}
              variant="primary"
              icon={<Check size={18} color="#FFFFFF" />}
              onPress={onSubmit}
              style={{ flex: 1 }}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};
