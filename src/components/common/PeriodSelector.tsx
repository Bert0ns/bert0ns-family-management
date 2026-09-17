import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { useI18n } from '@/i18n';

interface PeriodSelectorProps {
  selectedPeriod: string; // YYYY-MM
  onPeriodChange: (newPeriod: string) => void;
}

export const PeriodSelector: React.FC<PeriodSelectorProps> = ({
  selectedPeriod,
  onPeriodChange,
}) => {
  const { theme, spacing, radius, typography } = useTheme();
  const { t, locale } = useI18n();

  const [yearStr, monthStr] = selectedPeriod.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);

  const dateLocale = locale === 'it' ? 'it-IT' : 'en-US';
  const formattedPeriod = new Date(year, month - 1, 1).toLocaleDateString(dateLocale, {
    month: 'long',
    year: 'numeric',
  });

  const handlePrev = () => {
    let prevYear = year;
    let prevMonth = month - 1;
    if (prevMonth < 1) {
      prevMonth = 12;
      prevYear -= 1;
    }
    const newPeriod = `${prevYear}-${String(prevMonth).padStart(2, '0')}`;
    onPeriodChange(newPeriod);
  };

  const handleNext = () => {
    let nextYear = year;
    let nextMonth = month + 1;
    if (nextMonth > 12) {
      nextMonth = 1;
      nextYear += 1;
    }
    const newPeriod = `${nextYear}-${String(nextMonth).padStart(2, '0')}`;
    onPeriodChange(newPeriod);
  };

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: theme.colors.card,
        borderRadius: radius.xl,
        borderWidth: 1.5,
        borderColor: theme.colors.cardBorder,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        minHeight: 56,
        gap: spacing.xs,
      }}
    >
      <TouchableOpacity
        onPress={handlePrev}
        activeOpacity={0.7}
        accessibilityLabel={t.common.previousMonth}
        style={{
          width: 44,
          height: 44,
          borderRadius: radius.lg,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme.colors.surfaceSubtle,
          borderWidth: 1,
          borderColor: theme.colors.borderTactile,
          flexShrink: 0,
        }}
      >
        <ChevronLeft size={22} color={theme.colors.textPrimary} strokeWidth={2.5} />
      </TouchableOpacity>

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: spacing.xs + 2,
          flex: 1,
          minWidth: 0,
          paddingHorizontal: spacing.xs,
        }}
      >
        <View
          style={{
            width: 32,
            height: 32,
            borderRadius: radius.md,
            backgroundColor: theme.colors.brandLight,
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Calendar size={16} color={theme.colors.brand} strokeWidth={2.5} />
        </View>
        <Text
          style={{
            color: theme.colors.textPrimary,
            fontSize: typography.fontSizes.md,
            fontWeight: typography.fontWeights.heavy,
            textTransform: 'capitalize',
            flexShrink: 1,
            textAlign: 'center',
          }}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.8}
        >
          {formattedPeriod}
        </Text>
      </View>

      <TouchableOpacity
        onPress={handleNext}
        activeOpacity={0.7}
        accessibilityLabel={t.common.nextMonth}
        style={{
          width: 44,
          height: 44,
          borderRadius: radius.lg,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme.colors.surfaceSubtle,
          borderWidth: 1,
          borderColor: theme.colors.borderTactile,
          flexShrink: 0,
        }}
      >
        <ChevronRight size={22} color={theme.colors.textPrimary} strokeWidth={2.5} />
      </TouchableOpacity>
    </View>
  );
};
