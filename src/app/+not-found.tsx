import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Link, Stack } from 'expo-router';
import { AlertCircle, Home } from 'lucide-react-native';
import { useTheme } from '@/theme';

export default function NotFoundScreen() {
  const { theme, spacing, radius, typography } = useTheme();

  return (
    <>
      <Stack.Screen options={{ title: 'Oops!' }} />
      <View
        style={[
          styles.container,
          {
            backgroundColor: theme.colors.background,
            padding: spacing.xl,
          },
        ]}
      >
        <View
          style={{
            width: 72,
            height: 72,
            borderRadius: radius.full,
            backgroundColor: theme.colors.brandLight,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: spacing.lg,
          }}
        >
          <AlertCircle size={36} color={theme.colors.brand} strokeWidth={2.5} />
        </View>

        <Text
          style={{
            fontSize: typography.fontSizes.xxl,
            fontWeight: typography.fontWeights.heavy,
            color: theme.colors.textPrimary,
            marginBottom: spacing.xs,
            textAlign: 'center',
          }}
        >
          404 - Page Not Found
        </Text>

        <Text
          style={{
            fontSize: typography.fontSizes.sm,
            color: theme.colors.textSecondary,
            textAlign: 'center',
            lineHeight: 20,
            marginBottom: spacing.xl,
            maxWidth: 360,
          }}
        >
          This screen does not exist or may have been moved.
        </Text>

        <Link href="/(tabs)" asChild>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Back to Home"
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.sm,
              backgroundColor: theme.colors.brand,
              paddingHorizontal: spacing.xl,
              paddingVertical: spacing.md,
              borderRadius: radius.xl,
              shadowColor: theme.colors.brand,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.2,
              shadowRadius: 8,
              elevation: 4,
            }}
          >
            <Home size={18} color="#FFFFFF" strokeWidth={2.5} />
            <Text
              style={{
                color: '#FFFFFF',
                fontSize: typography.fontSizes.md,
                fontWeight: typography.fontWeights.bold,
              }}
            >
              Back to Home
            </Text>
          </TouchableOpacity>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
