import React, { useCallback } from 'react';
import { View, Text, TouchableOpacity, Platform, type TextStyle } from 'react-native';
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
  onSelect?: ((member: FamilyMember) => void) | (() => void);
}

const TABULAR_NUMS: TextStyle =
  Platform.OS === 'web'
    ? ({ fontVariantNumeric: 'tabular-nums' } as unknown as TextStyle)
    : { fontVariant: ['tabular-nums'] };

export const MemberCard: React.FC<MemberCardProps> = React.memo(
  ({ member, totalSpent, transactionCount, currency = '€', isCurrentUser = false, onSelect }) => {
    const { theme, spacing, typography } = useTheme();
    const { t } = useI18n();

    const handlePress = useCallback(() => {
      onSelect?.(member);
    }, [onSelect, member]);

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
      <Card padding="md" style={{ marginBottom: spacing.sm, minHeight: 64 }}>
        <View
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.md,
              flex: 1,
              minWidth: 0,
              marginRight: spacing.sm,
            }}
          >
            <Avatar
              name={member.display_name}
              avatarUrl={member.avatar_url}
              colorCode={member.color_code}
              size="lg"
            />

            <View style={{ flex: 1, minWidth: 0 }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing.xs,
                }}
              >
                <Text
                  style={{
                    color: theme.colors.textPrimary,
                    fontSize: typography.fontSizes.md,
                    fontWeight: typography.fontWeights.bold,
                    flexShrink: 1,
                    minWidth: 0,
                  }}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {member.display_name}
                </Text>
                {isCurrentUser && (
                  <View style={{ flexShrink: 0 }}>
                    <Badge label={t.family.currentUser} color={theme.colors.brand} size="sm" />
                  </View>
                )}
              </View>

              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing.xs,
                  marginTop: 4,
                }}
              >
                <Badge
                  label={getRoleLabel()}
                  color={getRoleBadgeColor()}
                  size="sm"
                  variant="subtle"
                  icon={getRoleIcon()}
                />
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, flexShrink: 0 }}>
                  <ReceiptText size={11} color={theme.colors.textMuted} />
                  <Text
                    style={[
                      { color: theme.colors.textMuted, fontSize: typography.fontSizes.xs },
                      TABULAR_NUMS,
                    ]}
                  >
                    {transactionCount}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          <View
            style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexShrink: 0 }}
          >
            <View style={{ alignItems: 'flex-end', flexShrink: 0 }}>
              <Text
                style={[
                  {
                    color: theme.colors.textPrimary,
                    fontSize: typography.fontSizes.lg,
                    fontWeight: typography.fontWeights.heavy,
                  },
                  TABULAR_NUMS,
                ]}
                numberOfLines={1}
              >
                {currency}
                {totalSpent.toFixed(2)}
              </Text>
            </View>
            {onSelect && (
              <ChevronRight size={16} color={theme.colors.textMuted} style={{ flexShrink: 0 }} />
            )}
          </View>
        </View>
      </Card>
    );

    if (onSelect) {
      return (
        <TouchableOpacity activeOpacity={0.7} onPress={handlePress}>
          {content}
        </TouchableOpacity>
      );
    }

    return content;
  },
);

MemberCard.displayName = 'MemberCard';
