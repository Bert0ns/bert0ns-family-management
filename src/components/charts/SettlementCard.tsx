import React from 'react';
import { View, Text, Platform, Alert } from 'react-native';
import { ArrowRight, CheckCircle2, Check } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { useI18n } from '@/i18n';
import { SettlementSummary, SettlementTransfer } from '@/services/splitCalculator';
import { Card } from '@/components/common/Card';
import { Avatar } from '@/components/common/Avatar';
import { Button } from '@/components/common/Button';
import { useAppStore } from '@/services/store';

interface SettlementCardProps {
  summary: SettlementSummary;
  currency?: string;
}

export const SettlementCard: React.FC<SettlementCardProps> = ({ summary, currency = '€' }) => {
  const { theme, spacing, radius, typography } = useTheme();
  const { t } = useI18n();
  const { recordSettlement } = useAppStore();

  const handleSettle = (transfer: SettlementTransfer) => {
    const confirmMsg = t.notifications.settleConfirmMessage
      .replace('{amount}', transfer.amount.toFixed(2))
      .replace('{from}', transfer.fromMember.display_name)
      .replace('{to}', transfer.toMember.display_name);

    const execute = () => {
      recordSettlement({
        from_member_id: transfer.fromMember.id,
        to_member_id: transfer.toMember.id,
        amount: transfer.amount,
        notes: `Settled ${currency}${transfer.amount.toFixed(2)} to ${transfer.toMember.display_name}`,
      });
      if (Platform.OS === 'web') {
        window.alert(t.notifications.settleSuccessToast);
      } else {
        Alert.alert(t.common.confirm, t.notifications.settleSuccessToast);
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm(`${t.notifications.settleConfirmTitle}\n\n${confirmMsg}`)) {
        execute();
      }
    } else {
      Alert.alert(t.notifications.settleConfirmTitle, confirmMsg, [
        { text: t.common.cancel, style: 'cancel' },
        { text: t.common.confirm, onPress: execute },
      ]);
    }
  };

  return (
    <Card padding="lg">
      <Text
        style={{
          color: theme.colors.textPrimary,
          fontSize: typography.fontSizes.lg,
          fontWeight: typography.fontWeights.heavy,
          marginBottom: spacing.xs,
        }}
      >
        {t.analytics.whoOwesWho}
      </Text>
      <Text
        style={{
          color: theme.colors.textSecondary,
          fontSize: typography.fontSizes.sm,
          marginBottom: spacing.lg,
        }}
      >
        {t.analytics.toSettleInstruction}
      </Text>

      {/* Transfers List or All Settled */}
      {summary.isBalanced ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.md,
            padding: spacing.lg,
            borderRadius: radius.xl,
            backgroundColor: 'rgba(16, 185, 129, 0.12)',
            borderWidth: 1.5,
            borderColor: '#10B981',
          }}
        >
          <CheckCircle2 size={32} color="#10B981" />
          <View style={{ flex: 1 }}>
            <Text
              style={{
                color: '#10B981',
                fontSize: typography.fontSizes.md,
                fontWeight: typography.fontWeights.heavy,
              }}
            >
              {t.analytics.allSettledUp}
            </Text>
          </View>
        </View>
      ) : (
        <View style={{ gap: spacing.md }}>
          {summary.transfers.map((transfer, idx) => (
            <View
              key={`${transfer.fromMember.id}_${transfer.toMember.id}_${idx}`}
              style={{
                backgroundColor: theme.colors.surfaceSubtle,
                borderRadius: radius.xl,
                borderWidth: 1.5,
                borderColor: theme.colors.border,
                padding: spacing.md,
              }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                {/* From Member */}
                <View style={{ alignItems: 'center', minWidth: 70 }}>
                  <Avatar
                    name={transfer.fromMember.display_name}
                    avatarUrl={transfer.fromMember.avatar_url}
                    colorCode={transfer.fromMember.color_code}
                    size="md"
                  />
                  <Text
                    style={{
                      color: theme.colors.textPrimary,
                      fontSize: typography.fontSizes.sm,
                      fontWeight: typography.fontWeights.bold,
                      marginTop: 4,
                    }}
                    numberOfLines={1}
                  >
                    {transfer.fromMember.display_name}
                  </Text>
                </View>

                {/* Transfer Arrow & Amount */}
                <View style={{ alignItems: 'center', flex: 1, paddingHorizontal: spacing.sm }}>
                  <View
                    style={{
                      backgroundColor: theme.colors.brandLight,
                      paddingHorizontal: spacing.md,
                      paddingVertical: spacing.xs,
                      borderRadius: radius.full,
                      marginBottom: 4,
                    }}
                  >
                    <Text
                      style={{
                        color: theme.colors.brand,
                        fontSize: typography.fontSizes.lg,
                        fontWeight: typography.fontWeights.heavy,
                      }}
                    >
                      {currency}
                      {transfer.amount.toFixed(2)}
                    </Text>
                  </View>
                  <ArrowRight size={22} color={theme.colors.brand} strokeWidth={2.5} />
                </View>

                {/* To Member */}
                <View style={{ alignItems: 'center', minWidth: 70 }}>
                  <Avatar
                    name={transfer.toMember.display_name}
                    avatarUrl={transfer.toMember.avatar_url}
                    colorCode={transfer.toMember.color_code}
                    size="md"
                  />
                  <Text
                    style={{
                      color: theme.colors.textPrimary,
                      fontSize: typography.fontSizes.sm,
                      fontWeight: typography.fontWeights.bold,
                      marginTop: 4,
                    }}
                    numberOfLines={1}
                  >
                    {transfer.toMember.display_name}
                  </Text>
                </View>
              </View>

              {/* Readable Plain-Language Sentence */}
              <View
                style={{
                  borderTopWidth: 1,
                  borderTopColor: theme.colors.border,
                  marginTop: spacing.md,
                  paddingTop: spacing.xs + 2,
                  alignItems: 'center',
                }}
              >
                <Text
                  style={{
                    color: theme.colors.textSecondary,
                    fontSize: typography.fontSizes.sm,
                    fontWeight: typography.fontWeights.medium,
                  }}
                >
                  <Text style={{ fontWeight: 'bold', color: theme.colors.textPrimary }}>
                    {transfer.fromMember.display_name}
                  </Text>{' '}
                  {t.analytics.owes}{' '}
                  <Text style={{ fontWeight: 'bold', color: theme.colors.brand }}>
                    {currency}
                    {transfer.amount.toFixed(2)}
                  </Text>{' '}
                  {t.analytics.to}{' '}
                  <Text style={{ fontWeight: 'bold', color: theme.colors.textPrimary }}>
                    {transfer.toMember.display_name}
                  </Text>
                </Text>
              </View>

              {/* Settle Debt Button */}
              <View style={{ marginTop: spacing.sm }}>
                <Button
                  title={`${t.notifications.settleUpButton} (${currency}${transfer.amount.toFixed(2)})`}
                  variant="primary"
                  size="sm"
                  icon={<Check size={14} color="#FFFFFF" />}
                  onPress={() => handleSettle(transfer)}
                  fullWidth
                />
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Member Balances Breakdown */}
      <View style={{ marginTop: spacing.xl }}>
        <Text
          style={{
            color: theme.colors.textPrimary,
            fontSize: typography.fontSizes.md,
            fontWeight: typography.fontWeights.bold,
            marginBottom: spacing.sm,
          }}
        >
          {t.analytics.balances}
        </Text>
        <View style={{ gap: spacing.xs }}>
          {summary.balances.map((b) => {
            const isPositive = b.net > 0.01;
            const isNegative = b.net < -0.01;
            const netColor = isPositive
              ? '#10B981'
              : isNegative
                ? theme.colors.danger
                : theme.colors.textMuted;

            return (
              <View
                key={b.member.id}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingVertical: spacing.sm,
                  paddingHorizontal: spacing.md,
                  backgroundColor: theme.colors.surfaceSubtle,
                  borderRadius: radius.md,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                  <Avatar
                    name={b.member.display_name}
                    avatarUrl={b.member.avatar_url}
                    colorCode={b.member.color_code}
                    size="sm"
                  />
                  <Text
                    style={{
                      color: theme.colors.textPrimary,
                      fontSize: typography.fontSizes.sm,
                      fontWeight: typography.fontWeights.bold,
                    }}
                  >
                    {b.member.display_name}
                  </Text>
                </View>

                <View style={{ alignItems: 'flex-end' }}>
                  <Text
                    style={{
                      color: netColor,
                      fontSize: typography.fontSizes.md,
                      fontWeight: typography.fontWeights.heavy,
                    }}
                  >
                    {isPositive ? '+' : ''}
                    {currency}
                    {b.net.toFixed(2)}
                  </Text>
                  <Text
                    style={{
                      color: theme.colors.textSecondary,
                      fontSize: typography.fontSizes.xs,
                    }}
                  >
                    {currency}
                    {b.paid.toFixed(0)} {t.analytics.paid} • {currency}
                    {b.share.toFixed(0)} {t.analytics.fairShare}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      </View>
    </Card>
  );
};
