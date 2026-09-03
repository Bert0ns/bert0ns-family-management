import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, Platform } from 'react-native';
import { UserCog, Check, ShieldCheck, User, Eye, Trash2 } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { useI18n } from '@/i18n';
import { FamilyMember, UserRole, Expense } from '@/types';
import { Input } from '@/components/common/Input';
import { FormModal } from '@/components/common/FormModal';
import { Button } from '@/components/common/Button';

interface EditMemberModalProps {
  visible: boolean;
  member: FamilyMember | null;
  expenses: Expense[];
  isOnlyMember: boolean;
  currency?: string;
  onClose: () => void;
  onSave: (updates: { display_name: string; role: UserRole; color_code: string }) => void;
  onDelete: (memberId: string) => void;
}

export const EditMemberModal: React.FC<EditMemberModalProps> = ({
  visible,
  member,
  expenses,
  isOnlyMember,
  currency = '€',
  onClose,
  onSave,
  onDelete,
}) => {
  const { theme, spacing, radius, typography, memberColors } = useTheme();
  const { t } = useI18n();

  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>('MEMBER');
  const [colorCode, setColorCode] = useState(memberColors[0].bg);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (member) {
      setName(member.display_name);
      setRole(member.role);
      setColorCode(member.color_code || memberColors[0].bg);
      setError(null);
    }
  }, [member]);

  if (!member) return null;

  const memberExpenses = expenses.filter((e) => e.paid_by_member_id === member.id);
  const totalSpent = memberExpenses.reduce((sum, e) => sum + e.amount, 0);

  const splitInvolvements = expenses.filter(
    (e) => e.paid_by_member_id !== member.id && e.splits?.some((s) => s.member_id === member.id),
  ).length;

  const handleSave = () => {
    if (!name.trim()) {
      setError(t.family.memberNamePlaceholder);
      return;
    }
    setError(null);
    onSave({
      display_name: name.trim(),
      role,
      color_code: colorCode,
    });
    onClose();
  };

  const handleDelete = () => {
    if (isOnlyMember) {
      Alert.alert(t.family.deleteMember, t.family.cannotDeleteLastMember);
      return;
    }

    const confirmMessage = `${t.family.deleteMemberConfirmMessage}\n\n• ${memberExpenses.length} transactions (${currency}${totalSpent.toFixed(2)})\n• ${splitInvolvements} split shares`;

    if (Platform.OS === 'web') {
      if (window.confirm(`${t.family.deleteMemberConfirmTitle}\n\n${confirmMessage}`)) {
        onDelete(member.id);
        onClose();
      }
    } else {
      Alert.alert(t.family.deleteMemberConfirmTitle, confirmMessage, [
        { text: t.common.cancel, style: 'cancel' },
        {
          text: t.family.deleteMember,
          style: 'destructive',
          onPress: () => {
            onDelete(member.id);
            onClose();
          },
        },
      ]);
    }
  };

  const roleOptions: Array<{ role: UserRole; title: string; desc: string; icon: typeof User }> = [
    {
      role: 'ADMIN',
      title: t.family.roleAdmin,
      desc: t.family.roleAdminDesc,
      icon: ShieldCheck,
    },
    {
      role: 'MEMBER',
      title: t.family.roleMember,
      desc: t.family.roleMemberDesc,
      icon: User,
    },
    {
      role: 'VIEWER',
      title: t.family.roleViewer,
      desc: t.family.roleViewerDesc,
      icon: Eye,
    },
  ];

  return (
    <FormModal
      visible={visible}
      title={t.family.editMemberTitle}
      icon={<UserCog size={20} color={theme.colors.brand} />}
      onClose={onClose}
      onSubmit={handleSave}
      submitTitle={t.family.saveMember}
      cancelTitle={t.common.cancel}
    >
      {/* Name input */}
      <Input
        label={t.family.memberNameLabel}
        placeholder={t.family.memberNamePlaceholder}
        value={name}
        onChangeText={(text) => {
          setName(text);
          if (error) setError(null);
        }}
        error={error || undefined}
      />

      {/* Permissions / Role Selection */}
      <View style={{ marginBottom: spacing.md }}>
        <Text
          style={{
            color: theme.colors.textSecondary,
            fontSize: typography.fontSizes.sm,
            fontWeight: typography.fontWeights.medium,
            marginBottom: spacing.xs,
          }}
        >
          {t.family.permissionsTitle}
        </Text>

        <View style={{ gap: spacing.xs }}>
          {roleOptions.map((opt) => {
            const isSelected = role === opt.role;
            const Icon = opt.icon;
            return (
              <TouchableOpacity
                key={opt.role}
                onPress={() => setRole(opt.role)}
                activeOpacity={0.7}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  padding: spacing.md,
                  borderRadius: radius.md,
                  backgroundColor: isSelected
                    ? theme.colors.brandLight
                    : theme.colors.surfaceSubtle,
                  borderWidth: 1.5,
                  borderColor: isSelected ? theme.colors.brand : theme.colors.border,
                  gap: spacing.sm,
                }}
              >
                <View
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: radius.full,
                    backgroundColor: isSelected ? `${theme.colors.brand}20` : theme.colors.surface,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Icon
                    size={18}
                    color={isSelected ? theme.colors.brand : theme.colors.textSecondary}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      color: isSelected ? theme.colors.brand : theme.colors.textPrimary,
                      fontSize: typography.fontSizes.sm,
                      fontWeight: isSelected
                        ? typography.fontWeights.bold
                        : typography.fontWeights.semibold,
                    }}
                  >
                    {opt.title}
                  </Text>
                  <Text
                    style={{
                      color: theme.colors.textMuted,
                      fontSize: typography.fontSizes.xs,
                      marginTop: 2,
                    }}
                  >
                    {opt.desc}
                  </Text>
                </View>

                {isSelected && <Check size={18} color={theme.colors.brand} />}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Color Selection */}
      <View style={{ marginBottom: spacing.lg }}>
        <Text
          style={{
            color: theme.colors.textSecondary,
            fontSize: typography.fontSizes.sm,
            fontWeight: typography.fontWeights.medium,
            marginBottom: spacing.xs,
          }}
        >
          {t.family.memberColorLabel}
        </Text>
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          {memberColors.map((mc) => {
            const isSelected = colorCode === mc.bg;
            return (
              <TouchableOpacity
                key={mc.name}
                onPress={() => setColorCode(mc.bg)}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: radius.full,
                  backgroundColor: mc.bg,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: isSelected ? 3 : 0,
                  borderColor: theme.colors.surface,
                }}
              >
                {isSelected && <Check size={18} color="#FFFFFF" />}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Related Data Overview & Danger Zone */}
      <View
        style={{
          borderTopWidth: 1,
          borderTopColor: theme.colors.border,
          paddingTop: spacing.md,
          marginTop: spacing.xs,
        }}
      >
        <View
          style={{
            backgroundColor: theme.colors.surfaceSubtle,
            padding: spacing.sm,
            borderRadius: radius.md,
            marginBottom: spacing.md,
          }}
        >
          <Text
            style={{
              color: theme.colors.textSecondary,
              fontSize: typography.fontSizes.xs,
            }}
          >
            Related Data: {memberExpenses.length} transactions ({currency}
            {totalSpent.toFixed(2)}), {splitInvolvements} split participations
          </Text>
        </View>

        {!isOnlyMember && (
          <Button
            title={t.family.deleteMember}
            variant="danger"
            icon={<Trash2 size={16} color="#FFFFFF" />}
            onPress={handleDelete}
            fullWidth
          />
        )}
      </View>
    </FormModal>
  );
};
