import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Users, Check, Split } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { FamilyMember, ExpenseSplit } from '@/types';
import { calculateEqualSplits } from '@/services/splitCalculator';
import { Avatar } from '@/components/common/Avatar';
import { Badge } from '@/components/common/Badge';

interface SplitCalculatorProps {
  totalAmount: number;
  members: FamilyMember[];
  currency?: string;
  initialSplits?: ExpenseSplit[];
  onSplitsChange: (splits: ExpenseSplit[] | undefined) => void;
}

export const SplitCalculator: React.FC<SplitCalculatorProps> = ({
  totalAmount,
  members,
  currency = '€',
  initialSplits,
  onSplitsChange,
}) => {
  const { theme, spacing, radius, typography } = useTheme();

  const [isSplitEnabled, setIsSplitEnabled] = useState<boolean>(
    initialSplits && initialSplits.length > 0 ? true : false,
  );

  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>(
    initialSplits && initialSplits.length > 0
      ? initialSplits.map((s) => s.member_id)
      : members.map((m) => m.id),
  );

  useEffect(() => {
    if (!isSplitEnabled || selectedMemberIds.length === 0 || totalAmount <= 0) {
      onSplitsChange(undefined);
      return;
    }

    const splits = calculateEqualSplits(totalAmount, selectedMemberIds);
    onSplitsChange(splits.length > 0 ? splits : undefined);
  }, [isSplitEnabled, selectedMemberIds, totalAmount]);

  const toggleMember = (memberId: string) => {
    if (selectedMemberIds.includes(memberId)) {
      if (selectedMemberIds.length > 1) {
        setSelectedMemberIds(selectedMemberIds.filter((id) => id !== memberId));
      }
    } else {
      setSelectedMemberIds([...selectedMemberIds, memberId]);
    }
  };

  const perMemberShare =
    selectedMemberIds.length > 0 && totalAmount > 0 ? totalAmount / selectedMemberIds.length : 0;

  return (
    <View
      style={{
        backgroundColor: theme.colors.surfaceSubtle,
        borderRadius: radius.lg,
        padding: spacing.md,
        marginVertical: spacing.md,
      }}
    >
      {/* Split Toggle Header */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: isSplitEnabled ? spacing.md : 0,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
          <Split size={18} color={theme.colors.brand} />
          <Text
            style={{
              color: theme.colors.textPrimary,
              fontSize: typography.fontSizes.sm,
              fontWeight: typography.fontWeights.bold,
            }}
          >
            Split this Expense
          </Text>
        </View>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => setIsSplitEnabled(!isSplitEnabled)}
          style={{
            paddingVertical: 4,
            paddingHorizontal: spacing.md,
            borderRadius: radius.full,
            backgroundColor: isSplitEnabled ? theme.colors.brand : theme.colors.surface,
            borderWidth: 1,
            borderColor: isSplitEnabled ? theme.colors.brand : theme.colors.border,
          }}
        >
          <Text
            style={{
              color: isSplitEnabled ? '#FFFFFF' : theme.colors.textSecondary,
              fontSize: typography.fontSizes.xs,
              fontWeight: typography.fontWeights.semibold,
            }}
          >
            {isSplitEnabled ? 'Enabled' : 'Disabled'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Member Selector and Split Preview */}
      {isSplitEnabled && (
        <View style={{ gap: spacing.sm }}>
          <Text style={{ color: theme.colors.textSecondary, fontSize: typography.fontSizes.xs }}>
            Select members sharing this cost ({selectedMemberIds.length} of {members.length}):
          </Text>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
            {members.map((m) => {
              const isSelected = selectedMemberIds.includes(m.id);
              return (
                <TouchableOpacity
                  key={m.id}
                  activeOpacity={0.7}
                  onPress={() => toggleMember(m.id)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: spacing.xs,
                    paddingHorizontal: spacing.sm,
                    borderRadius: radius.md,
                    backgroundColor: isSelected ? theme.colors.brandLight : theme.colors.surface,
                    borderWidth: 1.5,
                    borderColor: isSelected ? theme.colors.brand : theme.colors.border,
                    gap: 6,
                  }}
                >
                  <Avatar
                    name={m.display_name}
                    avatarUrl={m.avatar_url}
                    colorCode={m.color_code}
                    size="sm"
                  />
                  <Text
                    style={{
                      color: isSelected ? theme.colors.brand : theme.colors.textPrimary,
                      fontSize: typography.fontSizes.xs,
                      fontWeight: isSelected
                        ? typography.fontWeights.bold
                        : typography.fontWeights.medium,
                    }}
                  >
                    {m.display_name}
                  </Text>
                  {isSelected && <Check size={14} color={theme.colors.brand} />}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Share summary pill */}
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: theme.colors.surface,
              padding: spacing.sm,
              borderRadius: radius.md,
              marginTop: spacing.xs,
            }}
          >
            <Text style={{ color: theme.colors.textSecondary, fontSize: typography.fontSizes.xs }}>
              Each member owes:
            </Text>
            <Text
              style={{
                color: theme.colors.brand,
                fontSize: typography.fontSizes.md,
                fontWeight: typography.fontWeights.bold,
              }}
            >
              {currency}
              {perMemberShare.toFixed(2)}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
};
