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

  const webGlass: ViewStyle = isWeb
    ? ({
        boxShadow: isFocused
          ? `0 0 0 2px ${theme.colors.brandLight}`
          : theme.isDark
            ? 'none'
            : '0 1px 2px rgba(0, 0, 0, 0.02)',
      } as unknown as ViewStyle)
    : {};

  const getBorderColor = () => {
    if (error) return theme.colors.danger;
    if (isFocused) return theme.colors.brand;
    return theme.colors.borderTactile;
  };

  const wrapperStyle: ViewStyle = {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.inputBg,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: getBorderColor(),
    paddingHorizontal: spacing.md,
    minHeight: 52,
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
    ...(isWeb ? ({ outlineStyle: 'none' } as unknown as TextStyle) : {}),
  };

  const labelStyle: TextStyle = {
    color: theme.colors.textPrimary,
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold,
    marginBottom: spacing.xs,
    letterSpacing: 0.1,
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
          accessibilityLabel={props.accessibilityLabel || label || props.placeholder}
          accessibilityState={{
            disabled: props.editable === false,
            ...props.accessibilityState,
          }}
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
