import React, { useState } from 'react';
import {
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  ActivityIndicator,
} from 'react-native';
import { Text, View } from './Themed';
import { Ionicons } from '@expo/vector-icons';
import { AccountProvider } from '@/types/meeting';
import Colors from '@/constants/Colors';
import { useColorScheme } from './useColorScheme';
import { getCalendarRedirectUri } from '@/constants/CalendarConfig';

interface SpecifyAccountModalProps {
  visible: boolean;
  provider: AccountProvider;
  onClose: () => void;
  onSubmit?: (email: string) => Promise<{ success: boolean; error?: string } | void> | void;
  onConnect?: (email: string) => Promise<{ success: boolean; error?: string } | void> | any;
  isConnecting?: boolean;
}

export function SpecifyAccountModal({
  visible,
  provider,
  onClose,
  onSubmit,
  onConnect,
  isConnecting = false,
}: SpecifyAccountModalProps) {
  const theme = useColorScheme();
  const colors = Colors[theme];
  const [email, setEmail] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const isGoogle = provider === 'google';
  const providerTitle = isGoogle ? 'Google Account' : 'Microsoft Account';
  const providerColor = isGoogle ? '#EA4335' : '#0078D4';
  const redirectUri = getCalendarRedirectUri();

  const handleAuthorize = async () => {
    setErrorMsg('');
    const targetEmail = email.trim();
    if (!targetEmail || !targetEmail.includes('@')) {
      setErrorMsg('Please enter a valid email address');
      return;
    }
    try {
      const submitFn = onSubmit || onConnect;
      const res: any = submitFn ? await submitFn(targetEmail) : undefined;
      if (res && !res.success && res.error) {
        setErrorMsg(res.error);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Authentication failed. Please try again.');
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              style={styles.keyboardWrap}>
              <View
                style={[
                  styles.modalCard,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.cardBorder,
                  },
                ]}>
                {/* Header */}
                <View style={styles.headerRow}>
                  <View style={[styles.iconWrap, { backgroundColor: `${providerColor}15` }]}>
                    <Ionicons
                      name={isGoogle ? 'logo-google' : 'logo-windows'}
                      size={20}
                      color={providerColor}
                    />
                  </View>
                  <View style={styles.headerTextWrap}>
                    <Text style={[styles.title, { color: colors.text }]}>
                      Connect {providerTitle}
                    </Text>
                    <Text style={[styles.subTitle, { color: colors.textSecondary }]}>
                      Sign in with your account to sync your calendar
                    </Text>
                  </View>
                  <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                    <Ionicons name="close" size={20} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                {/* Email Input */}
                <View style={styles.inputSection}>
                  <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                    Target Email Address
                  </Text>
                  <View
                    style={[
                      styles.inputContainer,
                      {
                        backgroundColor: colors.surface,
                        borderColor: errorMsg ? '#EF4444' : colors.cardBorder,
                      },
                    ]}>
                    <Ionicons
                      name="mail-outline"
                      size={18}
                      color={colors.textMuted}
                      style={{ marginRight: 8 }}
                    />
                    <TextInput
                      style={[styles.textInput, { color: colors.text }]}
                      placeholder="e.g. singh.sukhjeet2019@gmail.com"
                      placeholderTextColor={colors.textMuted}
                      value={email}
                      onChangeText={(val) => {
                        setEmail(val);
                        if (errorMsg) setErrorMsg('');
                      }}
                      autoCapitalize="none"
                      keyboardType="email-address"
                    />
                  </View>
                </View>

                {/* Explanatory Note for Authorized Redirect URIs */}
                <View
                  style={[
                    styles.guideBox,
                    {
                      backgroundColor: theme === 'dark' ? '#1E293B' : '#F1F5F9',
                      borderColor: colors.cardBorder,
                    },
                  ]}>
                  <Ionicons
                    name="shield-checkmark-outline"
                    size={16}
                    color={colors.tint}
                    style={{ marginRight: 8, marginTop: 2 }}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.guideTitle, { color: colors.text }]}>
                      Authorized Redirect URI
                    </Text>
                    <Text style={[styles.guideText, { color: colors.textSecondary }]}>
                      Ensure this URI is registered in Google Cloud Console under Credentials &gt; Web Client ID &gt; <Text style={{ fontWeight: '700', color: colors.text }}>Authorized redirect URIs</Text>:
                    </Text>
                    <View style={{ backgroundColor: colors.surface, padding: 6, borderRadius: 6, marginVertical: 4 }}>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: colors.tint }} selectable>
                        {redirectUri}
                      </Text>
                    </View>
                    <Text style={[styles.guideText, { color: colors.textSecondary }]}>
                      • Matches across web browser and mobile app.
                    </Text>
                  </View>
                </View>

                {/* Error Banner */}
                {Boolean(errorMsg) && (
                  <View style={styles.errorBox}>
                    <Ionicons name="alert-circle-outline" size={16} color="#EF4444" style={{ marginRight: 6 }} />
                    <Text style={styles.errorText}>{errorMsg}</Text>
                  </View>
                )}

                {/* Action Buttons */}
                <View style={styles.actionsRow}>
                  <TouchableOpacity
                    onPress={onClose}
                    disabled={isConnecting}
                    style={[styles.cancelBtn, { borderColor: colors.cardBorder }]}>
                    <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>
                      Cancel
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handleAuthorize}
                    disabled={isConnecting}
                    style={[styles.submitBtn, { backgroundColor: colors.primary }]}>
                    {isConnecting ? (
                      <View style={styles.submitBtnContent}>
                        <ActivityIndicator size="small" color={colors.primaryText} style={{ marginRight: 6 }} />
                        <Text style={[styles.submitBtnText, { color: colors.primaryText }]}>
                          Connecting...
                        </Text>
                      </View>
                    ) : (
                      <Text style={[styles.submitBtnText, { color: colors.primaryText }]}>
                        Continue to OAuth
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </KeyboardAvoidingView>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 18,
  },
  keyboardWrap: {
    width: '100%',
    maxWidth: 440,
  },
  modalCard: {
    width: '100%',
    borderRadius: 28,
    borderWidth: 1,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    backgroundColor: 'transparent',
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerTextWrap: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
  },
  subTitle: {
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
  },
  inputSection: {
    marginBottom: 12,
    backgroundColor: 'transparent',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  textInput: {
    flex: 1,
    fontSize: 13,
    padding: 0,
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
    color: '#EF4444',
    fontSize: 12,
    flex: 1,
  },
  guideBox: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 16,
  },
  guideTitle: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  guideText: {
    fontSize: 11,
    lineHeight: 15,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    backgroundColor: 'transparent',
  },
  cancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  submitBtn: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
    minWidth: 140,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
