import { useState, useMemo, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, Platform, type TextStyle } from 'react-native';
import { Users, Plus, Tag, UserPlus } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { useI18n, getLocalizedCategoryName } from '@/i18n';
import { useAppStore } from '@/services/store';
import { MemberCard } from '@/components/family/MemberCard';
import { AddMemberModal } from '@/components/family/AddMemberModal';
import { EditMemberModal } from '@/components/family/EditMemberModal';
import { AddCategoryModal } from '@/components/family/AddCategoryModal';
import { EditCategoryModal } from '@/components/family/EditCategoryModal';
import { IconHelper } from '@/components/common/IconHelper';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { Badge } from '@/components/common/Badge';
import { FamilyMember, Category } from '@/types';
import { sumBy, toCents, fromCents } from '@/utils/numberParser';

const TABULAR_NUMS: TextStyle =
  Platform.OS === 'web'
    ? ({ fontVariantNumeric: 'tabular-nums' } as unknown as TextStyle)
    : { fontVariant: ['tabular-nums'] };

export default function FamilyScreen() {
  const { theme, spacing, radius, typography } = useTheme();
  const { t } = useI18n();

  const family = useAppStore((s) => s.family);
  const members = useAppStore((s) => s.members);
  const categories = useAppStore((s) => s.categories);
  const expenses = useAppStore((s) => s.expenses);
  const selectedPeriod = useAppStore((s) => s.selectedPeriod);
  const currentMemberId = useAppStore((s) => s.currentMemberId);
  const addMember = useAppStore((s) => s.addMember);
  const updateMember = useAppStore((s) => s.updateMember);
  const deleteMember = useAppStore((s) => s.deleteMember);
  const addCategory = useAppStore((s) => s.addCategory);
  const updateCategory = useAppStore((s) => s.updateCategory);
  const deleteCategory = useAppStore((s) => s.deleteCategory);

  const [isAddMemberVisible, setIsAddMemberVisible] = useState(false);
  const [isAddCategoryVisible, setIsAddCategoryVisible] = useState(false);
  const [selectedMemberForEdit, setSelectedMemberForEdit] = useState<FamilyMember | null>(null);
  const [selectedCategoryForEdit, setSelectedCategoryForEdit] = useState<Category | null>(null);

  const periodExpenses = useMemo(
    () => expenses.filter((e) => e.transaction_date.startsWith(selectedPeriod)),
    [expenses, selectedPeriod],
  );

  const memberStats = useMemo(() => {
    const stats = new Map<string, { totalCents: number; count: number }>();
    periodExpenses.forEach((e) => {
      const entry = stats.get(e.paid_by_member_id) || { totalCents: 0, count: 0 };
      entry.totalCents += toCents(e.amount);
      entry.count += 1;
      stats.set(e.paid_by_member_id, entry);
    });
    const result = new Map<string, { totalSpent: number; count: number }>();
    stats.forEach((val, key) => {
      result.set(key, { totalSpent: fromCents(val.totalCents), count: val.count });
    });
    return result;
  }, [periodExpenses]);

  const handleSelectMember = useCallback((member: FamilyMember) => {
    setSelectedMemberForEdit(member);
  }, []);

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
    >
      {/* Household Info Banner */}
      <Card
        variant="elevated"
        style={{
          marginBottom: spacing.xl,
          padding: spacing.lg,
          borderRadius: radius.lg,
          backgroundColor: theme.colors.surface,
          borderWidth: 1,
          borderColor: theme.colors.border,
          borderTopWidth: 3,
          borderTopColor: theme.colors.brand,
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: spacing.xs,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.sm,
              flex: 1,
              minWidth: 0,
            }}
          >
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: radius.md,
                backgroundColor: theme.colors.brandLight,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Users size={22} color={theme.colors.brand} strokeWidth={2.5} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text
                style={{
                  color: theme.colors.textSecondary,
                  fontSize: typography.fontSizes.xs,
                  fontWeight: typography.fontWeights.medium,
                  letterSpacing: 0.1,
                }}
              >
                {t.family.activeWorkspace}
              </Text>
              <Text
                style={{
                  color: theme.colors.textPrimary,
                  fontSize: typography.fontSizes.xl,
                  fontWeight: typography.fontWeights.heavy,
                }}
                numberOfLines={1}
              >
                {family.name}
              </Text>
            </View>
          </View>

          <View style={{ flexShrink: 0 }}>
            <Badge
              label={`${members.length} ${t.family.membersCount}`}
              color={theme.colors.brand}
              variant="solid"
              size="md"
            />
          </View>
        </View>
      </Card>

      {/* Members Section */}
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

        <View style={{ gap: spacing.sm }}>
          {members.map((member) => {
            const stats = memberStats.get(member.id) || { totalSpent: 0, count: 0 };
            return (
              <MemberCard
                key={member.id}
                member={member}
                totalSpent={stats.totalSpent}
                transactionCount={stats.count}
                currency={family.currency}
                isCurrentUser={member.is_current_user || member.id === currentMemberId}
                onSelect={handleSelectMember}
              />
            );
          })}
        </View>
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
            const actualSpend = sumBy(catTxs, (e) => e.amount);

            return (
              <Pressable
                key={category.id}
                onPress={() => setSelectedCategoryForEdit(category)}
                accessibilityRole="button"
                accessibilityLabel={`${getLocalizedCategoryName(category, t)}, ${catTxs.length} ${t.dashboard.txs}`}
                style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
              >
                <Card
                  variant="outlined"
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    minHeight: 64,
                    padding: spacing.md,
                    borderRadius: radius.md,
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
                        width: 44,
                        height: 44,
                        borderRadius: radius.md,
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
                        style={[
                          {
                            color: theme.colors.textSecondary,
                            fontSize: typography.fontSizes.xs,
                            marginTop: 2,
                          },
                          TABULAR_NUMS,
                        ]}
                        numberOfLines={1}
                      >
                        {catTxs.length} {t.dashboard.txs}
                      </Text>
                    </View>
                  </View>

                  <View style={{ alignItems: 'flex-end', flexShrink: 0 }}>
                    <Text
                      style={[
                        {
                          color: theme.colors.textPrimary,
                          fontSize: typography.fontSizes.md,
                          fontWeight: typography.fontWeights.heavy,
                        },
                        TABULAR_NUMS,
                      ]}
                      numberOfLines={1}
                    >
                      {family.currency}
                      {actualSpend.toFixed(2)}
                    </Text>
                  </View>
                </Card>
              </Pressable>
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
        isSoleAdmin={
          selectedMemberForEdit?.role === 'ADMIN' &&
          members.filter((m) => m.role === 'ADMIN').length <= 1
        }
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

      {/* Edit Category Modal */}
      <EditCategoryModal
        visible={!!selectedCategoryForEdit}
        category={selectedCategoryForEdit}
        categories={categories}
        expenses={expenses}
        onClose={() => setSelectedCategoryForEdit(null)}
        onSave={(id, updates) => {
          updateCategory(id, updates);
        }}
        onDelete={(categoryId, fallbackId) => {
          deleteCategory(categoryId, fallbackId);
        }}
      />
    </ScrollView>
  );
}
