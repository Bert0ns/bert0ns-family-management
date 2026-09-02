import React from 'react';
import { View, Text, ViewStyle } from 'react-native';
import { useTheme } from '@/theme';
import { Card } from './Card';

type KPIVariant = 'default' | 'success' | 'warning' | 'danger' | 'brand';

interface KPIStatProps {
  title: string;
  value: string;
  subtitle?: string;
  icon?: React.ReactNode;
  variant?: KPIVariant;
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

  const variantColors: Record<KPIVariant, { accent: string; bg: string }> = {
    success: { accent: theme.colors.success, bg: theme.colors.successBg },
    warning: { accent: theme.colors.warning, bg: theme.colors.warningBg },
    danger: { accent: theme.colors.danger, bg: theme.colors.dangerBg },
    brand: { accent: theme.colors.brand, bg: theme.colors.brandLight },
    default: { accent: theme.colors.textPrimary, bg: theme.colors.surfaceSubtle },
  };

  const { accent, bg } = variantColors[variant] || variantColors.default;

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
              backgroundColor: bg,
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
