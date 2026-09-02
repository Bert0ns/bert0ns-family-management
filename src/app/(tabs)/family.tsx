import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Users, Target, Sun, Moon, RotateCcw, Plus, Shield } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { useAppStore } from '@/services/store';
import { MemberCard } from '@/components/family/MemberCard';
import { BudgetEnvelopeCard } from '@/components/family/BudgetEnvelopeCard';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { Badge } from '@/components/common/Badge';

export default function FamilyScreen() {
  const {
    theme,
    isDark,
    colorSchemePreference,
    setColorSchemePreference,
    spacing,
    radius,
    typography,
  } = useTheme();

  const { family, members, categories, budgets, expenses, selectedPeriod, resetToSampleData } =
    useAppStore();

  const periodExpenses = expenses.filter((e) => e.transaction_date.startsWith(selectedPeriod));

  const handleResetData = () => {
    resetToSampleData();
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
        </View>

        {categories.map((category) => {
          const catTxs = periodExpenses.filter((e) => e.category_id === category.id);
          const actualSpend = catTxs.reduce((sum, e) => sum + e.amount, 0);
          const budget = budgets.find(
            (b) => b.category_id === category.id && b.period === selectedPeriod,
          );

          return (
            <BudgetEnvelopeCard
              key={category.id}
              category={category}
              budget={budget}
              actualSpend={actualSpend}
              currency={family.currency}
            />
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
          onPress={handleResetData}
        />
      </Card>
    </ScrollView>
  );
}
