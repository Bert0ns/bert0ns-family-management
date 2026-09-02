import React from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TextInputProps,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { useTheme } from '@/theme';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  containerStyle?: ViewStyle;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  leftIcon,
  rightIcon,
  containerStyle,
  style,
  ...props
}) => {
  const { theme, spacing, radius, typography } = useTheme();

  const wrapperStyle: ViewStyle = {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.inputBg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: error ? theme.colors.danger : theme.colors.inputBorder,
    paddingHorizontal: spacing.md,
    height: 48,
    gap: spacing.sm,
  };

  const inputStyle: TextStyle = {
    flex: 1,
    color: theme.colors.textPrimary,
    fontSize: typography.fontSizes.md,
    height: '100%',
  };

  const labelStyle: TextStyle = {
    color: theme.colors.textSecondary,
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.medium,
    marginBottom: spacing.xs,
  };

  const errorStyle: TextStyle = {
    color: theme.colors.danger,
    fontSize: typography.fontSizes.xs,
    marginTop: spacing.xs,
  };

  return (
    <View style={[{ marginBottom: spacing.md }, containerStyle]}>
      {label && <Text style={labelStyle}>{label}</Text>}
      <View style={wrapperStyle}>
        {leftIcon}
        <TextInput
          placeholderTextColor={theme.colors.textMuted}
          style={[inputStyle, style]}
          {...props}
        />
        {rightIcon}
      </View>
      {error && <Text style={errorStyle}>{error}</Text>}
    </View>
  );
};
