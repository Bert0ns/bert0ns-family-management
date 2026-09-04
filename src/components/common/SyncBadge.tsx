import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Cloud, CloudOff, Check, RefreshCw, AlertCircle } from 'lucide-react-native';
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
        icon: <ActivityIndicator size={12} color={theme.colors.brand} />,
      };
    }
    switch (status) {
      case 'synced':
        return {
          label: t.sync.statusSynced,
          color: theme.colors.success,
          icon: <Check size={12} color={theme.colors.success} />,
        };
      case 'error':
        return {
          label: t.sync.statusError,
          color: theme.colors.danger,
          icon: <AlertCircle size={12} color={theme.colors.danger} />,
        };
      case 'offline':
      default:
        return {
          label: t.sync.statusOffline,
          color: theme.colors.textMuted,
          icon: <CloudOff size={12} color={theme.colors.textMuted} />,
        };
    }
  };

  const { label, color, icon } = getStatusDetails();

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={handlePress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: spacing.sm,
        paddingVertical: 4,
        borderRadius: radius.full,
        backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.04)',
        borderWidth: 1,
        borderColor: theme.isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
      }}
    >
      {icon}
      {showLabel && (
        <Text
          style={{
            fontSize: typography.fontSizes.xs,
            fontWeight: typography.fontWeights.medium,
            color,
          }}
        >
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
};
