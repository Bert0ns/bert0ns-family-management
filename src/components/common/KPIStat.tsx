import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { useTheme } from '@/theme';
import { Card } from './Card';

interface KPIStatProps {
  title: string;
  value: string;
  subtitle?: string;
  icon?: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'brand';
  progress?: number; // 0 - 100
  style?: ViewStyle;
}

export const KPIStat: React.FC<KPIStatProps> = ({
  title,
  value,
  subtitle,
  icon,
  variant = 'default',
  progress,
  style,
}) => {
  const { theme, spacing, radius, typography } = useTheme();

  const getAccentColor = () => {
    switch (variant) {
      case 'success':
        return theme.colors.success;
      case 'warning':
        return theme.colors.warning;
      case 'danger':
        return theme.colors.danger;
      case 'brand':
        return theme.colors.brand;
      default:
        return theme.colors.textPrimary;
    }
  };

  const getBgColor = () => {
    switch (variant) {
      case 'success':
        return theme.colors.successBg;
      case 'warning':
        return theme.colors.warningBg;
      case 'danger':
        return theme.colors.dangerBg;
      case 'brand':
        return theme.colors.brandLight;
      default:
        return theme.colors.surfaceSubtle;
    }
  };

  const accent = getAccentColor();

  return (
    <Card style={[{ flex: 1, minWidth: 150 }, style]} padding="md">
      <View
        style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}
      >
        <Text
          style={{
            color: theme.colors.textSecondary,
            fontSize: typography.fontSizes.sm,
            fontWeight: typography.fontWeights.medium,
          }}
        >
          {title}
        </Text>
        {icon && (
          <View
            style={{
              padding: spacing.xs,
              borderRadius: radius.md,
              backgroundColor: getBgColor(),
            }}
          >
            {icon}
          </View>
        )}
      </View>

      <Text
        style={{
          color: theme.colors.textPrimary,
          fontSize: typography.fontSizes.xxl,
          fontWeight: typography.fontWeights.bold,
          marginTop: spacing.xs,
        }}
      >
        {value}
      </Text>

      {subtitle && (
        <Text
          style={{
            color: accent,
            fontSize: typography.fontSizes.xs,
            fontWeight: typography.fontWeights.medium,
            marginTop: spacing.xxs,
          }}
        >
          {subtitle}
        </Text>
      )}

      {progress !== undefined && (
        <View
          style={{
            height: 6,
            backgroundColor: theme.colors.surfaceSubtle,
            borderRadius: radius.full,
            marginTop: spacing.sm,
            overflow: 'hidden',
          }}
        >
          <View
            style={{
              height: '100%',
              width: `${Math.min(progress, 100)}%`,
              backgroundColor: progress > 100 ? theme.colors.danger : accent,
              borderRadius: radius.full,
            }}
          />
        </View>
      )}
    </Card>
  );
};
