import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { ShieldCheck, User, Eye, ChevronRight, ReceiptText } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { useI18n } from '@/i18n';
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
  const { theme, spacing, typography } = useTheme();
  const { t } = useI18n();

  const getRoleIcon = () => {
    switch (member.role) {
      case 'ADMIN':
        return <ShieldCheck size={12} color={theme.colors.brand} />;
      case 'VIEWER':
        return <Eye size={12} color={theme.colors.textSecondary} />;
      case 'MEMBER':
      default:
        return <User size={12} color={theme.colors.textSecondary} />;
    }
  };

  const getRoleBadgeColor = () => {
    switch (member.role) {
      case 'ADMIN':
        return theme.colors.brand;
      case 'VIEWER':
        return theme.colors.textMuted;
      case 'MEMBER':
      default:
        return theme.colors.textSecondary;
    }
  };

  const getRoleLabel = () => {
    switch (member.role) {
      case 'ADMIN':
        return t.family.roleAdmin;
      case 'VIEWER':
        return t.family.roleViewer;
      case 'MEMBER':
      default:
        return t.family.roleMember;
    }
  };

  const content = (
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
              {isCurrentUser && <Badge label={t.family.currentUser} color={theme.colors.brand} size="sm" />}
            </View>

            <View
              style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: 4 }}
            >
              <Badge
                label={getRoleLabel()}
                color={getRoleBadgeColor()}
                size="sm"
                variant="subtle"
                icon={getRoleIcon()}
              />
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                <ReceiptText size={11} color={theme.colors.textMuted} />
                <Text style={{ color: theme.colors.textMuted, fontSize: typography.fontSizes.xs }}>
                  {transactionCount}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <View style={{ alignItems: 'flex-end' }}>
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
          {onSelect && <ChevronRight size={16} color={theme.colors.textMuted} />}
        </View>
      </View>
    </Card>
  );

  if (onSelect) {
    return (
      <TouchableOpacity activeOpacity={0.7} onPress={onSelect}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
};
