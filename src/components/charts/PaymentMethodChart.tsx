import React from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '@/theme';
import { useI18n } from '@/i18n';
import { PaymentMethodSummary } from '@/services/interfaces';
import { Card } from '@/components/common/Card';
import { CreditCard, Landmark, Banknote, Wallet } from 'lucide-react-native';

interface PaymentMethodChartProps {
  data: PaymentMethodSummary[];
  currency?: string;
}

export const PaymentMethodChart: React.FC<PaymentMethodChartProps> = ({ data, currency = '€' }) => {
  const { theme, spacing, radius, typography } = useTheme();
  const { t } = useI18n();

  if (!data || data.length === 0) {
    return (
      <Card padding="lg">
        <View style={{ alignItems: 'center', paddingVertical: spacing.lg }}>
          <Text style={{ color: theme.colors.textSecondary, fontSize: typography.fontSizes.sm }}>
            {t.analytics.noPaymentMethodData}
          </Text>
        </View>
      </Card>
    );
  }

  const getMethodName = (method: string): string => {
    switch (method) {
      case 'credit_card':
        return t.paymentMethods.creditCard;
      case 'debit_card':
        return t.paymentMethods.debitCard;
      case 'cash':
        return t.paymentMethods.cash;
      case 'bank_transfer':
        return t.paymentMethods.bankTransfer;
      case 'other':
      default:
        return t.paymentMethods.other;
    }
  };

  const getMethodIcon = (method: string, color: string) => {
    const size = 16;
    switch (method) {
      case 'credit_card':
      case 'debit_card':
        return <CreditCard size={size} color={color} />;
      case 'bank_transfer':
        return <Landmark size={size} color={color} />;
      case 'cash':
        return <Banknote size={size} color={color} />;
      case 'other':
      default:
        return <Wallet size={size} color={color} />;
    }
  };

  return (
    <Card padding="lg">
      {/* Header */}
      <View style={{ marginBottom: spacing.md }}>
        <Text
          style={{
            color: theme.colors.textPrimary,
            fontSize: typography.fontSizes.lg,
            fontWeight: typography.fontWeights.heavy,
          }}
        >
          {t.analytics.paymentMethodsTitle}
        </Text>
        <Text
          style={{
            color: theme.colors.textSecondary,
            fontSize: typography.fontSizes.xs,
            marginTop: 2,
          }}
        >
          {t.analytics.paymentMethodsSubtitle}
        </Text>
      </View>

      {/* Segmented Distribution Bar */}
      <View
        style={{
          height: 12,
          width: '100%',
          backgroundColor: theme.colors.surfaceSubtle,
          borderRadius: radius.xs,
          flexDirection: 'row',
          overflow: 'hidden',
          marginBottom: spacing.md,
        }}
      >
        {data.map((item) => (
          <View
            key={item.method}
            style={{
              width: `${Math.max(item.percentage, 0.5)}%`,
              backgroundColor: item.color,
            }}
          />
        ))}
      </View>

      {/* Payment Method Rows */}
      <View style={{ gap: spacing.sm }}>
        {data.map((item) => (
          <View
            key={item.method}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: theme.colors.surfaceSubtle,
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.sm,
              borderRadius: radius.md,
              borderWidth: 1,
              borderColor: theme.colors.border,
            }}
          >
            {/* Left: Icon & Name */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 }}>
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: radius.sm,
                  backgroundColor: `${item.color}20`,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {getMethodIcon(item.method, item.color)}
              </View>

              <View>
                <Text
                  style={{
                    color: theme.colors.textPrimary,
                    fontSize: typography.fontSizes.sm,
                    fontWeight: typography.fontWeights.bold,
                  }}
                >
                  {getMethodName(item.method)}
                </Text>
                <Text
                  style={{
                    color: theme.colors.textSecondary,
                    fontSize: 11,
                  }}
                >
                  {item.transactionCount} {t.dashboard.txs}, {t.analytics.avgTransaction}:{' '}
                  {currency}
                  {item.averageTransaction.toFixed(0)}
                </Text>
              </View>
            </View>

            {/* Right: Amount & Share */}
            <View style={{ alignItems: 'flex-end' }}>
              <Text
                style={{
                  color: theme.colors.textPrimary,
                  fontSize: typography.fontSizes.sm,
                  fontWeight: typography.fontWeights.heavy,
                }}
              >
                {currency}
                {item.totalAmount.toFixed(2)}
              </Text>
              <Text
                style={{
                  color: theme.colors.textSecondary,
                  fontSize: 11,
                  fontWeight: typography.fontWeights.semibold,
                }}
              >
                {item.percentage.toFixed(1)}%
              </Text>
            </View>
          </View>
        ))}
      </View>
    </Card>
  );
};
