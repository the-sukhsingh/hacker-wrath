import React, { useState } from 'react';
import {
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, View } from '@/components/Themed';
import { Ionicons } from '@expo/vector-icons';
import { useMeetingStore } from '@/store/meetingStore';
import { ModelManagerCard } from '@/components/ModelManagerCard';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

export default function SettingsScreen() {
  const theme = useColorScheme();
  const colors = Colors[theme];
  const insets = useSafeAreaInsets();

  const {
    settings,
    updateSettings,
    recordings,
    meetings,
    clearAllRecordings,
    eraseAllData,
  } = useMeetingStore();

  const [confirmEraseOpen, setConfirmEraseOpen] = useState(false);
  const [confirmClearRecOpen, setConfirmClearRecOpen] = useState(false);

  // Edit user profile state
  const [editingProfile, setEditingProfile] = useState(false);
  const [nameInput, setNameInput] = useState(settings.userName || 'User');
  const [emailInput, setEmailInput] = useState(settings.userEmail || 'user@example.com');

  const totalRecordingBytes = recordings.reduce((acc, r) => acc + r.fileSizeBytes, 0);
  const formattedStorage = (totalRecordingBytes / (1024 * 1024)).toFixed(2);

  const handleSaveProfile = () => {
    updateSettings({
      userName: nameInput.trim() || 'User',
      userEmail: emailInput.trim() || 'user@example.com',
    });
    setEditingProfile(false);
  };

  const handleClearRecordings = () => {
    clearAllRecordings();
    setConfirmClearRecOpen(false);
  };

  const handleEraseAll = () => {
    eraseAllData();
    setConfirmEraseOpen(false);
  };

  const userInitials = (settings.userName || 'U')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  return (
    <View style={[styles.screen, { backgroundColor: colors.background, paddingTop: Math.max(insets.top, 16) }]}>
      {/* Clean Screen Title Header */}
      <View style={styles.topHeader}>
        <Text style={[styles.screenTitle, { color: colors.text }]}>Settings</Text>
        <Text style={[styles.screenSub, { color: colors.textSecondary }]}>Preferences, account & local storage</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* 1. USER PROFILE SECTION */}
        <View style={[styles.card, { backgroundColor: colors.surfaceContainerLow, borderColor: colors.outlineVariant }]}>
          <View style={styles.profileRow}>
            <View style={[styles.avatarCircle, { backgroundColor: colors.primaryContainer }]}>
              <Text style={[styles.avatarText, { color: colors.onPrimaryContainer }]}>{userInitials}</Text>
            </View>

            <View style={{ flex: 1 }}>
              <Text style={[styles.profileName, { color: colors.onSurface }]}>{settings.userName}</Text>
              <Text style={[styles.profileEmail, { color: colors.onSurfaceVariant }]}>{settings.userEmail}</Text>
            </View>

            <TouchableOpacity
              onPress={() => setEditingProfile(true)}
              style={[styles.editProfileBtn, { backgroundColor: colors.secondaryContainer }]}>
              <Text style={[styles.editProfileText, { color: colors.onSecondaryContainer }]}>Edit</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 2. RECORDING PREFERENCES */}
        <View style={[styles.card, { backgroundColor: colors.surfaceContainerLow, borderColor: colors.outlineVariant }]}>
          <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>Audio Recording</Text>
          <Text style={[styles.sectionDesc, { color: colors.onSurfaceVariant }]}>
            High-fidelity 16kHz PCM WAV configured for Whisper STT
          </Text>

          <View style={styles.optionsList}>
            <View style={styles.optionRow}>
              <View>
                <Text style={[styles.optionLabel, { color: colors.onSurface }]}>Sampling Rate</Text>
                <Text style={[styles.optionSub, { color: colors.onSurfaceVariant }]}>16,000 Hz Mono</Text>
              </View>
              <Ionicons name="checkmark-circle" size={18} color={colors.accent} />
            </View>

            <View style={[styles.divider, { backgroundColor: colors.outlineVariant }]} />

            <View style={styles.optionRow}>
              <View>
                <Text style={[styles.optionLabel, { color: colors.onSurface }]}>Audio Quality</Text>
                <Text style={[styles.optionSub, { color: colors.onSurfaceVariant }]}>Lossless PCM (16-bit)</Text>
              </View>
              <Text style={[styles.optionVal, { color: colors.onSurfaceVariant }]}>High</Text>
            </View>
          </View>
        </View>

        {/* 3. INTELLIGENCE & PRIVACY ENGINE */}
        <View style={[styles.card, { backgroundColor: colors.surfaceContainerLow, borderColor: colors.outlineVariant }]}>
          <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>AI Engine</Text>
          <Text style={[styles.sectionDesc, { color: colors.onSurfaceVariant }]}>
            Process speech on-device or connect cloud API
          </Text>

          <View style={styles.engineToggleRow}>
            {/* Mode: On-Device */}
            <TouchableOpacity
              onPress={() => updateSettings({ engineMode: 'local' })}
              style={[
                styles.engineChoice,
                {
                  backgroundColor: settings.engineMode === 'local' ? colors.secondaryContainer : colors.surfaceContainerHigh,
                  borderColor: settings.engineMode === 'local' ? colors.primary : colors.outlineVariant,
                },
              ]}>
              <View style={styles.choiceHeader}>
                <Ionicons name="shield-checkmark" size={16} color={colors.accent} />
                <Text style={[styles.choiceTitle, { color: colors.onSurface }]}>On-Device (Private)</Text>
              </View>
              <Text style={[styles.choiceSub, { color: colors.onSurfaceVariant }]}>
                100% offline Whisper STT + Google Gemma SLM task extraction. Zero server transmission.
              </Text>
            </TouchableOpacity>

            {/* Mode: Cloud */}
            <TouchableOpacity
              onPress={() => updateSettings({ engineMode: 'cloud' })}
              style={[
                styles.engineChoice,
                {
                  backgroundColor: settings.engineMode === 'cloud' ? colors.secondaryContainer : colors.surfaceContainerHigh,
                  borderColor: settings.engineMode === 'cloud' ? colors.primary : colors.outlineVariant,
                },
              ]}>
              <View style={styles.choiceHeader}>
                <Ionicons name="cloud-outline" size={16} color={colors.primary} />
                <Text style={[styles.choiceTitle, { color: colors.onSurface }]}>Cloud API</Text>
              </View>
              <Text style={[styles.choiceSub, { color: colors.onSurfaceVariant }]}>
                Fast summarization using Gemini Flash or OpenAI.
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 3B. ON-DEVICE WHISPER MODEL MANAGER */}
        <ModelManagerCard />

        {/* 4. STORAGE & DATA MANAGEMENT */}
        <View style={[styles.card, { backgroundColor: colors.surfaceContainerLow, borderColor: colors.outlineVariant }]}>
          <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>Storage & Data</Text>
          <Text style={[styles.sectionDesc, { color: colors.onSurfaceVariant }]}>
            Control cached data and audio stored on your device
          </Text>

          <View style={styles.storageMetrics}>
            <View style={styles.metricItem}>
              <Text style={[styles.metricNumber, { color: colors.text }]}>{recordings.length}</Text>
              <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Recordings</Text>
            </View>
            <View style={[styles.metricDivider, { backgroundColor: colors.cardBorder }]} />
            <View style={styles.metricItem}>
              <Text style={[styles.metricNumber, { color: colors.text }]}>{meetings.length}</Text>
              <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Meetings</Text>
            </View>
            <View style={[styles.metricDivider, { backgroundColor: colors.cardBorder }]} />
            <View style={styles.metricItem}>
              <Text style={[styles.metricNumber, { color: colors.text }]}>{formattedStorage} MB</Text>
              <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Storage</Text>
            </View>
          </View>

          <View style={styles.actionButtonsList}>
            <TouchableOpacity
              onPress={() => setConfirmClearRecOpen(true)}
              style={[styles.outlineActionBtn, { borderColor: colors.cardBorder }]}>
              <Ionicons name="trash-outline" size={16} color={colors.text} style={{ marginRight: 6 }} />
              <Text style={[styles.outlineActionBtnText, { color: colors.text }]}>Clear Audio Recordings</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setConfirmEraseOpen(true)}
              style={[styles.dangerActionBtn, { backgroundColor: colors.dangerLight }]}>
              <Ionicons name="alert-circle-outline" size={16} color="#EF4444" style={{ marginRight: 6 }} />
              <Text style={styles.dangerActionBtnText}>Erase All Data & Reset App</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* App Info Footer */}
        <View style={styles.appFooter}>
          <Text style={[styles.appVersion, { color: colors.textMuted }]}>Hacker-Wrath v1.0.0</Text>
          <Text style={[styles.appNotice, { color: colors.textMuted }]}>
            Offline-first privacy meeting companion
          </Text>
        </View>
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal visible={editingProfile} transparent animationType="fade" onRequestClose={() => setEditingProfile(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Edit Profile</Text>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Display Name</Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: colors.surface, borderColor: colors.cardBorder, color: colors.text }]}
                value={nameInput}
                onChangeText={setNameInput}
                placeholder="Your Name"
                placeholderTextColor={colors.textMuted}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Email Address</Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: colors.surface, borderColor: colors.cardBorder, color: colors.text }]}
                value={emailInput}
                onChangeText={setEmailInput}
                placeholder="your.email@example.com"
                placeholderTextColor={colors.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.modalButtonsRow}>
              <TouchableOpacity
                onPress={() => setEditingProfile(false)}
                style={[styles.modalBtnSecondary, { borderColor: colors.cardBorder }]}>
                <Text style={[styles.modalBtnSecondaryText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSaveProfile}
                style={[styles.modalBtnPrimary, { backgroundColor: colors.primary }]}>
                <Text style={[styles.modalBtnPrimaryText, { color: colors.primaryText }]}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Confirm Clear Recordings Modal */}
      <Modal visible={confirmClearRecOpen} transparent animationType="fade" onRequestClose={() => setConfirmClearRecOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Clear Recordings?</Text>
            <Text style={[styles.modalBody, { color: colors.textSecondary }]}>
              This will delete all saved audio recording files from your local storage. Meeting notes will remain intact.
            </Text>

            <View style={styles.modalButtonsRow}>
              <TouchableOpacity
                onPress={() => setConfirmClearRecOpen(false)}
                style={[styles.modalBtnSecondary, { borderColor: colors.cardBorder }]}>
                <Text style={[styles.modalBtnSecondaryText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleClearRecordings}
                style={[styles.modalBtnPrimary, { backgroundColor: '#EF4444' }]}>
                <Text style={[styles.modalBtnPrimaryText, { color: '#FFFFFF' }]}>Clear Recordings</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Confirm Erase All Data Modal */}
      <Modal visible={confirmEraseOpen} transparent animationType="fade" onRequestClose={() => setConfirmEraseOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Text style={[styles.modalTitle, { color: '#EF4444' }]}>Erase All Data?</Text>
            <Text style={[styles.modalBody, { color: colors.textSecondary }]}>
              This will permanently delete all meetings, voice recordings, and disconnected calendar data. This action cannot be undone.
            </Text>

            <View style={styles.modalButtonsRow}>
              <TouchableOpacity
                onPress={() => setConfirmEraseOpen(false)}
                style={[styles.modalBtnSecondary, { borderColor: colors.cardBorder }]}>
                <Text style={[styles.modalBtnSecondaryText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleEraseAll}
                style={[styles.modalBtnPrimary, { backgroundColor: '#EF4444' }]}>
                <Text style={[styles.modalBtnPrimaryText, { color: '#FFFFFF' }]}>Erase All</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  topHeader: {
    paddingHorizontal: 20,
    paddingBottom: 14,
    backgroundColor: 'transparent',
  },
  screenTitle: {
    fontSize: 26,
    fontWeight: '700',
  },
  screenSub: {
    fontSize: 12,
    marginTop: 2,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 40,
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    gap: 14,
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
  },
  profileName: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  profileEmail: {
    fontSize: 12,
    marginTop: 2,
  },
  editProfileBtn: {
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 16,
  },
  editProfileText: {
    fontSize: 12,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
    marginBottom: 4,
  },
  sectionDesc: {
    fontSize: 12,
    marginBottom: 14,
    lineHeight: 16,
  },
  optionsList: {
    backgroundColor: 'transparent',
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    backgroundColor: 'transparent',
  },
  optionLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  optionSub: {
    fontSize: 11,
    marginTop: 1,
  },
  optionVal: {
    fontSize: 12,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    marginVertical: 4,
  },
  engineToggleRow: {
    gap: 10,
    backgroundColor: 'transparent',
  },
  engineChoice: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  choiceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
    backgroundColor: 'transparent',
  },
  choiceTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  choiceSub: {
    fontSize: 11,
    lineHeight: 15,
  },
  storageMetrics: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: 'transparent',
    marginBottom: 14,
  },
  metricItem: {
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  metricNumber: {
    fontSize: 16,
    fontWeight: '700',
  },
  metricLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  metricDivider: {
    width: 1,
    height: 22,
  },
  actionButtonsList: {
    gap: 10,
    backgroundColor: 'transparent',
  },
  outlineActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  outlineActionBtnText: {
    fontSize: 13,
    fontWeight: '500',
  },
  dangerActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
  },
  dangerActionBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#EF4444',
  },
  appFooter: {
    alignItems: 'center',
    paddingVertical: 10,
    backgroundColor: 'transparent',
  },
  appVersion: {
    fontSize: 11,
    fontWeight: '500',
  },
  appNotice: {
    fontSize: 11,
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 10,
  },
  modalBody: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 18,
  },
  inputGroup: {
    backgroundColor: 'transparent',
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
  },
  modalButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
    backgroundColor: 'transparent',
  },
  modalBtnSecondary: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  modalBtnSecondaryText: {
    fontSize: 13,
    fontWeight: '600',
  },
  modalBtnPrimary: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalBtnPrimaryText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
