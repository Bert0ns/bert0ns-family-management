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
    secondary: theme.isDark ? theme.colors.surfaceContainerHigh : theme.colors.surfaceSubtle,
    danger: theme.colors.danger,
    outline: 'transparent',
    ghost: 'transparent',
  };

  const textColorMap: Record<ButtonVariant, string> = {
    primary: '#FFFFFF',
    secondary: theme.colors.textPrimary,
    danger: '#FFFFFF',
    outline: theme.colors.textPrimary,
    ghost: theme.colors.textSecondary,
  };

  const isIconOnly = !title && Boolean(icon);

  const iconOnlyDimensionMap: Record<ButtonSize, number> = {
    sm: 44,
    md: 52,
    lg: 60,
  };

  const sizeHeightMap: Record<ButtonSize, number> = {
    sm: 44,
    md: 52,
    lg: 60,
  };

  const sizePaddingMap: Record<ButtonSize, { paddingHorizontal: number }> = {
    sm: { paddingHorizontal: spacing.sm + 4 },
    md: { paddingHorizontal: spacing.md },
    lg: { paddingHorizontal: spacing.lg },
  };

  const sizeFontMap: Record<ButtonSize, number> = {
    sm: typography.fontSizes.sm,
    md: typography.fontSizes.md,
    lg: typography.fontSizes.lg,
  };

  const bgColor = disabled ? theme.colors.surfaceSubtle : bgMap[variant] || theme.colors.brand;
  const textColor = disabled ? theme.colors.textMuted : textColorMap[variant] || '#FFFFFF';
  const padding = isIconOnly ? { paddingHorizontal: 0 } : sizePaddingMap[size] || sizePaddingMap.md;

  const isOutline = variant === 'outline';
  const isSecondary = variant === 'secondary';

  const isWeb = Platform.OS === 'web';
  const webTactileStyle = isWeb
    ? ({
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
        boxShadow:
          variant === 'primary' && !disabled
            ? theme.isDark
              ? '0 4px 16px rgba(16, 185, 129, 0.28), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
              : '0 4px 16px rgba(5, 150, 105, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.3)'
            : variant === 'danger' && !disabled
              ? '0 4px 16px rgba(244, 63, 94, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
              : undefined,
      } as any)
    : {};

  const buttonStyle: ViewStyle = {
    backgroundColor: bgColor,
    borderRadius: radius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: sizeHeightMap[size],
    ...(isIconOnly
      ? {
          width: iconOnlyDimensionMap[size],
          height: iconOnlyDimensionMap[size],
        }
      : padding),
    borderWidth:
      isOutline || isSecondary ? 1.5 : variant === 'primary' || variant === 'danger' ? 1 : 0,
    borderColor:
      isOutline || isSecondary
        ? theme.colors.borderTactile
        : variant === 'primary' || variant === 'danger'
          ? theme.isDark
            ? 'rgba(255, 255, 255, 0.16)'
            : 'rgba(0, 0, 0, 0.08)'
          : 'transparent',
    alignSelf: fullWidth ? 'stretch' : 'auto',
    opacity: disabled ? 0.55 : 1,
    gap: title && icon ? spacing.xs + 2 : 0,
    ...webTactileStyle,
  };

  const labelStyle: TextStyle = {
    color: textColor,
    fontSize: sizeFontMap[size] || typography.fontSizes.md,
    fontWeight: typography.fontWeights.bold,
    letterSpacing: 0.2,
    flexShrink: 1,
  };

  return (
    <TouchableOpacity
      activeOpacity={0.8}
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
          {title ? (
            <Text
              style={[labelStyle, textStyle]}
              numberOfLines={1}
              ellipsizeMode="tail"
              adjustsFontSizeToFit
              minimumFontScale={0.85}
            >
              {title}
            </Text>
          ) : null}
        </>
      )}
    </TouchableOpacity>
  );
};
