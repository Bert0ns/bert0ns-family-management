import React from 'react';
import { View, Text } from 'react-native';
import { Code, Sparkles } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { useI18n } from '@/i18n';
import { SAMPLE_IMPORT_REPORT } from '@/data/mockData';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';

interface SchemaViewerProps {
  onLoadSample: () => void;
}

export const SchemaViewer: React.FC<SchemaViewerProps> = ({ onLoadSample }) => {
  const { theme, spacing, radius, typography } = useTheme();
  const { t } = useI18n();

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
            {t.import.schemaTitle}
          </Text>
        </View>

        <Button
          title={t.import.loadSample}
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
        {t.import.schemaSubtitle}
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
