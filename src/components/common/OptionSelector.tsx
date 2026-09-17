import { View, Text, TouchableOpacity, ViewStyle } from 'react-native';
import { useTheme } from '@/theme';

export interface SelectorOption<T> {
  value: T;
  label: string;
  sublabel?: string;
}

interface OptionSelectorProps<T> {
  label?: string;
  sublabel?: string;
  options: SelectorOption<T>[];
  selectedValue: T;
  onSelect: (val: T) => void;
  style?: ViewStyle;
}

export function OptionSelector<T extends string | number>({
  label,
  sublabel,
  options,
  selectedValue,
  onSelect,
  style,
}: OptionSelectorProps<T>) {
  const { theme, spacing, radius, typography } = useTheme();

  return (
    <View style={style}>
      {label && (
        <Text
          style={{
            color: theme.colors.textPrimary,
            fontSize: typography.fontSizes.sm,
            fontWeight: typography.fontWeights.bold,
            marginBottom: spacing.xs,
            letterSpacing: 0.2,
          }}
        >
          {label}
        </Text>
      )}
      {sublabel && (
        <Text
          style={{
            color: theme.colors.textSecondary,
            fontSize: typography.fontSizes.xs,
            marginBottom: spacing.xs,
          }}
        >
          {sublabel}
        </Text>
      )}
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        {options.map((opt) => {
          const isSelected = selectedValue === opt.value;
          return (
            <TouchableOpacity
              key={String(opt.value)}
              activeOpacity={0.75}
              onPress={() => onSelect(opt.value)}
              style={{
                flex: 1,
                minHeight: 52,
                paddingVertical: spacing.sm,
                paddingHorizontal: spacing.sm,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: radius.lg,
                backgroundColor: isSelected
                  ? theme.colors.brand
                  : theme.isDark
                    ? theme.colors.surfaceContainerHigh
                    : theme.colors.surfaceSubtle,
                borderWidth: 1.5,
                borderColor: isSelected ? theme.colors.brand : theme.colors.borderTactile,
              }}
            >
              <Text
                style={{
                  color: isSelected ? '#FFFFFF' : theme.colors.textPrimary,
                  fontSize: typography.fontSizes.md,
                  fontWeight: typography.fontWeights.bold,
                }}
              >
                {opt.label}
              </Text>
              {opt.sublabel && (
                <Text
                  style={{
                    color: isSelected ? 'rgba(255, 255, 255, 0.9)' : theme.colors.textSecondary,
                    fontSize: typography.fontSizes.xs,
                    marginTop: 2,
                    fontWeight: typography.fontWeights.medium,
                  }}
                >
                  {opt.sublabel}
                </Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}
