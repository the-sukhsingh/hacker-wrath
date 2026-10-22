import React, { useState } from 'react';
import {
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Text, View } from './Themed';
import { Ionicons } from '@expo/vector-icons';
import { AccountProvider } from '@/types/meeting';
import Colors from '@/constants/Colors';
import { useColorScheme } from './useColorScheme';
import {
  isGoogleConfigured,
  isMicrosoftConfigured,
} from '@/constants/CalendarConfig';

interface ConnectAccountModalProps {
  visible: boolean;
  onClose: () => void;
  onConnect: (provider: AccountProvider, email: string) => Promise<boolean | void>;
  initialProvider?: AccountProvider;
}

function ConnectAccountModalBody({
  onClose,
  onConnect,
  initialProvider = 'google',
}: Omit<ConnectAccountModalProps, 'visible'>) {
  const theme = useColorScheme();
  const colors = Colors[theme];

  const [selectedProvider, setSelectedProvider] = useState<AccountProvider>(initialProvider);
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const hasLiveCredentials =
    selectedProvider === 'google'
      ? isGoogleConfigured()
      : selectedProvider === 'outlook'
      ? isMicrosoftConfigured()
      : false;

  const getProviderMeta = (provider: AccountProvider) => {
    switch (provider) {
      case 'google':
        return {
          title: 'Google Calendar',
          defaultEmail: 'alex.chen@work.com',
          name: 'Google Workspace',
          icon: 'logo-google' as const,
          color: '#EA4335',
          scopes: ['calendar.readonly', 'userinfo.email', 'userinfo.profile'],
          apiDoc: 'Google Calendar REST API v3',
        };
      case 'outlook':
        return {
          title: 'Microsoft 365 Outlook',
          defaultEmail: 'alex.chen@enterprise.com',
          name: 'Microsoft 365 Exchange',
          icon: 'logo-windows' as const,
          color: '#0078D4',
          scopes: ['Calendars.Read', 'User.Read', 'offline_access'],
          apiDoc: 'Microsoft Graph API v1.0',
        };
      case 'apple':
        return {
          title: 'Apple iCloud Calendar',
          defaultEmail: 'alexchen@icloud.com',
          name: 'iCloud Calendar',
          icon: 'logo-apple' as const,
          color: theme === 'dark' ? '#F8FAFC' : '#0F172A',
          scopes: ['CalDAV / Local EventKit'],
          apiDoc: 'EventKit Local Calendar Sync',
        };
    }
  };

  const currentMeta = getProviderMeta(selectedProvider);

  const handleConnect = async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const finalEmail = email.trim() || currentMeta.defaultEmail;
      await onConnect(selectedProvider, finalEmail);
      setEmail('');
      onClose();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to authenticate and link account.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.overlay}>
      <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.heading, { color: colors.text }]}>Connect Calendar</Text>
            <Text style={[styles.subheading, { color: colors.textSecondary }]}>
              {hasLiveCredentials ? 'Live OAuth 2.0 Integration' : 'Sandbox / Instant Sync Mode'}
            </Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Provider Selector Tabs */}
        <View style={styles.providersRow}>
          {(['google', 'outlook', 'apple'] as AccountProvider[]).map((p) => {
            const meta = getProviderMeta(p);
            const isSelected = selectedProvider === p;
            return (
              <TouchableOpacity
                key={p}
                onPress={() => {
                  setSelectedProvider(p);
                  setErrorMessage(null);
                }}
                style={[
                  styles.providerTab,
                  {
                    backgroundColor: isSelected ? colors.surface : 'transparent',
                    borderColor: isSelected ? colors.accent : colors.cardBorder,
                  },
                ]}>
                <Ionicons name={meta.icon} size={18} color={meta.color} />
                <Text
                  style={[
                    styles.providerTabText,
                    {
                      color: isSelected ? colors.text : colors.textSecondary,
                      fontWeight: isSelected ? '600' : '400',
                    },
                  ]}>
                  {p === 'google' ? 'Google' : p === 'outlook' ? 'Outlook' : 'Apple'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Mode Badge & API Info */}
        <View style={[styles.modeInfoBox, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
          <View style={styles.modeRow}>
            <View
              style={[
                styles.modeIndicator,
                { backgroundColor: hasLiveCredentials ? '#10B981' : '#F59E0B' },
              ]}
            />
            <Text style={[styles.modeTitle, { color: colors.text }]}>
              {hasLiveCredentials
                ? 'Live API Credentials Active'
                : 'Sandbox Demonstration Active'}
            </Text>
          </View>
          <Text style={[styles.modeDesc, { color: colors.textSecondary }]}>
            {hasLiveCredentials
              ? `Authorizes via standard OAuth 2.0 and fetches your live events from ${currentMeta.apiDoc}.`
              : `Instant testing mode: syncs realistic ${currentMeta.title} events without requiring immediate API keys. Live credentials can be added to your .env file anytime.`}
          </Text>

          <View style={styles.scopesRow}>
            <Text style={[styles.scopesLabel, { color: colors.textMuted }]}>Permissions:</Text>
            {currentMeta.scopes.map((s, idx) => (
              <View key={idx} style={[styles.scopeChip, { borderColor: colors.cardBorder }]}>
                <Text style={[styles.scopeText, { color: colors.textSecondary }]}>{s}</Text>
              </View>
            ))}
          </View>
        </View>

        {errorMessage && (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle-outline" size={16} color="#EF4444" style={{ marginRight: 6 }} />
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        )}

        {/* Account Identifier Input */}
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.text }]}>Account Email</Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.surface,
                borderColor: colors.cardBorder,
                color: colors.text,
              },
            ]}
            placeholder={currentMeta.defaultEmail}
            placeholderTextColor={colors.textMuted}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        {/* Submit Action */}
        <TouchableOpacity
          onPress={handleConnect}
          disabled={isLoading}
          style={[styles.submitBtn, { backgroundColor: colors.primary }]}>
          {isLoading ? (
            <ActivityIndicator color={colors.primaryText} />
          ) : (
            <View style={styles.submitBtnInner}>
              <Ionicons
                name={hasLiveCredentials ? 'shield-checkmark-outline' : 'flash-outline'}
                size={16}
                color={colors.primaryText}
                style={{ marginRight: 6 }}
              />
              <Text style={[styles.submitBtnText, { color: colors.primaryText }]}>
                {hasLiveCredentials
                  ? `Sign In & Link ${currentMeta.title}`
                  : `Connect ${currentMeta.title}`}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

export function ConnectAccountModal(props: ConnectAccountModalProps) {
  if (!props.visible) return null;

  return (
    <Modal visible={props.visible} transparent animationType="slide" onRequestClose={props.onClose}>
      <ConnectAccountModalBody
        key={`${props.initialProvider || 'google'}`}
        onClose={props.onClose}
        onConnect={props.onConnect}
        initialProvider={props.initialProvider}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 440,
    borderRadius: 18,
    borderWidth: 1,
    padding: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    backgroundColor: 'transparent',
    marginBottom: 16,
  },
  heading: {
    fontSize: 18,
    fontWeight: '700',
  },
  subheading: {
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  providersRow: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: 'transparent',
    marginBottom: 14,
  },
  providerTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    gap: 6,
  },
  providerTabText: {
    fontSize: 13,
  },
  modeInfoBox: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 14,
  },
  modeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    backgroundColor: 'transparent',
  },
  modeIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  modeTitle: {
    fontSize: 12,
    fontWeight: '600',
  },
  modeDesc: {
    fontSize: 11,
    lineHeight: 15,
    marginBottom: 8,
  },
  scopesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'transparent',
  },
  scopesLabel: {
    fontSize: 10,
    fontWeight: '500',
    marginRight: 2,
  },
  scopeChip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  scopeText: {
    fontSize: 10,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EF444415',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    flex: 1,
  },
  inputGroup: {
    backgroundColor: 'transparent',
    marginBottom: 18,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
  },
  submitBtn: {
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
