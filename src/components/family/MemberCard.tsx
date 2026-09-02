import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ShieldCheck, User } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { FamilyMember } from '@/types';
import { Avatar } from '@/components/common/Avatar';
import { Badge } from '@/components/common/Badge';
import { Card } from '@/components/common/Card';

interface MemberCardProps {
  member: FamilyMember;
  totalSpent: number;
  transactionCount: number;
  currency?: string;
  isCurrentUser?: boolean;
  onSelect?: () => void;
}

export const MemberCard: React.FC<MemberCardProps> = ({
  member,
  totalSpent,
  transactionCount,
  currency = '€',
  isCurrentUser = false,
  onSelect,
}) => {
  const { theme, spacing, radius, typography } = useTheme();

  return (
    <Card padding="md" style={{ marginBottom: spacing.sm }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, flex: 1 }}>
          <Avatar
            name={member.display_name}
            avatarUrl={member.avatar_url}
            colorCode={member.color_code}
            size="lg"
          />

          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
              <Text
                style={{
                  color: theme.colors.textPrimary,
                  fontSize: typography.fontSizes.md,
                  fontWeight: typography.fontWeights.bold,
                }}
              >
                {member.display_name}
              </Text>
              {isCurrentUser && <Badge label="You" color={theme.colors.brand} size="sm" />}
            </View>

            <View
              style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: 2 }}
            >
              <Badge
                label={member.role}
                color={member.role === 'ADMIN' ? theme.colors.brand : theme.colors.textSecondary}
                size="sm"
                variant="subtle"
                icon={
                  member.role === 'ADMIN' ? (
                    <ShieldCheck size={12} color={theme.colors.brand} />
                  ) : (
                    <User size={12} color={theme.colors.textSecondary} />
                  )
                }
              />
              <Text style={{ color: theme.colors.textMuted, fontSize: typography.fontSizes.xs }}>
                {transactionCount} transactions
              </Text>
            </View>
          </View>
        </View>

        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ color: theme.colors.textSecondary, fontSize: typography.fontSizes.xs }}>
            Total Spend
          </Text>
          <Text
            style={{
              color: theme.colors.textPrimary,
              fontSize: typography.fontSizes.lg,
              fontWeight: typography.fontWeights.bold,
            }}
          >
            {currency}
            {totalSpent.toFixed(2)}
          </Text>
        </View>
      </View>
    </Card>
  );
};
