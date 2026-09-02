import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  StyleProp,
  Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/theme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  fullWidth?: boolean;
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
}) => {
  const { theme, spacing, radius, typography } = useTheme();

  const handlePress = () => {
    if (disabled || loading) return;
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch (e) {}
    }
    onPress();
  };

  const getButtonBg = () => {
    if (disabled) return theme.colors.surfaceSubtle;
    switch (variant) {
      case 'primary':
        return theme.colors.brand;
      case 'secondary':
        return theme.colors.brandLight;
      case 'danger':
        return theme.colors.danger;
      case 'outline':
      case 'ghost':
        return 'transparent';
      default:
        return theme.colors.brand;
    }
  };

  const getTextColor = () => {
    if (disabled) return theme.colors.textMuted;
    switch (variant) {
      case 'primary':
      case 'danger':
        return '#FFFFFF';
      case 'secondary':
        return theme.colors.brand;
      case 'outline':
        return theme.colors.textPrimary;
      case 'ghost':
        return theme.colors.textSecondary;
      default:
        return '#FFFFFF';
    }
  };

  const getPadding = () => {
    switch (size) {
      case 'sm':
        return { paddingVertical: spacing.xs, paddingHorizontal: spacing.md };
      case 'lg':
        return { paddingVertical: spacing.md, paddingHorizontal: spacing.xl };
      case 'md':
      default:
        return { paddingVertical: spacing.sm + 2, paddingHorizontal: spacing.lg };
    }
  };

  const getFontSize = () => {
    switch (size) {
      case 'sm':
        return typography.fontSizes.sm;
      case 'lg':
        return typography.fontSizes.lg;
      case 'md':
      default:
        return typography.fontSizes.md;
    }
  };

  const buttonStyle: ViewStyle = {
    backgroundColor: getButtonBg(),
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    ...getPadding(),
    borderWidth: variant === 'outline' ? 1 : 0,
    borderColor: variant === 'outline' ? theme.colors.border : 'transparent',
    alignSelf: fullWidth ? 'stretch' : 'auto',
    opacity: disabled ? 0.6 : 1,
    gap: spacing.sm,
  };

  const labelStyle: TextStyle = {
    color: getTextColor(),
    fontSize: getFontSize(),
    fontWeight: typography.fontWeights.semibold,
  };

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={handlePress}
      style={[buttonStyle, style]}
      disabled={disabled || loading}
    >
      {loading ? (
        <ActivityIndicator size="small" color={getTextColor()} />
      ) : (
        <>
          {icon}
          <Text style={[labelStyle, textStyle]}>{title}</Text>
        </>
      )}
    </TouchableOpacity>
  );
};
