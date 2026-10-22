import React, { useState } from 'react';
import {
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Text, View } from './Themed';
import { Ionicons } from '@expo/vector-icons';
import { PlatformType, Meeting } from '@/types/meeting';
import Colors from '@/constants/Colors';
import { useColorScheme } from './useColorScheme';

interface ManualMeetingModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (meeting: Omit<Meeting, 'id' | 'createdAt' | 'recordingIds' | 'status'>) => void;
}

export function ManualMeetingModal({ visible, onClose, onSubmit }: ManualMeetingModalProps) {
  const theme = useColorScheme();
  const colors = Colors[theme];

  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const todayStr = `${year}-${month}-${day}`;

  const [title, setTitle] = useState('');
  const [date, setDate] = useState(todayStr);
  const [startTime, setStartTime] = useState('10:00 AM');
  const [durationMinutes, setDurationMinutes] = useState('45');
  const [platform, setPlatform] = useState<PlatformType>('google_meet');
  const [attendeesText, setAttendeesText] = useState('');
  const [agenda, setAgenda] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const platforms: { id: PlatformType; label: string; icon: any }[] = [
    { id: 'google_meet', label: 'Google Meet', icon: 'videocam' },
    { id: 'zoom', label: 'Zoom', icon: 'videocam-outline' },
    { id: 'teams', label: 'Teams', icon: 'people' },
    { id: 'in_person', label: 'In Person', icon: 'location' },
    { id: 'other', label: 'General', icon: 'calendar-outline' },
  ];

  const handleSave = () => {
    if (!title.trim()) {
      setErrorMsg('Please enter a meeting title');
      return;
    }

    const attendeesList = attendeesText
      .split(',')
      .map((a) => a.trim())
      .filter((a) => a.length > 0);

    const durationNum = parseInt(durationMinutes, 10) || 45;

    onSubmit({
      title: title.trim(),
      date: date.trim() || todayStr,
      startTime: startTime.trim() || '10:00 AM',
      endTime: `${startTime.trim() || '10:00 AM'} (+${durationNum}m)`,
      durationMinutes: durationNum,
      platform,
      attendees: attendeesList.length > 0 ? attendeesList : ['You (Host)'],
      agenda: agenda.trim(),
      source: 'manual',
    });

    // Reset fields
    setTitle('');
    setAttendeesText('');
    setAgenda('');
    setErrorMsg('');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}>
        <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={[styles.headerIconWrap, { backgroundColor: colors.surface }]}>
                <Ionicons name="calendar-outline" size={20} color={colors.text} />
              </View>
              <View>
                <Text style={[styles.heading, { color: colors.text }]}>New Meeting</Text>
                <Text style={[styles.subheading, { color: colors.textSecondary }]}>
                  Schedule an offline meeting slot
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {errorMsg ? (
              <View style={[styles.errorBox, { backgroundColor: '#EF444415' }]}>
                <Ionicons name="alert-circle" size={16} color="#EF4444" style={{ marginRight: 6 }} />
                <Text style={styles.errorText}>{errorMsg}</Text>
              </View>
            ) : null}

            {/* Title */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Meeting Title *</Text>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: colors.surface, borderColor: colors.cardBorder, color: colors.text },
                ]}
                placeholder="e.g. Design Architecture Sync"
                placeholderTextColor={colors.textMuted}
                value={title}
                onChangeText={(t) => {
                  setTitle(t);
                  if (errorMsg) setErrorMsg('');
                }}
              />
            </View>

            {/* Platform Selection */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Meeting Format</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.platformRow}>
                {platforms.map((p) => {
                  const isSelected = platform === p.id;
                  return (
                    <TouchableOpacity
                      key={p.id}
                      onPress={() => setPlatform(p.id)}
                      style={[
                        styles.platformChip,
                        {
                          backgroundColor: isSelected ? colors.primary : colors.surface,
                          borderColor: isSelected ? colors.primary : colors.cardBorder,
                        },
                      ]}>
                      <Ionicons
                        name={p.icon}
                        size={14}
                        color={isSelected ? colors.primaryText : colors.textSecondary}
                        style={{ marginRight: 6 }}
                      />
                      <Text
                        style={[
                          styles.platformChipText,
                          {
                            color: isSelected ? colors.primaryText : colors.text,
                            fontWeight: isSelected ? '600' : '400',
                          },
                        ]}>
                        {p.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Date & Time Row */}
            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1.2 }]}>
                <Text style={[styles.label, { color: colors.text }]}>Date</Text>
                <TextInput
                  style={[
                    styles.input,
                    { backgroundColor: colors.surface, borderColor: colors.cardBorder, color: colors.text },
                  ]}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.textMuted}
                  value={date}
                  onChangeText={setDate}
                />
              </View>

              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={[styles.label, { color: colors.text }]}>Start Time</Text>
                <TextInput
                  style={[
                    styles.input,
                    { backgroundColor: colors.surface, borderColor: colors.cardBorder, color: colors.text },
                  ]}
                  placeholder="10:00 AM"
                  placeholderTextColor={colors.textMuted}
                  value={startTime}
                  onChangeText={setStartTime}
                />
              </View>

              <View style={[styles.inputGroup, { flex: 0.9 }]}>
                <Text style={[styles.label, { color: colors.text }]}>Duration</Text>
                <TextInput
                  style={[
                    styles.input,
                    { backgroundColor: colors.surface, borderColor: colors.cardBorder, color: colors.text },
                  ]}
                  placeholder="45 min"
                  placeholderTextColor={colors.textMuted}
                  value={durationMinutes}
                  keyboardType="numeric"
                  onChangeText={setDurationMinutes}
                />
              </View>
            </View>

            {/* Attendees */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Attendees</Text>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: colors.surface, borderColor: colors.cardBorder, color: colors.text },
                ]}
                placeholder="Names or emails separated by commas"
                placeholderTextColor={colors.textMuted}
                value={attendeesText}
                onChangeText={setAttendeesText}
              />
            </View>

            {/* Agenda */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Agenda & Discussion Points</Text>
              <TextInput
                style={[
                  styles.input,
                  styles.textArea,
                  { backgroundColor: colors.surface, borderColor: colors.cardBorder, color: colors.text },
                ]}
                placeholder="Key goals, topics, or questions..."
                placeholderTextColor={colors.textMuted}
                value={agenda}
                onChangeText={setAgenda}
                multiline
                numberOfLines={3}
              />
            </View>
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.footer}>
            <TouchableOpacity onPress={onClose} style={[styles.cancelBtn, { borderColor: colors.cardBorder }]}>
              <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleSave} style={[styles.saveBtn, { backgroundColor: colors.primary }]}>
              <Ionicons name="checkmark" size={16} color={colors.primaryText} style={{ marginRight: 6 }} />
              <Text style={[styles.saveBtnText, { color: colors.primaryText }]}>Save Meeting</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 480,
    maxHeight: '90%',
    borderRadius: 28,
    borderWidth: 1,
    padding: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'transparent',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'transparent',
  },
  headerIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heading: {
    fontSize: 17,
    fontWeight: '700',
  },
  subheading: {
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
  },
  scrollContent: {
    paddingBottom: 6,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    marginBottom: 14,
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '500',
  },
  inputGroup: {
    backgroundColor: 'transparent',
    marginBottom: 14,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13,
  },
  textArea: {
    height: 72,
    textAlignVertical: 'top',
  },
  platformRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 2,
  },
  platformChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  platformChipText: {
    fontSize: 12,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: 'transparent',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 10,
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(148, 163, 184, 0.15)',
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
    fontWeight: '500',
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
  },
  saveBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
