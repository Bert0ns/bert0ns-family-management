import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { Users, Plus, Tag, UserPlus } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { useI18n } from '@/i18n';
import { useAppStore } from '@/services/store';
import { MemberCard } from '@/components/family/MemberCard';
import { AddMemberModal } from '@/components/family/AddMemberModal';
import { EditMemberModal } from '@/components/family/EditMemberModal';
import { AddCategoryModal } from '@/components/family/AddCategoryModal';
import { IconHelper } from '@/components/common/IconHelper';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { Badge } from '@/components/common/Badge';
import { FamilyMember } from '@/types';

export default function FamilyScreen() {
  const { theme, spacing, radius, typography } = useTheme();
  const { t } = useI18n();

  const {
    family,
    members,
    categories,
    expenses,
    selectedPeriod,
    addMember,
    updateMember,
    deleteMember,
    addCategory,
  } = useAppStore();

  const [isAddMemberVisible, setIsAddMemberVisible] = useState(false);
  const [isAddCategoryVisible, setIsAddCategoryVisible] = useState(false);
  const [selectedMemberForEdit, setSelectedMemberForEdit] = useState<FamilyMember | null>(null);

  const periodExpenses = expenses.filter((e) => e.transaction_date.startsWith(selectedPeriod));

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
              {family.currency} • {members.length} {t.family.membersCount}
            </Text>
          </View>

          <Badge
            label={t.family.activeWorkspace}
            color={theme.colors.brand}
            variant="solid"
            size="sm"
          />
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
              {t.family.membersTitle} ({members.length})
            </Text>
          </View>

          <Button
            title={t.family.addMember}
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
              onSelect={() => setSelectedMemberForEdit(member)}
            />
          );
        })}
      </View>

      {/* Categories Section */}
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
            <Tag size={18} color={theme.colors.brand} />
            <Text
              style={{
                color: theme.colors.textPrimary,
                fontSize: typography.fontSizes.lg,
                fontWeight: typography.fontWeights.bold,
              }}
            >
              {t.family.categoriesTitle} ({categories.length})
            </Text>
          </View>

          <Button
            title={t.family.addCategory}
            variant="secondary"
            size="sm"
            icon={<Plus size={14} color={theme.colors.brand} />}
            onPress={() => setIsAddCategoryVisible(true)}
          />
        </View>

        <View style={{ gap: spacing.sm }}>
          {categories.map((category) => {
            const catTxs = periodExpenses.filter((e) => e.category_id === category.id);
            const actualSpend = catTxs.reduce((sum, e) => sum + e.amount, 0);

            return (
              <Card
                key={category.id}
                padding="md"
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: radius.md,
                      backgroundColor: `${category.color}20`,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <IconHelper name={category.icon} size={20} color={category.color} />
                  </View>
                  <View>
                    <Text
                      style={{
                        color: theme.colors.textPrimary,
                        fontSize: typography.fontSizes.md,
                        fontWeight: typography.fontWeights.semibold,
                      }}
                    >
                      {category.name}
                    </Text>
                    <Text
                      style={{
                        color: theme.colors.textMuted,
                        fontSize: typography.fontSizes.xs,
                        marginTop: 2,
                      }}
                    >
                      {catTxs.length} {t.dashboard.txs}
                    </Text>
                  </View>
                </View>

                <View style={{ alignItems: 'flex-end' }}>
                  <Text
                    style={{
                      color: theme.colors.textPrimary,
                      fontSize: typography.fontSizes.md,
                      fontWeight: typography.fontWeights.bold,
                    }}
                  >
                    {family.currency}
                    {actualSpend.toFixed(2)}
                  </Text>
                </View>
              </Card>
            );
          })}
        </View>
      </View>

      {/* Add Member Modal */}
      <AddMemberModal
        visible={isAddMemberVisible}
        onClose={() => setIsAddMemberVisible(false)}
        onSave={addMember}
      />

      {/* Edit Member Modal */}
      <EditMemberModal
        visible={!!selectedMemberForEdit}
        member={selectedMemberForEdit}
        expenses={expenses}
        isOnlyMember={members.length <= 1}
        currency={family.currency}
        onClose={() => setSelectedMemberForEdit(null)}
        onSave={(updates) => {
          if (selectedMemberForEdit) {
            updateMember(selectedMemberForEdit.id, updates);
          }
        }}
        onDelete={(memberId) => {
          deleteMember(memberId);
        }}
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
