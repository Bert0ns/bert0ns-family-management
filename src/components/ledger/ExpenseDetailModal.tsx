import { uiLogger } from '@/services/logger';
import React from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  Platform,
  Alert,
  useWindowDimensions,
} from 'react-native';
import { Calendar, User, CreditCard, Trash2, X, Split } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { useI18n, getLocalizedCategoryName, getLocalizedPaymentMethod } from '@/i18n';
import { useAppStore } from '@/services/store';
import { Expense, Category, FamilyMember } from '@/types';
import { Avatar } from '@/components/common/Avatar';
import { IconHelper } from '@/components/common/IconHelper';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';

interface ExpenseDetailModalProps {
  visible: boolean;
  expense: Expense | null;
  category?: Category;
  member?: FamilyMember;
  allMembers?: FamilyMember[];
  currency?: string;
  onClose: () => void;
  onDelete: (id: string) => void;
}

export const ExpenseDetailModal: React.FC<ExpenseDetailModalProps> = ({
  visible,
  expense,
  category,
  member,
  allMembers = [],
  currency = '€',
  onClose,
  onDelete,
}) => {
  const { theme, spacing, radius, typography } = useTheme();
  const { t, locale } = useI18n();
  const { categories, members } = useAppStore();
  const { width: windowWidth } = useWindowDimensions();
  const isDesktop = windowWidth >= 768;

  if (!expense) return null;

  const resolvedCategory = category || categories.find((c) => c.id === expense.category_id);
  const resolvedMember = member || members.find((m) => m.id === expense.paid_by_member_id);
  const resolvedAllMembers = allMembers.length > 0 ? allMembers : members;

  const catColor = resolvedCategory?.color || theme.colors.brand;
  const catIcon = resolvedCategory?.icon || 'Tag';
  const catName = resolvedCategory
    ? getLocalizedCategoryName(resolvedCategory, t)
    : t.categories.other;
  const memberName = resolvedMember?.display_name || t.tabs.family;

  const dateLocale = locale === 'it' ? 'it-IT' : 'en-US';
  const localizedPaymentMethod = getLocalizedPaymentMethod(expense.payment_method, t);

  const handleDelete = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.confirm) {
      if (window.confirm(t.common.delete + '?')) {
        uiLogger.info('User confirmed deletion of expense from modal', {
          id: expense.id,
          merchant: expense.merchant_name,
          amount: expense.amount,
        });
        onDelete(expense.id);
        onClose();
      }
      return;
    }

    Alert.alert(t.common.delete, t.common.delete + '?', [
      { text: t.common.cancel, style: 'cancel' },
      {
        text: t.common.delete,
        style: 'destructive',
        onPress: () => {
          uiLogger.info('User confirmed deletion of expense from modal', {
            id: expense.id,
            merchant: expense.merchant_name,
            amount: expense.amount,
          });
          onDelete(expense.id);
          onClose();
        },
      },
    ]);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View
        style={{
          flex: 1,
          backgroundColor: theme.isDark ? 'rgba(0, 0, 0, 0.65)' : 'rgba(15, 23, 42, 0.35)',
          justifyContent: isDesktop ? 'center' : 'flex-end',
          alignItems: isDesktop ? 'center' : 'stretch',
          padding: isDesktop ? spacing.lg : 0,
        }}
      >
        <View
          style={[
            {
              backgroundColor: theme.colors.surface,
              borderRadius: isDesktop ? radius.xxl : undefined,
              borderTopLeftRadius: radius.xxl,
              borderTopRightRadius: radius.xxl,
              borderBottomLeftRadius: isDesktop ? radius.xxl : 0,
              borderBottomRightRadius: isDesktop ? radius.xxl : 0,
              paddingHorizontal: spacing.lg,
              paddingBottom: spacing.xl,
              paddingTop: isDesktop ? spacing.lg : spacing.sm,
              maxHeight: isDesktop ? '85%' : '88%',
              width: isDesktop ? '100%' : undefined,
              maxWidth: isDesktop ? 540 : undefined,
              borderWidth: 1.5,
              borderColor: theme.isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.8)',
              borderBottomWidth: isDesktop ? 1.5 : 0,
            },
            Platform.OS === 'web' &&
              ({
                backdropFilter: 'blur(24px)',
                WebkitBackdropFilter: 'blur(24px)',
                boxShadow: isDesktop
                  ? theme.isDark
                    ? '0 24px 48px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.1)'
                    : '0 24px 48px rgba(15, 23, 42, 0.2), 0 0 0 1px rgba(0, 0, 0, 0.05)'
                  : theme.isDark
                    ? '0 -8px 32px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.15)'
                    : '0 -8px 32px rgba(148, 163, 184, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.95)',
              } as any),
          ]}
        >
          {/* Apple Sheet Grabber Handle (Mobile only) */}
          {!isDesktop && (
            <View
              style={{
                alignItems: 'center',
                paddingVertical: spacing.xs,
                marginBottom: spacing.md,
              }}
            >
              <View
                style={{
                  width: 40,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: theme.isDark
                    ? 'rgba(255, 255, 255, 0.25)'
                    : 'rgba(0, 0, 0, 0.15)',
                }}
              />
            </View>
          )}

          {/* Header */}
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: spacing.md,
            }}
          >
            <Text
              style={{
                color: theme.colors.textPrimary,
                fontSize: typography.fontSizes.xl,
                fontWeight: typography.fontWeights.bold,
                flex: 1,
                minWidth: 0,
                marginRight: spacing.sm,
              }}
              numberOfLines={1}
            >
              {t.expenseDetail.title}
            </Text>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={{
                width: 36,
                height: 36,
                borderRadius: radius.md,
                backgroundColor: theme.isDark
                  ? theme.colors.surfaceContainerHigh
                  : theme.colors.surfaceSubtle,
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <X size={20} color={theme.colors.textSecondary} strokeWidth={2.5} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Main Merchant & Amount Banner */}
            <View
              style={{
                alignItems: 'center',
                paddingVertical: spacing.xl,
                backgroundColor: theme.colors.card,
                borderRadius: radius.xl,
                borderWidth: 1.5,
                borderColor: theme.colors.cardBorder,
                marginBottom: spacing.lg,
              }}
            >
              <View
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: radius.xl,
                  backgroundColor: `${catColor}22`,
                  borderWidth: 1.5,
                  borderColor: `${catColor}35`,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: spacing.sm,
                }}
              >
                <IconHelper name={catIcon} size={28} color={catColor} />
              </View>

              <Text
                style={{
                  color: theme.colors.textPrimary,
                  fontSize: typography.fontSizes.xxxl,
                  fontWeight: typography.fontWeights.heavy,
                  letterSpacing: -0.5,
                  maxWidth: '90%',
                  textAlign: 'center',
                }}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.7}
              >
                {currency}
                {expense.amount.toFixed(2)}
              </Text>

              <Text
                style={{
                  color: theme.colors.textPrimary,
                  fontSize: typography.fontSizes.lg,
                  fontWeight: typography.fontWeights.bold,
                  marginTop: 4,
                  textAlign: 'center',
                  paddingHorizontal: spacing.md,
                  maxWidth: '100%',
                }}
                numberOfLines={2}
                ellipsizeMode="tail"
              >
                {expense.merchant_name}
              </Text>

              <View style={{ marginTop: spacing.xs, maxWidth: '90%' }}>
                <Badge label={catName} color={catColor} size="md" variant="subtle" />
              </View>
            </View>

            {/* Metadata Table Rows */}
            <View
              style={{
                backgroundColor: theme.isDark
                  ? theme.colors.surfaceContainerHigh
                  : theme.colors.surfaceSubtle,
                borderRadius: radius.xl,
                borderWidth: 1.5,
                borderColor: theme.colors.borderTactile,
                padding: spacing.md,
                marginBottom: spacing.lg,
                gap: spacing.md,
              }}
            >
              {/* Date */}
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: spacing.sm,
                }}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: spacing.sm,
                    flexShrink: 0,
                  }}
                >
                  <Calendar size={18} color={theme.colors.textMuted} />
                  <Text
                    style={{
                      color: theme.colors.textSecondary,
                      fontSize: typography.fontSizes.sm,
                      fontWeight: typography.fontWeights.medium,
                    }}
                  >
                    {t.expenseDetail.date}
                  </Text>
                </View>
                <Text
                  style={{
                    color: theme.colors.textPrimary,
                    fontSize: typography.fontSizes.sm,
                    fontWeight: typography.fontWeights.bold,
                    flexShrink: 1,
                    textAlign: 'right',
                  }}
                  numberOfLines={1}
                >
                  {new Date(expense.transaction_date).toLocaleDateString(dateLocale, {
                    weekday: 'short',
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </Text>
              </View>

              {/* Paid By */}
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: spacing.sm,
                }}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: spacing.sm,
                    flexShrink: 0,
                  }}
                >
                  <User size={18} color={theme.colors.textMuted} />
                  <Text
                    style={{
                      color: theme.colors.textSecondary,
                      fontSize: typography.fontSizes.sm,
                      fontWeight: typography.fontWeights.medium,
                    }}
                  >
                    {t.expenseDetail.paidBy}
                  </Text>
                </View>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: spacing.xs,
                    flexShrink: 1,
                    minWidth: 0,
                    justifyContent: 'flex-end',
                  }}
                >
                  <Avatar
                    name={memberName}
                    avatarUrl={resolvedMember?.avatar_url}
                    colorCode={resolvedMember?.color_code}
                    size="sm"
                  />
                  <Text
                    style={{
                      color: theme.colors.textPrimary,
                      fontSize: typography.fontSizes.sm,
                      fontWeight: typography.fontWeights.bold,
                      flexShrink: 1,
                    }}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {memberName}
                  </Text>
                </View>
              </View>

              {/* Payment Method */}
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: spacing.sm,
                }}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: spacing.sm,
                    flexShrink: 0,
                  }}
                >
                  <CreditCard size={18} color={theme.colors.textMuted} />
                  <Text
                    style={{
                      color: theme.colors.textSecondary,
                      fontSize: typography.fontSizes.sm,
                      fontWeight: typography.fontWeights.medium,
                    }}
                  >
                    {t.expenseDetail.paymentMethod}
                  </Text>
                </View>
                <Text
                  style={{
                    color: theme.colors.textPrimary,
                    fontSize: typography.fontSizes.sm,
                    fontWeight: typography.fontWeights.bold,
                    flexShrink: 1,
                    textAlign: 'right',
                  }}
                  numberOfLines={1}
                >
                  {localizedPaymentMethod}
                </Text>
              </View>

              {/* Notes (if present) */}
              {Boolean(expense.notes) && (
                <View
                  style={{
                    borderTopWidth: 1,
                    borderTopColor: theme.colors.borderTactile,
                    paddingTop: spacing.sm,
                  }}
                >
                  <Text
                    style={{
                      color: theme.colors.textSecondary,
                      fontSize: typography.fontSizes.xs,
                      fontWeight: typography.fontWeights.medium,
                      marginBottom: 2,
                    }}
                  >
                    {t.expenseDetail.notes}
                  </Text>
                  <Text
                    style={{
                      color: theme.colors.textPrimary,
                      fontSize: typography.fontSizes.sm,
                      fontWeight: typography.fontWeights.medium,
                      lineHeight: 20,
                    }}
                  >
                    {expense.notes}
                  </Text>
                </View>
              )}
            </View>

            {/* Splits (if present) */}
            {expense.splits && expense.splits.length > 0 && (
              <View
                style={{
                  backgroundColor: theme.isDark
                    ? theme.colors.surfaceContainerHigh
                    : theme.colors.surfaceSubtle,
                  borderRadius: radius.xl,
                  borderWidth: 1.5,
                  borderColor: theme.colors.borderTactile,
                  padding: spacing.md,
                  marginBottom: spacing.lg,
                }}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: spacing.xs,
                    marginBottom: spacing.sm,
                  }}
                >
                  <Split size={16} color={theme.colors.brand} />
                  <Text
                    style={{
                      color: theme.colors.textPrimary,
                      fontSize: typography.fontSizes.sm,
                      fontWeight: typography.fontWeights.bold,
                    }}
                  >
                    {t.expenseDetail.splitBreakdown} ({expense.splits.length})
                  </Text>
                </View>

                {expense.splits.map((s, idx) => {
                  const m = resolvedAllMembers.find((mem) => mem.id === s.member_id);
                  return (
                    <View
                      key={idx}
                      style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        paddingVertical: 6,
                        gap: spacing.sm,
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
                        <Avatar
                          name={m?.display_name || '?'}
                          avatarUrl={m?.avatar_url}
                          colorCode={m?.color_code}
                          size="sm"
                        />
                        <Text
                          style={{
                            color: theme.colors.textPrimary,
                            fontSize: typography.fontSizes.sm,
                            fontWeight: typography.fontWeights.medium,
                            flexShrink: 1,
                          }}
                          numberOfLines={1}
                          ellipsizeMode="tail"
                        >
                          {m?.display_name || '?'}
                        </Text>
                      </View>
                      <Text
                        style={{
                          color: theme.colors.brand,
                          fontSize: typography.fontSizes.sm,
                          fontWeight: typography.fontWeights.bold,
                          flexShrink: 0,
                        }}
                      >
                        {currency}
                        {s.share_amount.toFixed(2)}
                      </Text>
                    </View>
                  );
                })}
              </View>
            )}

            {/* Actions */}
            <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs }}>
              <Button
                title={t.common.delete}
                variant="danger"
                icon={<Trash2 size={18} color="#FFFFFF" strokeWidth={2.5} />}
                onPress={handleDelete}
                style={{ flex: 1 }}
              />
              <Button
                title={t.common.close}
                variant="outline"
                onPress={onClose}
                style={{ flex: 1 }}
              />
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};
