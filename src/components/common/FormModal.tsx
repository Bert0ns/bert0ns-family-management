import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  useWindowDimensions,
  ViewStyle,
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
  const { width: windowWidth } = useWindowDimensions();
  const isDesktop = windowWidth >= 768;

  const isWeb = Platform.OS === 'web';
  const webModalStyle: ViewStyle = isWeb
    ? ({
        boxShadow: isDesktop
          ? theme.isDark
            ? '0 16px 32px rgba(0, 0, 0, 0.45)'
            : '0 8px 24px rgba(27, 33, 30, 0.08)'
          : theme.isDark
            ? '0 -4px 16px rgba(0, 0, 0, 0.35)'
            : '0 -4px 16px rgba(27, 33, 30, 0.06)',
      } as unknown as ViewStyle)
    : {};

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{
          flex: 1,
          backgroundColor: theme.isDark ? 'rgba(0, 0, 0, 0.7)' : 'rgba(18, 20, 24, 0.4)',
          justifyContent: isDesktop ? 'center' : 'flex-end',
          alignItems: isDesktop ? 'center' : 'stretch',
          padding: isDesktop ? spacing.lg : 0,
        }}
      >
        <View
          style={[
            {
              backgroundColor: theme.colors.surface,
              borderRadius: radius.sm,
              borderTopLeftRadius: radius.sm,
              borderTopRightRadius: radius.sm,
              borderBottomLeftRadius: isDesktop ? radius.sm : 0,
              borderBottomRightRadius: isDesktop ? radius.sm : 0,
              paddingHorizontal: spacing.lg,
              paddingBottom: spacing.xl,
              paddingTop: isDesktop ? spacing.lg : spacing.sm,
              maxHeight: isDesktop ? '85%' : '90%',
              width: isDesktop ? '100%' : undefined,
              maxWidth: isDesktop ? 540 : undefined,
              borderWidth: 1,
              borderColor: theme.colors.cardBorder,
              borderBottomWidth: isDesktop ? 1 : 0,
            },
            webModalStyle,
          ]}
        >
          {!isDesktop && (
            <View
              style={{
                alignItems: 'center',
                paddingVertical: spacing.xs,
                marginBottom: spacing.md,
              }}
            >
              <View
                style={{
                  width: 36,
                  height: 4,
                  borderRadius: radius.xs,
                  backgroundColor: theme.colors.borderTactile,
                }}
              />
            </View>
          )}

          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: spacing.lg,
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.xs,
                flex: 1,
                minWidth: 0,
                marginRight: spacing.sm,
              }}
            >
              {icon}
              <Text
                style={{
                  color: theme.colors.textPrimary,
                  fontSize: typography.fontSizes.xl,
                  fontWeight: typography.fontWeights.bold,
                  flex: 1,
                  minWidth: 0,
                }}
                numberOfLines={1}
              >
                {title}
              </Text>
            </View>

            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              accessibilityRole="button"
              accessibilityLabel={cancelTitle || 'Close'}
              style={{ flexShrink: 0 }}
            >
              <X size={24} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: spacing.sm }}
          >
            {children}
          </ScrollView>

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
