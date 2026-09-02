import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Users, Target, Sun, Moon, RotateCcw, Plus, Tag, UserPlus } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { useAppStore } from '@/services/store';
import { MemberCard } from '@/components/family/MemberCard';
import { BudgetEnvelopeCard } from '@/components/family/BudgetEnvelopeCard';
import { EditBudgetModal } from '@/components/family/EditBudgetModal';
import { AddMemberModal } from '@/components/family/AddMemberModal';
import { AddCategoryModal } from '@/components/family/AddCategoryModal';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { Badge } from '@/components/common/Badge';
import { Category, Budget } from '@/types';

export default function FamilyScreen() {
  const { theme, colorSchemePreference, setColorSchemePreference, spacing, radius, typography } =
    useTheme();

  const {
    family,
    members,
    categories,
    budgets,
    expenses,
    selectedPeriod,
    updateBudget,
    addMember,
    addCategory,
    resetToSampleData,
  } = useAppStore();

  const [selectedCategoryForBudget, setSelectedCategoryForBudget] = useState<Category | null>(null);
  const [isAddMemberVisible, setIsAddMemberVisible] = useState(false);
  const [isAddCategoryVisible, setIsAddCategoryVisible] = useState(false);

  const periodExpenses = expenses.filter((e) => e.transaction_date.startsWith(selectedPeriod));

  const handleSaveBudget = (categoryId: string, newLimit: number) => {
    updateBudget(categoryId, newLimit);
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.huge }}
      showsVerticalScrollIndicator={false}
    >
      {/* Family Info Card */}
      <Card
        padding="md"
        style={{
          marginBottom: spacing.lg,
          backgroundColor: theme.isDark ? '#1E1B4B' : '#EEF2FF',
          borderColor: theme.colors.brandLight,
        }}
      >
        <View
          style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <View>
            <Text
              style={{
                color: theme.colors.textPrimary,
                fontSize: typography.fontSizes.xl,
                fontWeight: typography.fontWeights.bold,
              }}
            >
              {family.name}
            </Text>
            <Text
              style={{
                color: theme.colors.textSecondary,
                fontSize: typography.fontSizes.xs,
                marginTop: 2,
              }}
            >
              Active Currency: {family.currency} (EUR) • {members.length} Members
            </Text>
          </View>

          <Badge label="Active Workspace" color={theme.colors.brand} variant="solid" size="sm" />
        </View>
      </Card>

      {/* Family Members Section */}
      <View style={{ marginBottom: spacing.lg }}>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: spacing.sm,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
            <Users size={18} color={theme.colors.brand} />
            <Text
              style={{
                color: theme.colors.textPrimary,
                fontSize: typography.fontSizes.lg,
                fontWeight: typography.fontWeights.bold,
              }}
            >
              Family Members ({members.length})
            </Text>
          </View>

          <Button
            title="Add Member"
            variant="secondary"
            size="sm"
            icon={<UserPlus size={14} color={theme.colors.brand} />}
            onPress={() => setIsAddMemberVisible(true)}
          />
        </View>

        {members.map((member) => {
          const memberTxs = periodExpenses.filter((e) => e.paid_by_member_id === member.id);
          const totalSpent = memberTxs.reduce((sum, e) => sum + e.amount, 0);

          return (
            <MemberCard
              key={member.id}
              member={member}
              totalSpent={totalSpent}
              transactionCount={memberTxs.length}
              currency={family.currency}
              isCurrentUser={member.is_current_user}
            />
          );
        })}
      </View>

      {/* Budget Envelopes Section */}
      <View style={{ marginBottom: spacing.lg }}>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: spacing.sm,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
            <Target size={18} color={theme.colors.brand} />
            <Text
              style={{
                color: theme.colors.textPrimary,
                fontSize: typography.fontSizes.lg,
                fontWeight: typography.fontWeights.bold,
              }}
            >
              Category Budgets ({selectedPeriod})
            </Text>
          </View>

          <Button
            title="Add Category"
            variant="secondary"
            size="sm"
            icon={<Plus size={14} color={theme.colors.brand} />}
            onPress={() => setIsAddCategoryVisible(true)}
          />
        </View>

        <Text
          style={{
            color: theme.colors.textMuted,
            fontSize: typography.fontSizes.xs,
            marginBottom: spacing.xs,
          }}
        >
          Tap any category card below to edit its monthly spending envelope limit:
        </Text>

        {categories.map((category) => {
          const catTxs = periodExpenses.filter((e) => e.category_id === category.id);
          const actualSpend = catTxs.reduce((sum, e) => sum + e.amount, 0);
          const budget = budgets.find(
            (b) => b.category_id === category.id && b.period === selectedPeriod,
          );

          return (
            <TouchableOpacity
              key={category.id}
              activeOpacity={0.75}
              onPress={() => setSelectedCategoryForBudget(category)}
            >
              <BudgetEnvelopeCard
                category={category}
                budget={budget}
                actualSpend={actualSpend}
                currency={family.currency}
              />
            </TouchableOpacity>
          );
        })}
      </View>

      {/* App Preferences & Settings */}
      <Card padding="md" style={{ marginBottom: spacing.lg }}>
        <Text
          style={{
            color: theme.colors.textPrimary,
            fontSize: typography.fontSizes.md,
            fontWeight: typography.fontWeights.bold,
            marginBottom: spacing.md,
          }}
        >
          Appearance & Theme
        </Text>

        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          {(['light', 'dark', 'system'] as const).map((pref) => {
            const isSelected = colorSchemePreference === pref;
            return (
              <TouchableOpacity
                key={pref}
                onPress={() => setColorSchemePreference(pref)}
                style={{
                  flex: 1,
                  paddingVertical: spacing.sm,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: radius.md,
                  backgroundColor: isSelected ? theme.colors.brand : theme.colors.surfaceSubtle,
                }}
              >
                <Text
                  style={{
                    color: isSelected ? '#FFFFFF' : theme.colors.textSecondary,
                    fontSize: typography.fontSizes.sm,
                    fontWeight: typography.fontWeights.semibold,
                    textTransform: 'capitalize',
                  }}
                >
                  {pref}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </Card>

      {/* Reset State Button */}
      <Card padding="md" style={{ alignItems: 'center' }}>
        <Text
          style={{
            color: theme.colors.textSecondary,
            fontSize: typography.fontSizes.xs,
            textAlign: 'center',
            marginBottom: spacing.sm,
          }}
        >
          Want to restore the standard mock family transactions & categories?
        </Text>
        <Button
          title="Reset to Sample Data"
          variant="outline"
          size="sm"
          icon={<RotateCcw size={14} color={theme.colors.textSecondary} />}
          onPress={resetToSampleData}
        />
      </Card>

      {/* Edit Budget Modal */}
      <EditBudgetModal
        visible={!!selectedCategoryForBudget}
        category={selectedCategoryForBudget}
        currentBudget={budgets.find(
          (b) => b.category_id === selectedCategoryForBudget?.id && b.period === selectedPeriod,
        )}
        currency={family.currency}
        onClose={() => setSelectedCategoryForBudget(null)}
        onSave={handleSaveBudget}
      />

      {/* Add Member Modal */}
      <AddMemberModal
        visible={isAddMemberVisible}
        onClose={() => setIsAddMemberVisible(false)}
        onSave={addMember}
      />

      {/* Add Category Modal */}
      <AddCategoryModal
        visible={isAddCategoryVisible}
        onClose={() => setIsAddCategoryVisible(false)}
        onSave={addCategory}
      />
    </ScrollView>
  );
}
