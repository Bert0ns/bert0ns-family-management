import React, { useState, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet } from 'react-native';
import { X, Target, Check } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { Category, Budget } from '@/types';
import { Input } from '@/components/common/Input';
import { Button } from '@/components/common/Button';
import { IconHelper } from '@/components/common/IconHelper';

interface EditBudgetModalProps {
  visible: boolean;
  category: Category | null;
  currentBudget?: Budget;
  currency?: string;
  onClose: () => void;
  onSave: (categoryId: string, newLimit: number) => void;
}

export const EditBudgetModal: React.FC<EditBudgetModalProps> = ({
  visible,
  category,
  currentBudget,
  currency = '€',
  onClose,
  onSave,
}) => {
  const { theme, spacing, radius, typography } = useTheme();
  const [limit, setLimit] = useState<string>('');

  useEffect(() => {
    if (currentBudget) {
      setLimit(currentBudget.monthly_limit.toString());
    } else {
      setLimit('300');
    }
  }, [currentBudget, category]);

  if (!category) return null;

  const handleSave = () => {
    const numLimit = parseFloat(limit.replace(',', '.'));
    if (!isNaN(numLimit) && numLimit >= 0) {
      onSave(category.id, numLimit);
      onClose();
    }
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.5)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: spacing.xl,
        }}
      >
        <View
          style={{
            width: '100%',
            maxWidth: 380,
            backgroundColor: theme.colors.surface,
            borderRadius: radius.xl,
            padding: spacing.xl,
            shadowColor: theme.colors.shadow,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.2,
            shadowRadius: 16,
            elevation: 5,
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
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: radius.md,
                  backgroundColor: `${category.color}25`,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <IconHelper name={category.icon} size={18} color={category.color} />
              </View>
              <Text
                style={{
                  color: theme.colors.textPrimary,
                  fontSize: typography.fontSizes.lg,
                  fontWeight: typography.fontWeights.bold,
                }}
              >
                {category.name}
              </Text>
            </View>

            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <X size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <Text
            style={{
              color: theme.colors.textSecondary,
              fontSize: typography.fontSizes.sm,
              marginBottom: spacing.md,
            }}
          >
            Set the monthly spending limit envelope for this category.
          </Text>

          {/* Amount input */}
          <Input
            label="Monthly Budget Limit"
            placeholder="0.00"
            value={limit}
            onChangeText={setLimit}
            keyboardType="decimal-pad"
            leftIcon={
              <Text
                style={{
                  color: theme.colors.brand,
                  fontSize: typography.fontSizes.md,
                  fontWeight: typography.fontWeights.bold,
                }}
              >
                {currency}
              </Text>
            }
          />

          {/* Actions */}
          <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md }}>
            <Button title="Cancel" variant="outline" onPress={onClose} style={{ flex: 1 }} />
            <Button
              title="Save Limit"
              variant="primary"
              icon={<Check size={16} color="#FFFFFF" />}
              onPress={handleSave}
              style={{ flex: 1 }}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};
