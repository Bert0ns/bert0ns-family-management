import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Alert, Platform } from 'react-native';
import { Tag, Check, Trash2 } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { useI18n, getLocalizedCategoryName } from '@/i18n';
import { Category, Expense } from '@/types';
import { Input } from '@/components/common/Input';
import { IconHelper } from '@/components/common/IconHelper';
import { FormModal } from '@/components/common/FormModal';
import { Button } from '@/components/common/Button';
import { sumBy } from '@/utils/numberParser';

interface EditCategoryModalProps {
  visible: boolean;
  category: Category | null;
  categories: Category[];
  expenses: Expense[];
  onClose: () => void;
  onSave: (id: string, updates: { name: string; icon: string; color: string }) => void;
  onDelete: (id: string, fallbackCategoryId?: string) => void;
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

const EditCategoryContent: React.FC<{
  category: Category;
  categories: Category[];
  expenses: Expense[];
  onClose: () => void;
  onSave: (id: string, updates: { name: string; icon: string; color: string }) => void;
  onDelete: (id: string, fallbackCategoryId?: string) => void;
}> = ({ category, categories, expenses, onClose, onSave, onDelete }) => {
  const { theme, spacing, radius, typography } = useTheme();
  const { t } = useI18n();

  const [name, setName] = useState(category.name);
  const [selectedIcon, setSelectedIcon] = useState(category.icon || AVAILABLE_ICONS[0]);
  const [selectedColor, setSelectedColor] = useState(category.color || AVAILABLE_COLORS[0]);
  const [error, setError] = useState<string | null>(null);

  const otherCategories = categories.filter((c) => c.id !== category.id);
  const defaultFallback =
    otherCategories.find((c) => c.id === 'cat_other')?.id || otherCategories[0]?.id;
  const [selectedFallbackId, setSelectedFallbackId] = useState<string | undefined>(defaultFallback);

  const categoryExpenses = expenses.filter((e) => e.category_id === category.id);
  const totalSpent = sumBy(categoryExpenses, (e) => e.amount);

  const handleSave = () => {
    if (!name.trim()) {
      setError(t.family.categoryNamePlaceholder);
      return;
    }
    setError(null);
    onSave(category.id, {
      name: name.trim(),
      icon: selectedIcon,
      color: selectedColor,
    });
    onClose();
  };

  const handleDelete = () => {
    if (category.is_default) {
      if (Platform.OS === 'web') {
        alert(t.family.cannotDeleteDefaultCategory);
      } else {
        Alert.alert(t.family.deleteCategory, t.family.cannotDeleteDefaultCategory);
      }
      return;
    }

    if (categories.length <= 1) {
      if (Platform.OS === 'web') {
        alert(t.family.cannotDeleteLastCategory);
      } else {
        Alert.alert(t.family.deleteCategory, t.family.cannotDeleteLastCategory);
      }
      return;
    }

    const fallbackCat = categories.find((c) => c.id === selectedFallbackId);
    const fallbackName = fallbackCat ? getLocalizedCategoryName(fallbackCat, t) : '';

    const confirmMessage = `${t.family.deleteCategoryConfirmMessage}\n\n• ${categoryExpenses.length} ${t.dashboard.totalTransactions.toLowerCase()} (€${totalSpent.toFixed(2)})\n• ${t.family.fallbackCategoryLabel}: ${fallbackName}`;

    if (Platform.OS === 'web') {
      if (window.confirm(`${t.family.deleteCategoryConfirmTitle}\n\n${confirmMessage}`)) {
        try {
          onDelete(category.id, selectedFallbackId);
          onClose();
        } catch (err: any) {
          alert(err?.message || 'Error deleting category');
        }
      }
    } else {
      Alert.alert(t.family.deleteCategoryConfirmTitle, confirmMessage, [
        { text: t.common.cancel, style: 'cancel' },
        {
          text: t.family.deleteCategory,
          style: 'destructive',
          onPress: () => {
            try {
              onDelete(category.id, selectedFallbackId);
              onClose();
            } catch (err: any) {
              Alert.alert(t.family.deleteCategory, err?.message || 'Error deleting category');
            }
          },
        },
      ]);
    }
  };

  return (
    <FormModal
      visible={true}
      title={t.family.editCategoryTitle}
      icon={<Tag size={20} color={selectedColor} />}
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
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                accessibilityRole="radio"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={ic}
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
      <View style={{ marginBottom: spacing.md }}>
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
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="radio"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={col}
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

      {/* Fallback category selector (when expenses exist and category is non-default) */}
      {!category.is_default && categoryExpenses.length > 0 && otherCategories.length > 0 && (
        <View
          style={{
            marginBottom: spacing.md,
            padding: spacing.sm,
            backgroundColor: theme.colors.surfaceSubtle,
            borderRadius: radius.md,
            borderWidth: 1,
            borderColor: theme.colors.border,
          }}
        >
          <Text
            style={{
              color: theme.colors.textSecondary,
              fontSize: typography.fontSizes.xs,
              fontWeight: typography.fontWeights.medium,
              marginBottom: spacing.xs,
            }}
          >
            {t.family.fallbackCategoryLabel}
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
            {otherCategories.map((c) => {
              const isSelected = selectedFallbackId === c.id;
              return (
                <TouchableOpacity
                  key={c.id}
                  onPress={() => setSelectedFallbackId(c.id)}
                  style={{
                    paddingHorizontal: spacing.sm,
                    paddingVertical: 6,
                    borderRadius: radius.sm,
                    backgroundColor: isSelected ? theme.colors.brand : theme.colors.surface,
                    borderWidth: 1,
                    borderColor: isSelected ? theme.colors.brand : theme.colors.border,
                  }}
                >
                  <Text
                    style={{
                      color: isSelected ? '#FFFFFF' : theme.colors.textPrimary,
                      fontSize: typography.fontSizes.xs,
                      fontWeight: typography.fontWeights.semibold,
                    }}
                  >
                    {getLocalizedCategoryName(c, t)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

      {/* Delete Category Button (Only shown if non-default) */}
      {!category.is_default && (
        <View style={{ marginTop: spacing.xs }}>
          <Button
            title={t.family.deleteCategory}
            variant="danger"
            icon={<Trash2 size={18} color="#FFFFFF" />}
            onPress={handleDelete}
          />
        </View>
      )}
    </FormModal>
  );
};

export const EditCategoryModal: React.FC<EditCategoryModalProps> = ({
  visible,
  category,
  categories,
  expenses,
  onClose,
  onSave,
  onDelete,
}) => {
  if (!visible || !category) return null;

  return (
    <EditCategoryContent
      key={category.id}
      category={category}
      categories={categories}
      expenses={expenses}
      onClose={onClose}
      onSave={onSave}
      onDelete={onDelete}
    />
  );
};
