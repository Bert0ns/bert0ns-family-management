import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Tag, Check } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { useI18n } from '@/i18n';
import { Input } from '@/components/common/Input';
import { IconHelper } from '@/components/common/IconHelper';
import { FormModal } from '@/components/common/FormModal';

interface AddCategoryModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (categoryData: { name: string; icon: string; color: string }) => void;
}

const AVAILABLE_ICONS = [
  'ShoppingCart',
  'Utensils',
  'Zap',
  'Car',
  'Home',
  'HeartPulse',
  'Film',
  'ShoppingBag',
  'GraduationCap',
  'Plane',
  'CreditCard',
  'Tag',
];

const AVAILABLE_COLORS = [
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#6366F1', // Indigo
  '#0EA5E9', // Sky
  '#EC4899', // Pink
  '#8B5CF6', // Violet
  '#EF4444', // Red
  '#14B8A6', // Teal
  '#64748B', // Slate
];

export const AddCategoryModal: React.FC<AddCategoryModalProps> = ({ visible, onClose, onSave }) => {
  const { theme, spacing, radius, typography } = useTheme();
  const { t } = useI18n();

  const [name, setName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState(AVAILABLE_ICONS[0]);
  const [selectedColor, setSelectedColor] = useState(AVAILABLE_COLORS[0]);
  const [error, setError] = useState<string | null>(null);

  const handleSave = () => {
    if (!name.trim()) {
      setError(t.family.categoryNamePlaceholder);
      return;
    }
    setError(null);
    onSave({
      name: name.trim(),
      icon: selectedIcon,
      color: selectedColor,
    });
    setName('');
    onClose();
  };

  return (
    <FormModal
      visible={visible}
      title={t.family.addCategoryTitle}
      icon={<Tag size={20} color={theme.colors.brand} />}
      onClose={onClose}
      onSubmit={handleSave}
      submitTitle={t.common.save}
      cancelTitle={t.common.cancel}
    >
      {/* Name input */}
      <Input
        label={t.family.categoryNameLabel}
        placeholder={t.family.categoryNamePlaceholder}
        value={name}
        onChangeText={(text) => {
          setName(text);
          if (error) setError(null);
        }}
        error={error || undefined}
      />

      {/* Icon Selector */}
      <View style={{ marginBottom: spacing.md }}>
        <Text
          style={{
            color: theme.colors.textSecondary,
            fontSize: typography.fontSizes.sm,
            fontWeight: typography.fontWeights.medium,
            marginBottom: spacing.xs,
          }}
        >
          {t.family.selectIcon}
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
          {AVAILABLE_ICONS.map((ic) => {
            const isSelected = selectedIcon === ic;
            return (
              <TouchableOpacity
                key={ic}
                onPress={() => setSelectedIcon(ic)}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: radius.md,
                  backgroundColor: isSelected
                    ? theme.colors.brandLight
                    : theme.colors.surfaceSubtle,
                  borderWidth: 1.5,
                  borderColor: isSelected ? theme.colors.brand : theme.colors.border,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <IconHelper
                  name={ic}
                  size={20}
                  color={isSelected ? theme.colors.brand : theme.colors.textPrimary}
                />
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Color Selector */}
      <View style={{ marginBottom: spacing.sm }}>
        <Text
          style={{
            color: theme.colors.textSecondary,
            fontSize: typography.fontSizes.sm,
            fontWeight: typography.fontWeights.medium,
            marginBottom: spacing.xs,
          }}
        >
          {t.family.selectColor}
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
          {AVAILABLE_COLORS.map((col) => {
            const isSelected = selectedColor === col;
            return (
              <TouchableOpacity
                key={col}
                onPress={() => setSelectedColor(col)}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: radius.full,
                  backgroundColor: col,
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
