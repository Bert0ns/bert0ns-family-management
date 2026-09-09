import React from 'react';
import { View, Text, Image, ViewStyle, TextStyle } from 'react-native';
import { useTheme } from '@/theme';

type AvatarSize = 'sm' | 'md' | 'lg' | 'xl';

interface AvatarProps {
  name: string;
  avatarUrl?: string;
  colorCode?: string;
  size?: AvatarSize;
  showBorder?: boolean;
}

const SIZE_CONFIG: Record<AvatarSize, { dim: number; fontSizeKey: 'xs' | 'sm' | 'lg' | 'xxl' }> = {
  sm: { dim: 28, fontSizeKey: 'xs' },
  md: { dim: 36, fontSizeKey: 'sm' },
  lg: { dim: 48, fontSizeKey: 'lg' },
  xl: { dim: 64, fontSizeKey: 'xxl' },
};

export const Avatar: React.FC<AvatarProps> = ({
  name,
  avatarUrl,
  colorCode,
  size = 'md',
  showBorder = false,
}) => {
  const { theme, radius, typography } = useTheme();
  const config = SIZE_CONFIG[size] || SIZE_CONFIG.md;

  const safeName = (name || '').trim();
  const initials = safeName
    ? safeName
        .split(/\s+/)
        .map((part) => part[0])
        .filter(Boolean)
        .join('')
        .toUpperCase()
        .substring(0, 2)
    : '?';

  const containerStyle: ViewStyle = {
    width: config.dim,
    height: config.dim,
    borderRadius: radius.full,
    backgroundColor: colorCode || theme.colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: showBorder ? 2 : 0,
    borderColor: theme.colors.surface,
    overflow: 'hidden',
  };

  const textStyle: TextStyle = {
    color: '#FFFFFF',
    fontSize: typography.fontSizes[config.fontSizeKey],
    fontWeight: typography.fontWeights.bold,
  };

  return (
    <View style={containerStyle}>
      {avatarUrl ? (
        <Image
          source={{ uri: avatarUrl }}
          style={{ width: config.dim, height: config.dim, borderRadius: radius.full }}
          resizeMode="cover"
        />
      ) : (
        <Text style={textStyle}>{initials}</Text>
      )}
    </View>
  );
};
