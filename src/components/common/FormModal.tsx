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
          backgroundColor: 'rgba(0,0,0,0.5)',
          justifyContent: 'flex-end',
        }}
      >
        <View
          style={{
            backgroundColor: theme.colors.surface,
            borderTopLeftRadius: radius.xl,
            borderTopRightRadius: radius.xl,
            padding: spacing.xl,
            maxHeight: '90%',
          }}
        >
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
