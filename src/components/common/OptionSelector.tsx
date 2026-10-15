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
            fontWeight: typography.fontWeights.semibold,
            marginBottom: spacing.xs,
            letterSpacing: 0.1,
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
      <View
        style={{
          flexDirection: 'row',
          backgroundColor: theme.colors.surfaceSubtle,
          borderRadius: radius.sm,
          borderWidth: 1,
          borderColor: theme.colors.borderTactile,
          padding: 3,
          gap: 4,
        }}
      >
        {options.map((opt) => {
          const isSelected = selectedValue === opt.value;
          const a11yLabel = opt.sublabel ? `${opt.label}, ${opt.sublabel}` : opt.label;
          return (
            <TouchableOpacity
              key={String(opt.value)}
              activeOpacity={0.8}
              onPress={() => onSelect(opt.value)}
              accessibilityRole="radio"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={a11yLabel}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={{
                flex: 1,
                minHeight: 48,
                paddingVertical: spacing.xs + 2,
                paddingHorizontal: spacing.xs,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: radius.dockInner,
                backgroundColor: isSelected
                  ? (theme.colors.dockActivePill ?? theme.colors.card)
                  : 'transparent',
                borderWidth: isSelected ? 1 : 0,
                borderColor: isSelected
                  ? (theme.colors.dockActiveBorder ?? theme.colors.borderTactile)
                  : 'transparent',
              }}
            >
              <Text
                style={{
                  color: isSelected ? theme.colors.brand : theme.colors.textPrimary,
                  fontSize: typography.fontSizes.sm,
                  fontWeight: isSelected
                    ? typography.fontWeights.bold
                    : typography.fontWeights.medium,
                  textAlign: 'center',
                }}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.75}
              >
                {opt.label}
              </Text>
              {opt.sublabel && (
                <Text
                  style={{
                    color: isSelected ? theme.colors.brandDark : theme.colors.textSecondary,
                    fontSize: typography.fontSizes.xs,
                    marginTop: 1,
                    fontWeight: typography.fontWeights.medium,
                    textAlign: 'center',
                  }}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.8}
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
