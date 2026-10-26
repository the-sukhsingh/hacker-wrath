import React, { useState } from 'react';
import {
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  Switch,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, View } from '@/components/Themed';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMeetingStore } from '@/store/meetingStore';
import { ModelManagerCard } from '@/components/ModelManagerCard';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

export default function SettingsScreen() {
  const router = useRouter();
  const theme = useColorScheme();
  const colors = Colors[theme];
  const insets = useSafeAreaInsets();

  const {
    settings,
    updateSettings,
    recordings,
    meetings,
    connectedAccounts,
    loadDemoData,
    clearAllRecordings,
    eraseAllData,
  } = useMeetingStore();

  const [confirmEraseOpen, setConfirmEraseOpen] = useState(false);
  const [confirmClearRecOpen, setConfirmClearRecOpen] = useState(false);
  const [modelManagerExpanded, setModelManagerExpanded] = useState(false);

  // Edit user profile state
  const [editingProfile, setEditingProfile] = useState(false);
  const [nameInput, setNameInput] = useState(settings.userName || 'Launa Vendrick');
  const [emailInput, setEmailInput] = useState(settings.userEmail || 'launa.vendrick@meetanotes.ai');

  const totalRecordingBytes = recordings.reduce((acc, r) => acc + r.fileSizeBytes, 0);
  const formattedStorage = (totalRecordingBytes / (1024 * 1024)).toFixed(1);

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
    Alert.alert('Recordings Cleared', 'All local audio recordings have been removed.');
  };

  const handleEraseAll = () => {
    eraseAllData();
    setConfirmEraseOpen(false);
    Alert.alert('Reset Complete', 'All meetings, recordings, and settings have been reset.');
  };

  const userInitials = (settings.userName || 'Launa Vendrick')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  return (
    <View style={[styles.screen, { backgroundColor: colors.background, paddingTop: Math.max(insets.top, 14) }]}>
      {/* 1. TOP HEADER */}
      <View style={styles.topHeader}>
        <Text style={[styles.screenTitle, { color: colors.text }]}>Settings</Text>
        <Text style={[styles.screenSubtitle, { color: colors.textSecondary }]}>
          Preferences, on-device intelligence & storage
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom + 90, 110) }]}
        showsVerticalScrollIndicator={false}>

        {/* 2. USER PROFILE HERO CELL */}
        <View style={[styles.profileCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.profileMain}>
            <View style={[styles.avatarWell, { backgroundColor: colors.amber }]}>
              <Text style={styles.avatarInitials}>{userInitials}</Text>
            </View>

            <View style={styles.profileMeta}>
              <View style={styles.profileNameRow}>
                <Text style={[styles.profileName, { color: colors.text }]} numberOfLines={1}>
                  {settings.userName || 'Launa Vendrick'}
                </Text>
                <View style={[styles.badgeVerified, { backgroundColor: colors.surfaceContainer }]}>
                  <Ionicons name="shield-checkmark" size={11} color={colors.accent} />
                  <Text style={[styles.badgeVerifiedText, { color: colors.textSecondary }]}>Verified</Text>
                </View>
              </View>
              <Text style={[styles.profileEmail, { color: colors.textSecondary }]} numberOfLines={1}>
                {settings.userEmail || 'launa.vendrick@meetanotes.ai'}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={() => {
              setNameInput(settings.userName || 'Launa Vendrick');
              setEmailInput(settings.userEmail || 'launa.vendrick@meetanotes.ai');
              setEditingProfile(true);
            }}
            style={[styles.editPillBtn, { backgroundColor: colors.surfaceContainer, borderColor: colors.border }]}>
            <Ionicons name="pencil" size={12} color={colors.text} style={{ marginRight: 4 }} />
            <Text style={[styles.editPillText, { color: colors.text }]}>Edit Profile</Text>
          </TouchableOpacity>
        </View>

        {/* 3. EXECUTION ENGINE (SEGMENTED CONTROL) */}
        <Text style={[styles.groupLabel, { color: colors.textSecondary }]}>INTELLIGENCE ENGINE</Text>
        <View style={[styles.groupedCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {/* Segmented Pill Switcher */}
          <View style={styles.engineSegmentWrapper}>
            <View style={[styles.engineSegmentBar, { backgroundColor: colors.surfaceContainer }]}>
              <TouchableOpacity
                onPress={() => updateSettings({ engineMode: 'local' })}
                style={[
                  styles.engineSegmentTab,
                  settings.engineMode === 'local' && [
                    styles.engineSegmentTabActive,
                    { backgroundColor: colors.surface, shadowColor: '#000000' },
                  ],
                ]}>
                <Ionicons
                  name="shield-checkmark"
                  size={14}
                  color={settings.engineMode === 'local' ? colors.accent : colors.textSecondary}
                  style={{ marginRight: 6 }}
                />
                <Text
                  style={[
                    styles.engineSegmentText,
                    {
                      color: settings.engineMode === 'local' ? colors.text : colors.textSecondary,
                      fontWeight: settings.engineMode === 'local' ? '700' : '500',
                    },
                  ]}>
                  On-Device (Private)
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => updateSettings({ engineMode: 'cloud' })}
                style={[
                  styles.engineSegmentTab,
                  settings.engineMode === 'cloud' && [
                    styles.engineSegmentTabActive,
                    { backgroundColor: colors.surface, shadowColor: '#000000' },
                  ],
                ]}>
                <Ionicons
                  name="cloud-outline"
                  size={14}
                  color={settings.engineMode === 'cloud' ? colors.primary : colors.textSecondary}
                  style={{ marginRight: 6 }}
                />
                <Text
                  style={[
                    styles.engineSegmentText,
                    {
                      color: settings.engineMode === 'cloud' ? colors.text : colors.textSecondary,
                      fontWeight: settings.engineMode === 'cloud' ? '700' : '500',
                    },
                  ]}>
                  Cloud API
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.engineCaption, { color: colors.textSecondary }]}>
              {settings.engineMode === 'local'
                ? 'Zero telemetry. Speech recognition & action extraction execute completely on this phone.'
                : 'Accelerated cloud transcription powered by Google Gemini Flash or OpenAI.'}
            </Text>
          </View>

          <View style={[styles.hairlineDivider, { backgroundColor: colors.border }]} />

          {/* Privacy Architecture Link */}
          <TouchableOpacity
            onPress={() => router.push('/modal')}
            style={styles.settingsRow}>
            <View style={[styles.iconWell, { backgroundColor: colors.accentLight }]}>
              <Ionicons name="lock-closed" size={16} color={colors.accent} />
            </View>
            <View style={styles.rowContent}>
              <Text style={[styles.rowTitle, { color: colors.text }]}>Zero Data-Leak Guarantee</Text>
              <Text style={[styles.rowSubtitle, { color: colors.textSecondary }]}>Inspect on-device sandbox security architecture</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* 4. AUDIO & RECORDING PREFERENCES */}
        <Text style={[styles.groupLabel, { color: colors.textSecondary }]}>RECORDING & AUDIO</Text>
        <View style={[styles.groupedCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {/* Row 1: Auto-Transcribe */}
          <View style={styles.settingsRow}>
            <View style={[styles.iconWell, { backgroundColor: colors.coralLight }]}>
              <Ionicons name="mic" size={16} color={colors.coral} />
            </View>
            <View style={styles.rowContent}>
              <Text style={[styles.rowTitle, { color: colors.text }]}>Auto-Transcribe</Text>
              <Text style={[styles.rowSubtitle, { color: colors.textSecondary }]}>
                Transcribe voice audio immediately when call ends
              </Text>
            </View>
            <Switch
              value={settings.autoTranscribe}
              onValueChange={(val) => updateSettings({ autoTranscribe: val })}
              trackColor={{ false: colors.surfaceContainerHigh, true: colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={[styles.hairlineDivider, { backgroundColor: colors.border, marginLeft: 58 }]} />

          {/* Row 2: Sampling Rate */}
          <View style={styles.settingsRow}>
            <View style={[styles.iconWell, { backgroundColor: colors.surfaceContainer }]}>
              <Ionicons name="pulse" size={16} color={colors.text} />
            </View>
            <View style={styles.rowContent}>
              <Text style={[styles.rowTitle, { color: colors.text }]}>Sampling Rate</Text>
              <Text style={[styles.rowSubtitle, { color: colors.textSecondary }]}>Whisper STT native standard</Text>
            </View>
            <View style={[styles.quietBadge, { backgroundColor: colors.surfaceContainer }]}>
              <Text style={[styles.quietBadgeText, { color: colors.textSecondary }]}>16,000 Hz Mono</Text>
            </View>
          </View>

          <View style={[styles.hairlineDivider, { backgroundColor: colors.border, marginLeft: 58 }]} />

          {/* Row 3: Audio Quality */}
          <TouchableOpacity
            onPress={() => {
              const nextQuality = settings.audioQuality === 'high' ? 'standard' : 'high';
              updateSettings({ audioQuality: nextQuality });
            }}
            style={styles.settingsRow}>
            <View style={[styles.iconWell, { backgroundColor: colors.coralLight }]}>
              <Ionicons name="options-outline" size={16} color={colors.coral} />
            </View>
            <View style={styles.rowContent}>
              <Text style={[styles.rowTitle, { color: colors.text }]}>Audio Format</Text>
              <Text style={[styles.rowSubtitle, { color: colors.textSecondary }]}>
                {settings.audioQuality === 'high' ? 'Lossless Linear PCM (16-bit WAV)' : 'Standard compressed audio'}
              </Text>
            </View>
            <View style={styles.rowRightPill}>
              <Text style={[styles.rowValueText, { color: colors.primary }]}>
                {settings.audioQuality === 'high' ? 'High' : 'Standard'}
              </Text>
              <Ionicons name="chevron-forward" size={14} color={colors.textMuted} style={{ marginLeft: 4 }} />
            </View>
          </TouchableOpacity>
        </View>

        {/* 5. ON-DEVICE AI MODELS */}
        <Text style={[styles.groupLabel, { color: colors.textSecondary }]}>OFFLINE AI MODELS</Text>
        <View style={[styles.groupedCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {/* Row 1: Whisper STT Model */}
          <View style={styles.settingsRow}>
            <View style={[styles.iconWell, { backgroundColor: colors.oliveLight }]}>
              <Ionicons name="mic-outline" size={16} color={colors.olive} />
            </View>
            <View style={styles.rowContent}>
              <Text style={[styles.rowTitle, { color: colors.text }]}>Speech-to-Text Model</Text>
              <Text style={[styles.rowSubtitle, { color: colors.textSecondary }]}>
                {settings.whisperModel === 'ggml-tiny.en.bin' ? 'Whisper Tiny (77 MB)' : 'Whisper Base'}
              </Text>
            </View>
            <View style={styles.statusPill}>
              <View style={[styles.statusDot, { backgroundColor: '#34A853' }]} />
              <Text style={[styles.statusPillText, { color: colors.textSecondary }]}>Ready</Text>
            </View>
          </View>

          <View style={[styles.hairlineDivider, { backgroundColor: colors.border, marginLeft: 58 }]} />

          {/* Row 2: SLM Reasoning Model */}
          <View style={styles.settingsRow}>
            <View style={[styles.iconWell, { backgroundColor: colors.oliveLight }]}>
              <Ionicons name="sparkles-outline" size={16} color={colors.olive} />
            </View>
            <View style={styles.rowContent}>
              <Text style={[styles.rowTitle, { color: colors.text }]}>Task & Checklist Model</Text>
              <Text style={[styles.rowSubtitle, { color: colors.textSecondary }]}>Google Gemma 2B IT (Quantized)</Text>
            </View>
            <View style={styles.statusPill}>
              <View style={[styles.statusDot, { backgroundColor: '#34A853' }]} />
              <Text style={[styles.statusPillText, { color: colors.textSecondary }]}>Ready</Text>
            </View>
          </View>

          <View style={[styles.hairlineDivider, { backgroundColor: colors.border, marginLeft: 58 }]} />

          {/* Row 3: Model Weights Expand Toggle */}
          <TouchableOpacity
            onPress={() => setModelManagerExpanded(!modelManagerExpanded)}
            style={styles.settingsRow}>
            <View style={[styles.iconWell, { backgroundColor: colors.surfaceContainer }]}>
              <Ionicons name="hardware-chip-outline" size={16} color={colors.text} />
            </View>
            <View style={styles.rowContent}>
              <Text style={[styles.rowTitle, { color: colors.text }]}>Manage Model Weights</Text>
              <Text style={[styles.rowSubtitle, { color: colors.textSecondary }]}>
                {modelManagerExpanded ? 'Hide model details' : 'Download models or specify custom HuggingFace URLs'}
              </Text>
            </View>
            <Ionicons
              name={modelManagerExpanded ? 'chevron-up' : 'chevron-down'}
              size={16}
              color={colors.textSecondary}
            />
          </TouchableOpacity>

          {/* Expandable Model Manager Body */}
          {modelManagerExpanded && (
            <View style={[styles.modelManagerExpandedContainer, { backgroundColor: colors.background }]}>
              <ModelManagerCard embedded />
            </View>
          )}
        </View>

        {/* 6. CONNECTED CALENDARS */}
        <Text style={[styles.groupLabel, { color: colors.textSecondary }]}>CONNECTED CALENDARS</Text>
        <View style={[styles.groupedCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {connectedAccounts.map((account, index) => {
            const isGoogle = account.provider === 'google';
            const isOutlook = account.provider === 'outlook';
            const iconName = isGoogle ? 'logo-google' : isOutlook ? 'mail-outline' : 'calendar-outline';
            const iconBg = isGoogle ? '#FEF3D6' : isOutlook ? '#E0F2FE' : colors.surfaceContainer;
            const iconColor = isGoogle ? '#D97706' : isOutlook ? '#0284C7' : colors.text;

            return (
              <React.Fragment key={account.id}>
                {index > 0 && (
                  <View style={[styles.hairlineDivider, { backgroundColor: colors.border, marginLeft: 58 }]} />
                )}
                <View style={styles.settingsRow}>
                  <View style={[styles.iconWell, { backgroundColor: iconBg }]}>
                    <Ionicons name={iconName} size={16} color={iconColor} />
                  </View>
                  <View style={styles.rowContent}>
                    <Text style={[styles.rowTitle, { color: colors.text }]}>{account.name}</Text>
                    <Text style={[styles.rowSubtitle, { color: colors.textSecondary }]}>
                      {account.isConnected ? account.email || 'Syncing enabled' : 'Automatic agenda & meet link sync'}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.accountStatusPill,
                      {
                        backgroundColor: account.isConnected ? colors.accentLight : colors.surfaceContainer,
                      },
                    ]}>
                    <Text
                      style={[
                        styles.accountStatusText,
                        {
                          color: account.isConnected ? colors.accent : colors.textSecondary,
                        },
                      ]}>
                      {account.isConnected ? 'Connected' : 'Sync'}
                    </Text>
                  </View>
                </View>
              </React.Fragment>
            );
          })}
        </View>

        {/* 7. STORAGE & DATA MAINTENANCE */}
        <Text style={[styles.groupLabel, { color: colors.textSecondary }]}>STORAGE & MAINTENANCE</Text>
        <View style={[styles.groupedCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {/* Subtle Storage Metric Bar */}
          <View style={styles.storageMetricRow}>
            <View style={styles.metricItem}>
              <Text style={[styles.metricNumber, { color: colors.text }]}>{meetings.length}</Text>
              <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Meetings</Text>
            </View>
            <View style={[styles.metricDivider, { backgroundColor: colors.border }]} />
            <View style={styles.metricItem}>
              <Text style={[styles.metricNumber, { color: colors.text }]}>{recordings.length}</Text>
              <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Recordings</Text>
            </View>
            <View style={[styles.metricDivider, { backgroundColor: colors.border }]} />
            <View style={styles.metricItem}>
              <Text style={[styles.metricNumber, { color: colors.text }]}>{formattedStorage} MB</Text>
              <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Audio Cache</Text>
            </View>
          </View>

          <View style={[styles.hairlineDivider, { backgroundColor: colors.border }]} />

          {/* Action: Load Demo Meeting */}
          <TouchableOpacity
            onPress={() => {
              loadDemoData();
              Alert.alert('Demo Meeting Loaded', 'A sample meeting with agenda has been added to your schedule.');
            }}
            style={styles.settingsRow}>
            <View style={[styles.iconWell, { backgroundColor: colors.coralLight }]}>
              <Ionicons name="sparkles" size={16} color={colors.coral} />
            </View>
            <View style={styles.rowContent}>
              <Text style={[styles.rowTitle, { color: colors.text }]}>Load Sample Meeting</Text>
              <Text style={[styles.rowSubtitle, { color: colors.textSecondary }]}>Populate a test meeting with agenda & attendees</Text>
            </View>
            <Ionicons name="add" size={18} color={colors.coral} />
          </TouchableOpacity>

          <View style={[styles.hairlineDivider, { backgroundColor: colors.border, marginLeft: 58 }]} />

          {/* Action: Clear Audio Recordings */}
          <TouchableOpacity
            onPress={() => setConfirmClearRecOpen(true)}
            style={styles.settingsRow}>
            <View style={[styles.iconWell, { backgroundColor: colors.surfaceContainer }]}>
              <Ionicons name="trash-outline" size={16} color={colors.text} />
            </View>
            <View style={styles.rowContent}>
              <Text style={[styles.rowTitle, { color: colors.text }]}>Clear Audio Recordings</Text>
              <Text style={[styles.rowSubtitle, { color: colors.textSecondary }]}>Free up device memory while preserving transcripts</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </TouchableOpacity>

          <View style={[styles.hairlineDivider, { backgroundColor: colors.border, marginLeft: 58 }]} />

          {/* Action: Reset All Data (Destructive) */}
          <TouchableOpacity
            onPress={() => setConfirmEraseOpen(true)}
            style={styles.settingsRow}>
            <View style={[styles.iconWell, { backgroundColor: '#FEE2E2' }]}>
              <Ionicons name="alert-circle-outline" size={16} color="#DC2626" />
            </View>
            <View style={styles.rowContent}>
              <Text style={[styles.rowTitle, { color: '#DC2626' }]}>Reset All Local Data</Text>
              <Text style={[styles.rowSubtitle, { color: colors.textSecondary }]}>Permanently erase all meetings, recordings & notes</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* 8. FOOTER */}
        <View style={styles.appFooter}>
          <Text style={[styles.appVersion, { color: colors.textMuted }]}>MeetaNotes Mobile · v1.0.0</Text>
          <Text style={[styles.appNotice, { color: colors.textMuted }]}>
            Crafted for private on-device intelligence
          </Text>
        </View>
      </ScrollView>

      {/* EDIT PROFILE MODAL */}
      <Modal visible={editingProfile} transparent animationType="fade" onRequestClose={() => setEditingProfile(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.modalHeaderRow}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Edit Profile</Text>
              <TouchableOpacity onPress={() => setEditingProfile(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>DISPLAY NAME</Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: colors.surfaceContainer, borderColor: colors.border, color: colors.text }]}
                value={nameInput}
                onChangeText={setNameInput}
                placeholder="Your Name"
                placeholderTextColor={colors.textMuted}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>EMAIL ADDRESS</Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: colors.surfaceContainer, borderColor: colors.border, color: colors.text }]}
                value={emailInput}
                onChangeText={setEmailInput}
                placeholder="name@example.com"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>

            <View style={styles.modalButtonsRow}>
              <TouchableOpacity
                onPress={() => setEditingProfile(false)}
                style={[styles.modalCancelBtn, { backgroundColor: colors.surfaceContainer }]}>
                <Text style={[styles.modalCancelBtnText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSaveProfile}
                style={[styles.modalSaveBtn, { backgroundColor: colors.primary }]}>
                <Text style={styles.modalSaveBtnText}>Save Changes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* CONFIRM CLEAR RECORDINGS MODAL */}
      <Modal visible={confirmClearRecOpen} transparent animationType="fade" onRequestClose={() => setConfirmClearRecOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.modalIconCircle, { backgroundColor: colors.surfaceContainer }]}>
              <Ionicons name="trash-outline" size={24} color={colors.text} />
            </View>
            <Text style={[styles.dialogTitle, { color: colors.text }]}>Clear Audio Recordings?</Text>
            <Text style={[styles.dialogBody, { color: colors.textSecondary }]}>
              All local audio files will be deleted from device memory. Your meeting transcripts and action checklists will be preserved.
            </Text>

            <View style={styles.modalButtonsRow}>
              <TouchableOpacity
                onPress={() => setConfirmClearRecOpen(false)}
                style={[styles.modalCancelBtn, { backgroundColor: colors.surfaceContainer }]}>
                <Text style={[styles.modalCancelBtnText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleClearRecordings}
                style={[styles.modalSaveBtn, { backgroundColor: colors.primary }]}>
                <Text style={styles.modalSaveBtnText}>Clear Audio</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* CONFIRM ERASE ALL DATA MODAL */}
      <Modal visible={confirmEraseOpen} transparent animationType="fade" onRequestClose={() => setConfirmEraseOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.modalIconCircle, { backgroundColor: '#FEE2E2' }]}>
              <Ionicons name="alert-circle-outline" size={24} color="#DC2626" />
            </View>
            <Text style={[styles.dialogTitle, { color: '#DC2626' }]}>Reset All Data?</Text>
            <Text style={[styles.dialogBody, { color: colors.textSecondary }]}>
              This will permanently delete all meetings, audio recordings, custom notes, and reset app preferences. This action cannot be undone.
            </Text>

            <View style={styles.modalButtonsRow}>
              <TouchableOpacity
                onPress={() => setConfirmEraseOpen(false)}
                style={[styles.modalCancelBtn, { backgroundColor: colors.surfaceContainer }]}>
                <Text style={[styles.modalCancelBtnText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleEraseAll}
                style={[styles.modalSaveBtn, { backgroundColor: '#DC2626' }]}>
                <Text style={styles.modalSaveBtnText}>Reset All</Text>
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
    paddingTop: 8,
    paddingBottom: 14,
    backgroundColor: 'transparent',
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.4,
    fontFamily: Platform.select({ ios: 'System', android: 'sans-serif-medium' }),
  },
  screenSubtitle: {
    fontSize: 13,
    marginTop: 2,
    fontFamily: Platform.select({ ios: 'System', android: 'sans-serif' }),
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 6,
  },
  // Profile Card
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
  },
  profileMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    backgroundColor: 'transparent',
  },
  avatarWell: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontSize: 16,
    fontWeight: '800',
    color: '#3D2E00',
  },
  profileMeta: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  profileNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'transparent',
  },
  profileName: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  badgeVerified: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  badgeVerifiedText: {
    fontSize: 10,
    fontWeight: '600',
  },
  profileEmail: {
    fontSize: 12,
    marginTop: 2,
  },
  editPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1,
  },
  editPillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  // Section Headers & Grouped Cards
  groupLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 8,
    marginLeft: 6,
    fontFamily: Platform.select({ ios: 'System', android: 'sans-serif-medium' }),
  },
  groupedCard: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
  },
  hairlineDivider: {
    height: StyleSheet.hairlineWidth,
  },
  // Settings Row
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: 'transparent',
  },
  iconWell: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  rowContent: {
    flex: 1,
    backgroundColor: 'transparent',
    paddingRight: 8,
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  rowSubtitle: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  rowRightPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  rowValueText: {
    fontSize: 13,
    fontWeight: '600',
  },
  quietBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  quietBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'transparent',
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  accountStatusPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  accountStatusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  // Engine Switcher
  engineSegmentWrapper: {
    padding: 14,
    backgroundColor: 'transparent',
  },
  engineSegmentBar: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: 14,
    gap: 4,
  },
  engineSegmentTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 10,
  },
  engineSegmentTabActive: {
    elevation: 2,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  engineSegmentText: {
    fontSize: 12,
    letterSpacing: -0.1,
  },
  engineCaption: {
    fontSize: 11,
    lineHeight: 16,
    marginTop: 10,
    marginHorizontal: 2,
  },
  // Model Manager Container
  modelManagerExpandedContainer: {
    padding: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0, 0, 0, 0.08)',
  },
  // Storage Metrics
  storageMetricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    backgroundColor: 'transparent',
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  metricNumber: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  metricDivider: {
    width: 1,
    height: 24,
  },
  // App Footer
  appFooter: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 20,
    backgroundColor: 'transparent',
  },
  appVersion: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  appNotice: {
    fontSize: 11,
    marginTop: 2,
  },
  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    elevation: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: 'transparent',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  modalIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 12,
  },
  dialogTitle: {
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  dialogBody: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  inputGroup: {
    marginBottom: 14,
    backgroundColor: 'transparent',
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  modalInput: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  modalButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
    backgroundColor: 'transparent',
  },
  modalCancelBtn: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  modalSaveBtn: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSaveBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
