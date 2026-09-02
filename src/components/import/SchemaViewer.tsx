import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Code, Check, Sparkles } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { SAMPLE_IMPORT_REPORT } from '@/data/mockData';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';

interface SchemaViewerProps {
  onLoadSample: () => void;
}

export const SchemaViewer: React.FC<SchemaViewerProps> = ({ onLoadSample }) => {
  const { theme, spacing, radius, typography } = useTheme();
  const [copied, setCopied] = useState(false);

  const sampleJsonString = JSON.stringify(SAMPLE_IMPORT_REPORT, null, 2);

  return (
    <Card padding="md">
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: spacing.sm,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
          <Code size={18} color={theme.colors.brand} />
          <Text
            style={{
              color: theme.colors.textPrimary,
              fontSize: typography.fontSizes.md,
              fontWeight: typography.fontWeights.bold,
            }}
          >
            Expected JSON Format
          </Text>
        </View>

        <Button
          title="Try Sample File"
          variant="secondary"
          size="sm"
          icon={<Sparkles size={14} color={theme.colors.brand} />}
          onPress={onLoadSample}
        />
      </View>

      <Text
        style={{
          color: theme.colors.textSecondary,
          fontSize: typography.fontSizes.xs,
          marginBottom: spacing.sm,
        }}
      >
        Your files should contain an array of expenses with date, merchant, amount, and category.
      </Text>

      <View
        style={{
          backgroundColor: theme.isDark ? '#020617' : '#1E293B',
          padding: spacing.md,
          borderRadius: radius.md,
          overflow: 'hidden',
        }}
      >
        <Text
          style={{
            color: '#38BDF8',
            fontSize: 11,
            fontFamily: 'monospace',
            lineHeight: 16,
          }}
          numberOfLines={14}
        >
          {sampleJsonString}
        </Text>
      </View>
    </Card>
  );
};
