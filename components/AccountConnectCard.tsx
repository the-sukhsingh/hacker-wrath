import React from 'react';
import { StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Text, View } from './Themed';
import { Ionicons } from '@expo/vector-icons';
import { ConnectedAccount, AccountProvider } from '@/types/meeting';
import Colors from '@/constants/Colors';
import { useColorScheme } from './useColorScheme';

interface AccountConnectCardProps {
  account: ConnectedAccount;
  onConnectPress: () => void;
  onDisconnectPress: () => void;
  onSyncPress: () => void;
  onSpecifyEmailPress?: () => void;
  isSyncing?: boolean;
  isConnecting?: boolean;
}

export function AccountConnectCard({
  account,
  onConnectPress,
  onDisconnectPress,
  onSyncPress,
  onSpecifyEmailPress,
  isSyncing = false,
  isConnecting = false,
}: AccountConnectCardProps) {
  const theme = useColorScheme();
  const colors = Colors[theme];

  const getProviderMeta = (provider: AccountProvider) => {
    switch (provider) {
      case 'google':
        return {
          icon: 'logo-google' as const,
          color: '#EA4335',
          bg: '#EA433518',
          label: 'Google Calendar',
          desc: 'Direct OAuth 2.0 sync with your Google account',
          connectLabel: 'Sign in with Google',
        };
      case 'outlook':
        return {
          icon: 'logo-windows' as const,
          color: '#0078D4',
          bg: '#0078D418',
          label: 'Microsoft 365 Outlook',
          desc: 'Direct Microsoft Entra ID sync with Exchange and Teams',
          connectLabel: 'Sign in with Microsoft',
        };
      case 'apple':
        return {
          icon: 'logo-apple' as const,
          color: colors.onSurface,
          bg: colors.surfaceContainerHighest,
          label: 'Apple iCloud Calendar',
          desc: 'Sync local iOS & iCloud calendar schedules',
          connectLabel: 'Link Apple Calendar',
        };
    }
  };

  const meta = getProviderMeta(account.provider);

  return (
    <View
      style={[
        styles.m3Card,
        {
          backgroundColor: colors.surfaceContainerLow,
          borderColor: account.isConnected ? colors.accent : colors.outlineVariant,
        },
      ]}>
      <View style={styles.headerRow}>
        <View style={[styles.iconWrap, { backgroundColor: meta.bg }]}>
          <Ionicons name={meta.icon} size={22} color={meta.color} />
        </View>

        <View style={styles.infoCol}>
          <View style={styles.titleRow}>
            <Text style={[styles.title, { color: colors.onSurface }]}>{meta.label}</Text>
            {account.isConnected && (
              <View style={[styles.connectedBadge, { backgroundColor: colors.accentLight }]}>
                <Ionicons name="checkmark-circle" size={13} color={colors.accent} style={{ marginRight: 3 }} />
                <Text style={[styles.connectedBadgeText, { color: colors.accent }]}>Connected</Text>
              </View>
            )}
          </View>
          <Text style={[styles.desc, { color: colors.onSurfaceVariant }]}>
            {account.isConnected ? account.email : meta.desc}
          </Text>
          {account.isConnected && (
            <Text style={[styles.syncTime, { color: colors.onSurfaceVariant }]}>
              {account.lastSyncedAt ? `Last synced: ${account.lastSyncedAt}` : 'Ready to sync'} • {account.syncCount} events linked
            </Text>
          )}
        </View>
      </View>

      <View style={[styles.actionsRow, { borderTopColor: colors.outlineVariant }]}>
        {account.isConnected ? (
          <>
            <TouchableOpacity
              onPress={onSyncPress}
              disabled={isSyncing}
              style={[styles.m3TonalBtn, { backgroundColor: colors.secondaryContainer }]}>
              {isSyncing ? (
                <ActivityIndicator size="small" color={colors.onSecondaryContainer} style={{ marginRight: 6 }} />
              ) : (
                <Ionicons name="sync" size={14} color={colors.onSecondaryContainer} style={{ marginRight: 6 }} />
              )}
              <Text style={[styles.m3TonalBtnText, { color: colors.onSecondaryContainer }]}>
                {isSyncing ? 'Syncing...' : 'Sync Now'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={onDisconnectPress} style={styles.disconnectBtn}>
              <Text style={[styles.disconnectBtnText, { color: colors.error }]}>Disconnect</Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity
            onPress={onConnectPress}
            disabled={isConnecting}
            style={[styles.m3FilledBtn, { backgroundColor: colors.primary }]}>
            {isConnecting ? (
              <ActivityIndicator size="small" color={colors.onPrimary} style={{ marginRight: 6 }} />
            ) : (
              <Ionicons name={meta.icon} size={15} color={colors.onPrimary} style={{ marginRight: 6 }} />
            )}
            <Text style={[styles.m3FilledBtnText, { color: colors.onPrimary }]}>
              {isConnecting ? 'Authenticating...' : meta.connectLabel}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  m3Card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'transparent',
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  infoCol: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
    backgroundColor: 'transparent',
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
  },
  connectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  connectedBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  desc: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 4,
  },
  syncTime: {
    fontSize: 11,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    backgroundColor: 'transparent',
  },
  m3TonalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  m3TonalBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  disconnectBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  disconnectBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  m3FilledBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    width: '100%',
  },
  m3FilledBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
