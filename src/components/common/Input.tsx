import React from 'react';
import {
  View,
  TextInput,
  Text,
  TextInputProps,
  ViewStyle,
  TextStyle,
  Platform,
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
  const isWeb = Platform.OS === 'web';
  const webGlass = isWeb
    ? ({
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        boxShadow: theme.isDark
          ? 'inset 0 1px 0 rgba(255, 255, 255, 0.05)'
          : 'inset 0 1px 0 rgba(255, 255, 255, 0.6), 0 2px 8px rgba(148, 163, 184, 0.06)',
      } as any)
    : {};

  const wrapperStyle: ViewStyle = {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.inputBg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: error ? theme.colors.danger : theme.colors.inputBorder,
    paddingHorizontal: spacing.md,
    height: 48,
    gap: spacing.sm,
    ...webGlass,
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
