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
            color: theme.colors.textSecondary,
            fontSize: typography.fontSizes.xs,
            marginBottom: 4,
          }}
        >
          {label}
        </Text>
      )}
      {sublabel && (
        <Text
          style={{
            color: theme.colors.textMuted,
            fontSize: typography.fontSizes.xs,
            marginBottom: spacing.xs,
          }}
        >
          {sublabel}
        </Text>
      )}
      <View style={{ flexDirection: 'row', gap: spacing.xs }}>
        {options.map((opt) => {
          const isSelected = selectedValue === opt.value;
          return (
            <TouchableOpacity
              key={String(opt.value)}
              activeOpacity={0.7}
              onPress={() => onSelect(opt.value)}
              style={{
                flex: 1,
                paddingVertical: spacing.sm,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: radius.md,
                backgroundColor: isSelected ? theme.colors.brand : theme.colors.surfaceSubtle,
                borderWidth: 1,
                borderColor: isSelected ? theme.colors.brand : theme.colors.border,
              }}
            >
              <Text
                style={{
                  color: isSelected ? '#FFFFFF' : theme.colors.textPrimary,
                  fontSize: typography.fontSizes.sm,
                  fontWeight: isSelected
                    ? typography.fontWeights.bold
                    : typography.fontWeights.medium,
                }}
              >
                {opt.label}
              </Text>
              {opt.sublabel && (
                <Text
                  style={{
                    color: isSelected ? 'rgba(255,255,255,0.8)' : theme.colors.textMuted,
                    fontSize: 10,
                    marginTop: 2,
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
