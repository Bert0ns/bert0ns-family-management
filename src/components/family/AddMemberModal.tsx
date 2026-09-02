import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { X, UserPlus, Check, Shield, User } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { UserRole } from '@/types';
import { Input } from '@/components/common/Input';
import { Button } from '@/components/common/Button';
import { Avatar } from '@/components/common/Avatar';

interface AddMemberModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (memberData: { display_name: string; role: UserRole; color_code: string }) => void;
}

export const AddMemberModal: React.FC<AddMemberModalProps> = ({ visible, onClose, onSave }) => {
  const { theme, spacing, radius, typography, memberColors } = useTheme();

  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>('MEMBER');
  const [colorCode, setColorCode] = useState(memberColors[0].bg);
  const [error, setError] = useState<string | null>(null);

  const handleSave = () => {
    if (!name.trim()) {
      setError('Member name is required');
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
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.5)',
          justifyContent: 'flex-end',
        }}
      >
        <View
          style={{
            backgroundColor: theme.colors.surface,
            borderTopLeftRadius: radius.xl,
            borderTopRightRadius: radius.xl,
            padding: spacing.xl,
          }}
        >
          {/* Header */}
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: spacing.lg,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
              <UserPlus size={20} color={theme.colors.brand} />
              <Text
                style={{
                  color: theme.colors.textPrimary,
                  fontSize: typography.fontSizes.xl,
                  fontWeight: typography.fontWeights.bold,
                }}
              >
                Add Family Member
              </Text>
            </View>

            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <X size={24} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Name input */}
          <Input
            label="Full Name / Nickname"
            placeholder="e.g. Leo, Sofia, Grandma"
            value={name}
            onChangeText={(t) => {
              setName(t);
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
              Household Role
            </Text>
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              {(['MEMBER', 'ADMIN'] as const).map((r) => {
                const isSelected = role === r;
                return (
                  <TouchableOpacity
                    key={r}
                    onPress={() => setRole(r)}
                    style={{
                      flex: 1,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      paddingVertical: spacing.sm,
                      borderRadius: radius.md,
                      backgroundColor: isSelected
                        ? theme.colors.brandLight
                        : theme.colors.surfaceSubtle,
                      borderWidth: 1.5,
                      borderColor: isSelected ? theme.colors.brand : theme.colors.border,
                      gap: spacing.xs,
                    }}
                  >
                    {r === 'ADMIN' ? (
                      <Shield
                        size={16}
                        color={isSelected ? theme.colors.brand : theme.colors.textSecondary}
                      />
                    ) : (
                      <User
                        size={16}
                        color={isSelected ? theme.colors.brand : theme.colors.textSecondary}
                      />
                    )}
                    <Text
                      style={{
                        color: isSelected ? theme.colors.brand : theme.colors.textPrimary,
                        fontSize: typography.fontSizes.sm,
                        fontWeight: isSelected
                          ? typography.fontWeights.bold
                          : typography.fontWeights.medium,
                      }}
                    >
                      {r === 'ADMIN' ? 'Parent / Admin' : 'Family Member'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Color Selection */}
          <View style={{ marginBottom: spacing.xl }}>
            <Text
              style={{
                color: theme.colors.textSecondary,
                fontSize: typography.fontSizes.sm,
                fontWeight: typography.fontWeights.medium,
                marginBottom: spacing.xs,
              }}
            >
              Avatar & Chart Color
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

          {/* Actions */}
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <Button title="Cancel" variant="outline" onPress={onClose} style={{ flex: 1 }} />
            <Button
              title="Add Member"
              variant="primary"
              icon={<Check size={18} color="#FFFFFF" />}
              onPress={handleSave}
              style={{ flex: 1 }}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};
