import React from 'react';
import {
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Text, View } from '@/components/Themed';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useMeetingStore } from '@/store/meetingStore';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { PlatformType } from '@/types/meeting';
import { RecordingPlayer } from '@/components/RecordingPlayer';

export default function MeetingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const theme = useColorScheme();
  const colors = Colors[theme];

  const {
    getMeetingById,
    recordings,
    activeRecording,
    startRecordingSession,
    deleteMeeting,
  } = useMeetingStore();

  const meeting = getMeetingById(id);

  if (!meeting) {
    return (
      <View style={[styles.screen, styles.center, { backgroundColor: colors.background }]}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.textMuted} />
        <Text style={[styles.notFoundText, { color: colors.text }]}>Meeting not found</Text>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.backBtn, { backgroundColor: colors.primary }]}>
          <Text style={[styles.backBtnText, { color: colors.primaryText }]}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const linkedRecordings = recordings.filter((r) => r.meetingId === meeting.id);

  const getPlatformLabel = (platform: PlatformType): string => {
    switch (platform) {
      case 'google_meet':
        return 'Google Meet';
      case 'zoom':
        return 'Zoom Video';
      case 'teams':
        return 'Microsoft Teams';
      case 'in_person':
        return 'In Person';
      default:
        return 'General Meeting';
    }
  };

  const handleStartRecord = () => {
    startRecordingSession(meeting.id, meeting.title);
    router.push('/record');
  };

  const handleDelete = () => {
    deleteMeeting(meeting.id);
    router.back();
  };

  const formatTimer = (totalSeconds: number): string => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          title: meeting.title,
          headerBackTitle: 'Meetings',
          headerShadowVisible: false,
          headerStyle: { backgroundColor: colors.card },
          headerTintColor: colors.text,
          headerRight: () => (
            <TouchableOpacity onPress={handleDelete} style={{ padding: 6 }}>
              <Ionicons name="trash-outline" size={18} color="#EF4444" />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Meeting Title & Meta */}
        <Text style={[styles.title, { color: colors.text, marginTop: 4 }]}>{meeting.title}</Text>

        <View style={[styles.metaCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={styles.metaRow}>
            <Ionicons name="time-outline" size={16} color={colors.textSecondary} style={styles.metaIcon} />
            <Text style={[styles.metaText, { color: colors.text }]}>
              {meeting.date} • {meeting.startTime} – {meeting.endTime} ({meeting.durationMinutes} mins)
            </Text>
          </View>

          <View style={styles.metaRow}>
            <Ionicons name="videocam-outline" size={16} color={colors.textSecondary} style={styles.metaIcon} />
            <Text style={[styles.metaText, { color: colors.text }]}>
              Format: {getPlatformLabel(meeting.platform)}
            </Text>
          </View>

          <View style={styles.metaRow}>
            <Ionicons name="sync-outline" size={16} color={colors.textSecondary} style={styles.metaIcon} />
            <Text style={[styles.metaText, { color: colors.textSecondary }]}>
              Source: {meeting.source === 'manual' ? 'Manual Entry' : 'Synced from Calendar'}
            </Text>
          </View>
        </View>

        {/* Attendees Section */}
        <View style={styles.sectionBlock}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Attendees ({meeting.attendees.length})
          </Text>
          <View style={styles.attendeesList}>
            {meeting.attendees.map((attendee, idx) => (
              <View
                key={idx}
                style={[
                  styles.attendeeChip,
                  { backgroundColor: colors.surface, borderColor: colors.cardBorder },
                ]}>
                <Ionicons name="person-circle-outline" size={14} color={colors.textSecondary} style={{ marginRight: 5 }} />
                <Text style={[styles.attendeeText, { color: colors.text }]}>{attendee}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Agenda Section */}
        {meeting.agenda ? (
          <View style={styles.sectionBlock}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Agenda & Topics</Text>
            <View style={[styles.agendaCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <Text style={[styles.agendaText, { color: colors.text }]}>{meeting.agenda}</Text>
            </View>
          </View>
        ) : null}

        {/* Recordings & Transcription Output */}
        <View style={styles.sectionBlock}>
          <View style={styles.recordingSectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Audio Recordings ({linkedRecordings.length})
            </Text>

            <TouchableOpacity
              onPress={handleStartRecord}
              style={[
                styles.recordCtaBtn,
                {
                  backgroundColor:
                    activeRecording.isRecording && activeRecording.meetingId === meeting.id
                      ? '#EF4444'
                      : colors.primary,
                },
              ]}>
              <Ionicons
                name={
                  activeRecording.isRecording && activeRecording.meetingId === meeting.id
                    ? 'radio'
                    : 'mic'
                }
                size={14}
                color={colors.primaryText}
                style={{ marginRight: 4 }}
              />
              <Text style={[styles.recordCtaBtnText, { color: colors.primaryText }]}>
                {activeRecording.isRecording && activeRecording.meetingId === meeting.id
                  ? 'Recording Now'
                  : 'Record Audio'}
              </Text>
            </TouchableOpacity>
          </View>

          {linkedRecordings.length === 0 ? (
            <View
              style={[
                styles.noRecordingsCard,
                { backgroundColor: colors.card, borderColor: colors.cardBorder },
              ]}>
              <Ionicons name="mic-off-outline" size={32} color={colors.textMuted} style={{ marginBottom: 6 }} />
              <Text style={[styles.noRecTitle, { color: colors.text }]}>No recordings attached yet</Text>
              <Text style={[styles.noRecSub, { color: colors.textSecondary }]}>
                Tap &apos;Record Audio&apos; above to capture 16kHz PCM audio on-device.
              </Text>
            </View>
          ) : (
            linkedRecordings.map((rec) => (
              <View
                key={rec.id}
                style={[
                  styles.recordingCard,
                  { backgroundColor: colors.card, borderColor: colors.cardBorder },
                ]}>
                <View style={styles.recordingHeader}>
                  <View style={styles.recordingHeaderLeft}>
                    <Ionicons name="musical-notes" size={16} color="#10B981" style={{ marginRight: 6 }} />
                    <Text style={[styles.recordingDuration, { color: colors.text }]}>
                      {formatTimer(rec.durationSeconds)} • 16kHz Mono WAV
                    </Text>
                  </View>
                </View>

                {/* Audio Playback via expo-audio */}
                <RecordingPlayer uri={rec.uri} durationSeconds={rec.durationSeconds} />

                {/* Structured Summary Preview if present */}
                {rec.summary && (
                  <View style={[styles.summaryPreview, { backgroundColor: colors.surface }]}>
                    <Text style={[styles.summaryHeading, { color: colors.text }]}>Executive Summary</Text>
                    <Text style={[styles.summaryBody, { color: colors.textSecondary }]}>
                      {rec.summary.executiveSummary}
                    </Text>

                    <Text style={[styles.summaryHeading, { color: colors.text, marginTop: 10 }]}>Key Decisions</Text>
                    {rec.summary.keyDecisions.map((dec, i) => (
                      <Text key={i} style={[styles.bulletItem, { color: colors.textSecondary }]}>
                        • {dec}
                      </Text>
                    ))}
                  </View>
                )}
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  notFoundText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 16,
  },
  backBtn: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 8,
  },
  backBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  scrollContent: {
    padding: 18,
    paddingBottom: 40,
  },
  topBadgesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'transparent',
    marginBottom: 12,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 28,
    marginBottom: 14,
  },
  metaCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 10,
    marginBottom: 20,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  metaIcon: {
    marginRight: 8,
  },
  metaText: {
    fontSize: 13,
  },
  sectionBlock: {
    backgroundColor: 'transparent',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 10,
  },
  attendeesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    backgroundColor: 'transparent',
  },
  attendeeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
  attendeeText: {
    fontSize: 12,
  },
  agendaCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
  },
  agendaText: {
    fontSize: 13,
    lineHeight: 19,
  },
  recordingSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'transparent',
    marginBottom: 10,
  },
  recordCtaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  recordCtaBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  noRecordingsCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noRecTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  noRecSub: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 2,
  },
  recordingCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  recordingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'transparent',
    marginBottom: 10,
  },
  recordingHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  recordingDuration: {
    fontSize: 13,
    fontWeight: '600',
  },
  recBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  recBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#10B981',
  },
  summaryPreview: {
    borderRadius: 10,
    padding: 12,
  },
  summaryHeading: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
  },
  summaryBody: {
    fontSize: 12,
    lineHeight: 16,
  },
  bulletItem: {
    fontSize: 12,
    lineHeight: 16,
    marginLeft: 4,
    marginTop: 2,
  },
});
