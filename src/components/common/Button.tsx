import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  StyleProp,
  Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/theme';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  title?: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: React.ReactNode;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  fullWidth?: boolean;
  accessibilityLabel?: string;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  loading = false,
  disabled = false,
  style,
  textStyle,
  fullWidth = false,
  accessibilityLabel,
}) => {
  const { theme, spacing, radius, typography } = useTheme();

  const handlePress = () => {
    if (disabled || loading) return;
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {}
    }
    onPress();
  };

  const bgMap: Record<ButtonVariant, string> = {
    primary: theme.colors.brand,
    secondary: theme.colors.brandLight,
    danger: theme.colors.danger,
    outline: 'transparent',
    ghost: 'transparent',
  };

  const textColorMap: Record<ButtonVariant, string> = {
    primary: '#FFFFFF',
    secondary: theme.colors.brand,
    danger: '#FFFFFF',
    outline: theme.colors.textPrimary,
    ghost: theme.colors.textSecondary,
  };

  const isIconOnly = !title && Boolean(icon);

  const iconOnlyDimensionMap: Record<ButtonSize, number> = {
    sm: 36,
    md: 42,
    lg: 48,
  };

  const sizePaddingMap: Record<ButtonSize, { paddingVertical: number; paddingHorizontal: number }> =
    {
      sm: { paddingVertical: spacing.xs, paddingHorizontal: spacing.md },
      md: { paddingVertical: spacing.sm + 2, paddingHorizontal: spacing.lg },
      lg: { paddingVertical: spacing.md, paddingHorizontal: spacing.xl },
    };

  const sizeFontMap: Record<ButtonSize, number> = {
    sm: typography.fontSizes.sm,
    md: typography.fontSizes.md,
    lg: typography.fontSizes.lg,
  };

  const bgColor = disabled ? theme.colors.surfaceSubtle : bgMap[variant] || theme.colors.brand;
  const textColor = disabled ? theme.colors.textMuted : textColorMap[variant] || '#FFFFFF';
  const padding = isIconOnly ? { padding: 0 } : sizePaddingMap[size] || sizePaddingMap.md;

  const isOutline = variant === 'outline';

  const buttonStyle: ViewStyle = {
    backgroundColor: bgColor,
    borderRadius: isIconOnly ? radius.md : radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    ...(isIconOnly
      ? {
          width: iconOnlyDimensionMap[size],
          height: iconOnlyDimensionMap[size],
        }
      : padding),
    borderWidth: isOutline ? 1 : 0,
    borderColor: isOutline ? theme.colors.border : 'transparent',
    alignSelf: fullWidth ? 'stretch' : 'auto',
    opacity: disabled ? 0.6 : 1,
    gap: title && icon ? spacing.sm : 0,
  };

  const labelStyle: TextStyle = {
    color: textColor,
    fontSize: sizeFontMap[size] || typography.fontSizes.md,
    fontWeight: typography.fontWeights.semibold,
  };

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={handlePress}
      style={[buttonStyle, style]}
      disabled={disabled || loading}
      accessibilityLabel={accessibilityLabel || title}
    >
      {loading ? (
        <ActivityIndicator size="small" color={textColor} />
      ) : (
        <>
          {icon}
          {title ? <Text style={[labelStyle, textStyle]}>{title}</Text> : null}
        </>
      )}
    </TouchableOpacity>
  );
};
