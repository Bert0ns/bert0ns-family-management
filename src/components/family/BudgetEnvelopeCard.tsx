import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/theme';
import { Category, Budget } from '@/types';
import { IconHelper } from '@/components/common/IconHelper';
import { Card } from '@/components/common/Card';

interface BudgetEnvelopeCardProps {
  category: Category;
  budget?: Budget;
  actualSpend: number;
  currency?: string;
}

export const BudgetEnvelopeCard: React.FC<BudgetEnvelopeCardProps> = ({
  category,
  budget,
  actualSpend,
  currency = '€',
}) => {
  const { theme, spacing, radius, typography } = useTheme();

  const limit = budget?.monthly_limit || 0;
  const progressPercent = limit > 0 ? (actualSpend / limit) * 100 : 0;
  const isOver = limit > 0 && actualSpend > limit;
  const remaining = limit - actualSpend;

  const getProgressColor = () => {
    if (isOver) return theme.colors.danger;
    if (progressPercent > 80) return theme.colors.warning;
    return theme.colors.success;
  };

  return (
    <Card padding="md" style={{ marginBottom: spacing.sm }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 }}>
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: radius.md,
              backgroundColor: `${category.color}20`,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <IconHelper name={category.icon} size={18} color={category.color} />
          </View>

          <View>
            <Text
              style={{
                color: theme.colors.textPrimary,
                fontSize: typography.fontSizes.md,
                fontWeight: typography.fontWeights.semibold,
              }}
            >
              {category.name}
            </Text>
            <Text style={{ color: theme.colors.textMuted, fontSize: typography.fontSizes.xs }}>
              Limit: {limit > 0 ? `${currency}${limit.toFixed(0)}` : 'No limit set'}
            </Text>
          </View>
        </View>

        <View style={{ alignItems: 'flex-end' }}>
          <Text
            style={{
              color: isOver ? theme.colors.danger : theme.colors.textPrimary,
              fontSize: typography.fontSizes.md,
              fontWeight: typography.fontWeights.bold,
            }}
          >
            {currency}
            {actualSpend.toFixed(2)}
          </Text>
          <Text
            style={{
              color: isOver ? theme.colors.danger : theme.colors.textSecondary,
              fontSize: typography.fontSizes.xs,
            }}
          >
            {limit > 0
              ? isOver
                ? `+${currency}${Math.abs(remaining).toFixed(0)} over`
                : `${currency}${remaining.toFixed(0)} left`
              : 'Tracked'}
          </Text>
        </View>
      </View>

      {limit > 0 && (
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
              width: `${Math.min(progressPercent, 100)}%`,
              backgroundColor: getProgressColor(),
              borderRadius: radius.full,
            }}
          />
        </View>
      )}
    </Card>
  );
};
