import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { X, Tag, Check } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { Input } from '@/components/common/Input';
import { Button } from '@/components/common/Button';
import { IconHelper } from '@/components/common/IconHelper';

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

  const [name, setName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState(AVAILABLE_ICONS[0]);
  const [selectedColor, setSelectedColor] = useState(AVAILABLE_COLORS[0]);
  const [error, setError] = useState<string | null>(null);

  const handleSave = () => {
    if (!name.trim()) {
      setError('Category name is required');
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
            maxHeight: '90%',
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
              <Tag size={20} color={theme.colors.brand} />
              <Text
                style={{
                  color: theme.colors.textPrimary,
                  fontSize: typography.fontSizes.xl,
                  fontWeight: typography.fontWeights.bold,
                }}
              >
                Create Custom Category
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
            label="Category Name"
            placeholder="e.g. Pets, Subscriptions, Vacation"
            value={name}
            onChangeText={(t) => {
              setName(t);
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
              Select Icon
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
          <View style={{ marginBottom: spacing.xl }}>
            <Text
              style={{
                color: theme.colors.textSecondary,
                fontSize: typography.fontSizes.sm,
                fontWeight: typography.fontWeights.medium,
                marginBottom: spacing.xs,
              }}
            >
              Select Color
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

          {/* Actions */}
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <Button title="Cancel" variant="outline" onPress={onClose} style={{ flex: 1 }} />
            <Button
              title="Create Category"
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
