import React, { useState, useEffect } from 'react';
import { Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { CloudOff, Check, AlertCircle } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { useI18n } from '@/i18n';
import { syncEngine } from '@/services/syncEngine';
import { useAppStore } from '@/services/store';
import { SyncStatus } from '@/types';

interface SyncBadgeProps {
  onPress?: () => void;
  showLabel?: boolean;
}

export const SyncBadge: React.FC<SyncBadgeProps> = ({ onPress, showLabel = true }) => {
  const { theme, spacing, radius, typography } = useTheme();
  const { t } = useI18n();
  const { family } = useAppStore();
  const [status, setStatus] = useState<SyncStatus>(syncEngine.getSyncStatus());
  const [isManualSyncing, setIsManualSyncing] = useState(false);

  useEffect(() => {
    const unsubscribe = syncEngine.subscribeSyncStatus((newStatus) => {
      setStatus(newStatus);
    });
    return unsubscribe;
  }, []);

  const handlePress = async () => {
    if (onPress) {
      onPress();
      return;
    }

    if (isManualSyncing) return;
    setIsManualSyncing(true);
    try {
      await syncEngine.flushOutbox();
      if (family?.id) {
        await syncEngine.fetchDelta(family.id);
      }
    } finally {
      setIsManualSyncing(false);
    }
  };

  const getStatusDetails = () => {
    if (isManualSyncing || status === 'syncing') {
      return {
        label: t.sync.statusSyncing,
        color: theme.colors.brand,
        icon: <ActivityIndicator size={14} color={theme.colors.brand} />,
      };
    }
    switch (status) {
      case 'synced':
        return {
          label: t.sync.statusSynced,
          color: theme.colors.success,
          icon: <Check size={14} color={theme.colors.success} strokeWidth={2.5} />,
        };
      case 'error':
        return {
          label: t.sync.statusError,
          color: theme.colors.danger,
          icon: <AlertCircle size={14} color={theme.colors.danger} strokeWidth={2.5} />,
        };
      case 'offline':
      default:
        return {
          label: t.sync.statusOffline,
          color: theme.colors.textMuted,
          icon: <CloudOff size={14} color={theme.colors.textMuted} strokeWidth={2.5} />,
        };
    }
  };

  const { label, color, icon } = getStatusDetails();

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={handlePress}
      accessibilityLabel={`Sync: ${label}`}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: spacing.sm + 2,
        paddingVertical: 6,
        minHeight: 36,
        borderRadius: radius.full,
        backgroundColor: theme.isDark ? 'rgba(34, 42, 61, 0.8)' : 'rgba(241, 245, 249, 0.9)',
        borderWidth: 1.5,
        borderColor: theme.colors.borderTactile,
      }}
    >
      {icon}
      {showLabel && (
        <Text
          style={{
            fontSize: typography.fontSizes.xs,
            fontWeight: typography.fontWeights.bold,
            color,
            letterSpacing: 0.2,
            flexShrink: 1,
          }}
          numberOfLines={1}
        >
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
};
