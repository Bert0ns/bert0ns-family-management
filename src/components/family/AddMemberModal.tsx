import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { UserPlus, Check, Shield, User, Eye } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { useI18n } from '@/i18n';
import { UserRole } from '@/types';
import { Input } from '@/components/common/Input';
import { FormModal } from '@/components/common/FormModal';

interface AddMemberModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (memberData: { display_name: string; role: UserRole; color_code: string }) => void;
}

export const AddMemberModal: React.FC<AddMemberModalProps> = ({ visible, onClose, onSave }) => {
  const { theme, spacing, radius, typography, memberColors } = useTheme();
  const { t } = useI18n();

  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>('MEMBER');
  const [colorCode, setColorCode] = useState(memberColors[0].bg);
  const [error, setError] = useState<string | null>(null);

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
    setName('');
    onClose();
  };

  return (
    <FormModal
      visible={visible}
      title={t.family.addMemberTitle}
      icon={<UserPlus size={20} color={theme.colors.brand} />}
      onClose={onClose}
      onSubmit={handleSave}
      submitTitle={t.family.addMember}
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

      {/* Role Selection */}
      <View style={{ marginBottom: spacing.md }}>
        <Text
          style={{
            color: theme.colors.textSecondary,
            fontSize: typography.fontSizes.sm,
            fontWeight: typography.fontWeights.medium,
            marginBottom: spacing.xs,
          }}
        >
          {t.family.memberRoleLabel}
        </Text>
        <View style={{ flexDirection: 'row', gap: spacing.xs }}>
          {(['MEMBER', 'ADMIN', 'VIEWER'] as const).map((r) => {
            const isSelected = role === r;
            let label = t.family.roleMember;
            let IconComponent = User;
            if (r === 'ADMIN') {
              label = t.family.roleAdmin;
              IconComponent = Shield;
            } else if (r === 'VIEWER') {
              label = t.family.roleViewer;
              IconComponent = Eye;
            }

            return (
              <TouchableOpacity
                key={r}
                onPress={() => setRole(r)}
                style={{
                  flex: 1,
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingVertical: spacing.sm,
                  paddingHorizontal: spacing.xs,
                  borderRadius: radius.md,
                  backgroundColor: isSelected
                    ? theme.colors.brandLight
                    : theme.colors.surfaceSubtle,
                  borderWidth: 1.5,
                  borderColor: isSelected ? theme.colors.brand : theme.colors.border,
                  gap: 4,
                }}
              >
                <IconComponent
                  size={16}
                  color={isSelected ? theme.colors.brand : theme.colors.textSecondary}
                />
                <Text
                  numberOfLines={1}
                  style={{
                    color: isSelected ? theme.colors.brand : theme.colors.textPrimary,
                    fontSize: typography.fontSizes.xs,
                    fontWeight: isSelected
                      ? typography.fontWeights.bold
                      : typography.fontWeights.medium,
                  }}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Color Selection */}
      <View style={{ marginBottom: spacing.sm }}>
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
    </FormModal>
  );
};
