import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react-native';
import { useTheme } from '@/theme';

interface PeriodSelectorProps {
  selectedPeriod: string; // YYYY-MM
  onPeriodChange: (newPeriod: string) => void;
}

export const PeriodSelector: React.FC<PeriodSelectorProps> = ({
  selectedPeriod,
  onPeriodChange,
}) => {
  const { theme, spacing, radius, typography } = useTheme();

  const [yearStr, monthStr] = selectedPeriod.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);

  const formattedPeriod = new Date(year, month - 1, 1).toLocaleDateString(undefined, {
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
        backgroundColor: theme.colors.surface,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
      }}
    >
      <TouchableOpacity
        onPress={handlePrev}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        style={{
          width: 32,
          height: 32,
          borderRadius: radius.sm,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme.colors.surfaceSubtle,
        }}
      >
        <ChevronLeft size={18} color={theme.colors.textPrimary} />
      </TouchableOpacity>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
        <Calendar size={16} color={theme.colors.brand} />
        <Text
          style={{
            color: theme.colors.textPrimary,
            fontSize: typography.fontSizes.sm,
            fontWeight: typography.fontWeights.bold,
          }}
        >
          {formattedPeriod}
        </Text>
      </View>

      <TouchableOpacity
        onPress={handleNext}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        style={{
          width: 32,
          height: 32,
          borderRadius: radius.sm,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme.colors.surfaceSubtle,
        }}
      >
        <ChevronRight size={18} color={theme.colors.textPrimary} />
      </TouchableOpacity>
    </View>
  );
};
