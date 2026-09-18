import { useState } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { Users, Plus, Tag, UserPlus } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { useI18n, getLocalizedCategoryName } from '@/i18n';
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
    currentMemberId,
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
      contentContainerStyle={{
        padding: spacing.lg,
        paddingBottom: 130,
        maxWidth: 760,
        width: '100%',
        alignSelf: 'center',
      }}
      showsVerticalScrollIndicator={false}
    >
      {/* Family Info Card */}
      <Card
        padding="lg"
        style={{
          marginBottom: spacing.lg,
          backgroundColor: theme.isDark
            ? theme.colors.surfaceContainerHigh
            : theme.colors.surfaceSubtle,
          borderColor: theme.colors.borderTactile,
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: spacing.sm,
          }}
        >
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text
              style={{
                color: theme.colors.textPrimary,
                fontSize: typography.fontSizes.xl,
                fontWeight: typography.fontWeights.heavy,
              }}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {family.name}
            </Text>
            <Text
              style={{
                color: theme.colors.textSecondary,
                fontSize: typography.fontSizes.sm,
                fontWeight: typography.fontWeights.medium,
                marginTop: 4,
              }}
              numberOfLines={1}
            >
              {family.currency} • {members.length} {t.family.membersCount}
            </Text>
          </View>

          <View style={{ flexShrink: 0 }}>
            <Badge
              label={t.family.activeWorkspace}
              color={theme.colors.brand}
              variant="solid"
              size="md"
            />
          </View>
        </View>
      </Card>

      {/* Family Members Section */}
      <View style={{ marginBottom: spacing.xl }}>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: spacing.md,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.xs,
              flex: 1,
              minWidth: 0,
            }}
          >
            <Users
              size={20}
              color={theme.colors.brand}
              strokeWidth={2.5}
              style={{ flexShrink: 0 }}
            />
            <Text
              style={{
                color: theme.colors.textPrimary,
                fontSize: typography.fontSizes.lg,
                fontWeight: typography.fontWeights.bold,
                flexShrink: 1,
              }}
              numberOfLines={1}
            >
              {t.family.membersTitle} ({members.length})
            </Text>
          </View>

          <Button
            variant="secondary"
            size="sm"
            icon={<UserPlus size={16} color={theme.colors.brand} strokeWidth={2.5} />}
            onPress={() => setIsAddMemberVisible(true)}
            accessibilityLabel={t.family.addMember}
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
              isCurrentUser={member.is_current_user || member.id === currentMemberId}
              onSelect={() => setSelectedMemberForEdit(member)}
            />
          );
        })}
      </View>

      {/* Categories Section */}
      <View style={{ marginBottom: spacing.xl }}>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: spacing.md,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.xs,
              flex: 1,
              minWidth: 0,
            }}
          >
            <Tag size={20} color={theme.colors.brand} strokeWidth={2.5} style={{ flexShrink: 0 }} />
            <Text
              style={{
                color: theme.colors.textPrimary,
                fontSize: typography.fontSizes.lg,
                fontWeight: typography.fontWeights.bold,
                flexShrink: 1,
              }}
              numberOfLines={1}
            >
              {t.family.categoriesTitle} ({categories.length})
            </Text>
          </View>

          <Button
            variant="secondary"
            size="sm"
            icon={<Plus size={16} color={theme.colors.brand} strokeWidth={2.5} />}
            onPress={() => setIsAddCategoryVisible(true)}
            accessibilityLabel={t.family.addCategory}
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
                  borderWidth: 1.5,
                  borderColor: theme.colors.cardBorder,
                }}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: spacing.sm,
                    flex: 1,
                    minWidth: 0,
                    marginRight: spacing.sm,
                  }}
                >
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: radius.lg,
                      backgroundColor: `${category.color}22`,
                      borderWidth: 1.5,
                      borderColor: `${category.color}35`,
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <IconHelper name={category.icon} size={20} color={category.color} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text
                      style={{
                        color: theme.colors.textPrimary,
                        fontSize: typography.fontSizes.md,
                        fontWeight: typography.fontWeights.bold,
                      }}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {getLocalizedCategoryName(category, t)}
                    </Text>
                    <Text
                      style={{
                        color: theme.colors.textSecondary,
                        fontSize: typography.fontSizes.xs,
                        marginTop: 2,
                      }}
                      numberOfLines={1}
                    >
                      {catTxs.length} {t.dashboard.txs}
                    </Text>
                  </View>
                </View>

                <View style={{ alignItems: 'flex-end', flexShrink: 0 }}>
                  <Text
                    style={{
                      color: theme.colors.textPrimary,
                      fontSize: typography.fontSizes.md,
                      fontWeight: typography.fontWeights.heavy,
                    }}
                    numberOfLines={1}
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
