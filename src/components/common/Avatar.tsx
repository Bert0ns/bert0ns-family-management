import React from 'react';
import { View, Text, StyleSheet, Image, ViewStyle, TextStyle } from 'react-native';
import { useTheme } from '@/theme';

interface AvatarProps {
  name: string;
  avatarUrl?: string;
  colorCode?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showBorder?: boolean;
}

export const Avatar: React.FC<AvatarProps> = ({
  name,
  avatarUrl,
  colorCode,
  size = 'md',
  showBorder = false,
}) => {
  const { theme, radius, typography } = useTheme();

  const getDimensions = () => {
    switch (size) {
      case 'sm':
        return 28;
      case 'lg':
        return 48;
      case 'xl':
        return 64;
      case 'md':
      default:
        return 36;
    }
  };

  const getFontSize = () => {
    switch (size) {
      case 'sm':
        return typography.fontSizes.xs;
      case 'lg':
        return typography.fontSizes.lg;
      case 'xl':
        return typography.fontSizes.xxl;
      case 'md':
      default:
        return typography.fontSizes.sm;
    }
  };

  const dim = getDimensions();
  const initials = name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);

  const bgColor = colorCode || theme.colors.brand;

  const containerStyle: ViewStyle = {
    width: dim,
    height: dim,
    borderRadius: radius.full,
    backgroundColor: bgColor,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: showBorder ? 2 : 0,
    borderColor: theme.colors.surface,
    overflow: 'hidden',
  };

  const textStyle: TextStyle = {
    color: '#FFFFFF',
    fontSize: getFontSize(),
    fontWeight: typography.fontWeights.bold,
  };

  if (avatarUrl) {
    return (
      <View style={containerStyle}>
        <Image source={{ uri: avatarUrl }} style={{ width: dim, height: dim }} resizeMode="cover" />
      </View>
    );
  }

  return (
    <View style={containerStyle}>
      <Text style={textStyle}>{initials}</Text>
    </View>
  );
};
