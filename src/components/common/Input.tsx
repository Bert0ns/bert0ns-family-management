import React, { useState } from 'react';
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
  onFocus,
  onBlur,
  ...props
}) => {
  const { theme, spacing, radius, typography } = useTheme();
  const [isFocused, setIsFocused] = useState(false);
  const isWeb = Platform.OS === 'web';

  const webGlass = isWeb
    ? ({
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        boxShadow: isFocused
          ? theme.isDark
            ? '0 0 0 3px rgba(99, 102, 241, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.08)'
            : '0 0 0 3px rgba(79, 70, 229, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.8)'
          : theme.isDark
            ? 'inset 0 1px 0 rgba(255, 255, 255, 0.04)'
            : 'inset 0 1px 0 rgba(255, 255, 255, 0.6), 0 2px 6px rgba(15, 23, 42, 0.03)',
      } as any)
    : {};

  const getBorderColor = () => {
    if (error) return theme.colors.danger;
    if (isFocused) return theme.colors.brandSecondary;
    return theme.colors.borderTactile;
  };

  const wrapperStyle: ViewStyle = {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.inputBg,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: getBorderColor(),
    paddingHorizontal: spacing.lg,
    minHeight: 56,
    gap: spacing.sm,
    minWidth: 0,
    ...webGlass,
  };

  const inputStyle: TextStyle = {
    flex: 1,
    minWidth: 0,
    color: theme.colors.textPrimary,
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.medium,
    height: '100%',
    ...(isWeb ? ({ outlineStyle: 'none' } as any) : {}),
  };

  const labelStyle: TextStyle = {
    color: theme.colors.textPrimary,
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
    marginBottom: spacing.xs,
    letterSpacing: 0.2,
  };

  const errorStyle: TextStyle = {
    color: theme.colors.danger,
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.medium,
    marginTop: spacing.xs,
  };

  return (
    <View style={[{ marginBottom: spacing.md, minWidth: 0 }, containerStyle]}>
      {label && <Text style={labelStyle}>{label}</Text>}
      <View style={wrapperStyle}>
        {leftIcon}
        <TextInput
          placeholderTextColor={theme.colors.textMuted}
          style={[inputStyle, style]}
          onFocus={(e) => {
            setIsFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            onBlur?.(e);
          }}
          {...props}
        />
        {rightIcon}
      </View>
      {error && <Text style={errorStyle}>{error}</Text>}
    </View>
  );
};
