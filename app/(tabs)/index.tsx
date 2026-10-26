import React, { useState, useMemo, useCallback } from 'react';
import {
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Pressable,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, View } from '@/components/Themed';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMeetingStore } from '@/store/meetingStore';
import { MeetingCard } from '@/components/MeetingCard';
import { MeetingInviteModal } from '@/components/MeetingInviteModal';
import { ManualMeetingModal } from '@/components/ManualMeetingModal';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { Meeting } from '@/types/meeting';

export default function HomeScreen() {
  const router = useRouter();
  const theme = useColorScheme();
  const colors = Colors[theme];
  const insets = useSafeAreaInsets();

  const {
    meetings,
    recordings,
    activeRecording,
    settings,
    quickNote,
    addMeeting,
    updateQuickNote,
    toggleActionItem,
    startRecordingSession,
  } = useMeetingStore();

  const [inviteMeeting, setInviteMeeting] = useState<Meeting | null>(null);
  const [manualModalOpen, setManualModalOpen] = useState(false);
  const [quickNoteModalVisible, setQuickNoteModalVisible] = useState(false);
  const [quickNoteDraft, setQuickNoteDraft] = useState(quickNote);
  const [reminderToast, setReminderToast] = useState<string | null>(null);

  // Ongoing meeting detection
  const ongoingMeeting = useMemo(() => {
    if (activeRecording.isRecording && activeRecording.meetingId) {
      return meetings.find((m) => m.id === activeRecording.meetingId);
    }
    return meetings.find((m) => m.status === 'in_progress');
  }, [meetings, activeRecording]);

  // Next meeting detection
  const nextMeeting = useMemo(() => {
    return meetings.find((m) => m.status === 'upcoming');
  }, [meetings]);

  // Highlights from today (recordings that contain action items)
  const todayHighlightRecordings = useMemo(() => {
    return recordings.filter((r) => r.summary?.actionItems && r.summary.actionItems.length > 0).slice(0, 2);
  }, [recordings]);

  // Remaining upcoming meetings
  const upcomingMeetingsList = useMemo(() => {
    return meetings.filter((m) => m.id !== ongoingMeeting?.id && m.id !== nextMeeting?.id).slice(0, 3);
  }, [meetings, ongoingMeeting, nextMeeting]);

  const handleStartRecording = useCallback((meeting?: Meeting) => {
    if (meeting) {
      startRecordingSession(meeting.id, meeting.title);
    } else {
      startRecordingSession(undefined, 'Quick Note Session');
    }
    router.push('/record');
  }, [startRecordingSession, router]);

  const handleSetReminder = useCallback((meetingTitle?: string) => {
    const title = meetingTitle || nextMeeting?.title || 'Next Meeting';
    setReminderToast(`Reminder set for "${title}"!`);
    setTimeout(() => {
      setReminderToast(null);
    }, 3200);
  }, [nextMeeting]);

  const handleSaveQuickNote = useCallback(() => {
    updateQuickNote(quickNoteDraft);
    setQuickNoteModalVisible(false);
  }, [quickNoteDraft, updateQuickNote]);

  const formatElapsed = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const userInitials = (settings.userName || 'Launa Vendrick')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  return (
    <View style={[styles.screen, { backgroundColor: colors.background, paddingTop: Math.max(insets.top, 16) }]}>
      {/* 1. TOP HEADER (Avatar, Greeting, Search & Notification) */}
      <View style={styles.header}>
        {/* User Avatar Circle */}
        <TouchableOpacity
          onPress={() => router.push('/settings')}
          style={[styles.avatarCircle, { backgroundColor: colors.amber }]}>
          <Text style={styles.avatarInitials}>{userInitials}</Text>
        </TouchableOpacity>

        {/* Right Action Icons: Search & Bell */}
        <View style={styles.headerRightActions}>
          <TouchableOpacity
            onPress={() => router.push('/notes')}
            style={[styles.headerIconBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="search" size={18} color={colors.text} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => Alert.alert('Notifications', 'You have no unread meeting alerts.')}
            style={[styles.headerIconBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="notifications-outline" size={18} color={colors.text} />
            <View style={[styles.notificationBadge, { backgroundColor: colors.coral }]} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Greeting Title */}
      <View style={styles.greetingSection}>
        <Text style={[styles.greetingTitle, { color: colors.text }]}>
          Hi, {settings.userName || 'Launa Vendrick'}!
        </Text>
        <Text style={[styles.greetingSubtitle, { color: colors.textSecondary }]}>
          Capture today's meeting notes.
        </Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom + 90, 100) }]}>
        
        {/* Toast Alert */}
        {reminderToast && (
          <View style={[styles.toastBanner, { backgroundColor: colors.secondaryContainer, borderColor: colors.primary }]}>
            <Ionicons name="alarm-outline" size={18} color={colors.onSecondaryContainer} />
            <Text style={[styles.toastBannerText, { color: colors.onSecondaryContainer }]}>{reminderToast}</Text>
          </View>
        )}

        {/* 2. ONGOING MEETING / CAPTURE HERO CARD */}
        {ongoingMeeting || activeRecording.isRecording ? (
          <Pressable
            onPress={() => {
              if (activeRecording.isRecording) {
                router.push('/record');
              } else if (ongoingMeeting) {
                router.push({ pathname: '/meeting/[id]', params: { id: ongoingMeeting.id } });
              }
            }}
            style={({ pressed }) => [
              styles.ongoingCard,
              {
                backgroundColor: colors.surface,
                borderColor: activeRecording.isRecording ? colors.coral : colors.border,
                transform: [{ scale: pressed ? 0.985 : 1 }],
              },
            ]}>
            <View style={styles.ongoingCardContent}>
              {/* Left Video/Mic Icon Badge */}
              <View style={[styles.videoIconWell, { backgroundColor: colors.coralLight }]}>
                <Ionicons
                  name={activeRecording.isRecording ? 'mic' : 'videocam'}
                  size={20}
                  color={colors.coral}
                />
              </View>

              {/* Title & Subtitle */}
              <View style={styles.ongoingTextCol}>
                <View style={styles.ongoingLabelRow}>
                  <Text style={[styles.ongoingLabel, { color: colors.coral }]}>Ongoing Meeting</Text>
                  {activeRecording.isRecording && (
                    <View style={styles.liveIndicatorRow}>
                      <View style={[styles.liveBlinker, { backgroundColor: colors.coral }]} />
                      <Text style={[styles.liveText, { color: colors.coral }]}>
                        {formatElapsed(activeRecording.elapsedSeconds)}
                      </Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.ongoingTitle, { color: colors.text }]} numberOfLines={1}>
                  {activeRecording.isRecording
                    ? activeRecording.meetingTitle
                    : ongoingMeeting?.title || 'Meeting Session'}
                </Text>
              </View>

              {/* Right Facepile or live badge */}
              <View style={styles.ongoingFacepile}>
                {(ongoingMeeting?.attendees || []).slice(0, 2).map((att, idx) => (
                  <View
                    key={att}
                    style={[
                      styles.miniAvatar,
                      {
                        backgroundColor: idx === 0 ? '#F5C242' : '#E06D53',
                        marginLeft: idx > 0 ? -8 : 0,
                        borderColor: colors.surface,
                      },
                    ]}>
                    <Text style={styles.miniAvatarText}>
                      {att.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase()}
                    </Text>
                  </View>
                ))}
                {(ongoingMeeting?.attendees || []).length > 2 && (
                  <View
                    style={[
                      styles.miniAvatarBadge,
                      {
                        backgroundColor: colors.surfaceContainerHigh,
                        marginLeft: -8,
                        borderColor: colors.surface,
                      },
                    ]}>
                    <Text style={[styles.miniAvatarBadgeText, { color: colors.textSecondary }]}>
                      +{ongoingMeeting!.attendees.length - 2}
                    </Text>
                  </View>
                )}
                {(!ongoingMeeting?.attendees || ongoingMeeting.attendees.length === 0) && (
                  <View style={[styles.quickStartBadge, { backgroundColor: colors.coralLight }]}>
                    <Ionicons name="play" size={12} color={colors.coral} />
                  </View>
                )}
              </View>
            </View>
          </Pressable>
        ) : (
          <Pressable
            onPress={() => handleStartRecording()}
            style={({ pressed }) => [
              styles.ongoingCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                transform: [{ scale: pressed ? 0.985 : 1 }],
              },
            ]}>
            <View style={styles.ongoingCardContent}>
              <View style={[styles.videoIconWell, { backgroundColor: colors.coralLight }]}>
                <Ionicons name="mic" size={20} color={colors.coral} />
              </View>

              <View style={styles.ongoingTextCol}>
                <View style={styles.ongoingLabelRow}>
                  <Text style={[styles.ongoingLabel, { color: colors.coral }]}>Capture Discussion</Text>
                </View>
                <Text style={[styles.ongoingTitle, { color: colors.text }]} numberOfLines={1}>
                  Record & Transcribe Notes
                </Text>
              </View>

              <View style={[styles.quickStartBadge, { backgroundColor: colors.coral }]}>
                <Ionicons name="arrow-forward" size={14} color="#FFFFFF" />
              </View>
            </View>
          </Pressable>
        )}

        {/* 3. SPLIT ROW: NEXT MEETING (Left) & QUICK NOTES (Right) */}
        <View style={styles.splitRow}>
          {/* Left Card: Next Meeting */}
          <View style={[styles.splitCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.splitCardHeader, { color: colors.textSecondary }]}>Next Meeting</Text>
            {nextMeeting ? (
              <>
                <Text style={[styles.nextMeetingDate, { color: colors.text }]} numberOfLines={1}>
                  {nextMeeting.title}
                </Text>
                <Text style={[styles.nextMeetingTime, { color: colors.textSecondary }]}>
                  {nextMeeting.startTime} ({nextMeeting.durationMinutes}m)
                </Text>

                <TouchableOpacity
                  onPress={() => handleSetReminder(nextMeeting.title)}
                  style={[styles.reminderBtn, { backgroundColor: colors.coral }]}>
                  <Ionicons name="time-outline" size={13} color="#FFFFFF" style={{ marginRight: 4 }} />
                  <Text style={styles.reminderBtnText}>Set Reminder</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={[styles.nextMeetingDate, { color: colors.text }]} numberOfLines={1}>
                  No upcoming
                </Text>
                <Text style={[styles.nextMeetingTime, { color: colors.textSecondary, marginBottom: 8 }]}>
                  Schedule your session
                </Text>

                <TouchableOpacity
                  onPress={() => setManualModalOpen(true)}
                  style={[styles.reminderBtn, { backgroundColor: colors.coral }]}>
                  <Ionicons name="add" size={13} color="#FFFFFF" style={{ marginRight: 4 }} />
                  <Text style={styles.reminderBtnText}>+ Schedule</Text>
                </TouchableOpacity>
              </>
            )}
          </View>

          {/* Right Card: Quick Notes (Olive Green #4D5C3B) */}
          <Pressable
            onPress={() => {
              setQuickNoteDraft(quickNote);
              setQuickNoteModalVisible(true);
            }}
            style={({ pressed }) => [
              styles.splitCard,
              {
                backgroundColor: colors.olive,
                borderColor: 'transparent',
                transform: [{ scale: pressed ? 0.98 : 1 }],
              },
            ]}>
            <View style={styles.quickNotesTopRow}>
              <Text style={styles.quickNotesTitle}>Quick Notes</Text>
              <View style={styles.quickNotesIconCircle}>
                <Ionicons name="pencil" size={11} color="#FFFFFF" />
              </View>
            </View>

            <Text style={styles.quickNotesBody} numberOfLines={4}>
              {quickNote || 'Save a personal reminder or quick thought...'}
            </Text>

            <View style={styles.quickNotesFooter}>
              <Text style={styles.quickNotesTapHint}>Tap to edit note</Text>
              <Ionicons name="arrow-forward" size={12} color="rgba(255, 255, 255, 0.7)" />
            </View>
          </Pressable>
        </View>

        {/* 4. HIGHLIGHTS FROM TODAY SECTION */}
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Highlights From Today</Text>
          <TouchableOpacity onPress={() => router.push('/notes')}>
            <Text style={[styles.seeAllText, { color: colors.coral }]}>See All</Text>
          </TouchableOpacity>
        </View>

        {/* Highlights Checklist Cards */}
        {todayHighlightRecordings.length === 0 ? (
          <View style={[styles.emptyHighlightCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.emptyHighlightIcon, { backgroundColor: colors.coralLight }]}>
              <Ionicons name="sparkles" size={18} color={colors.coral} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.emptyHighlightTitle, { color: colors.text }]}>No highlights yet today</Text>
              <Text style={[styles.emptyHighlightSub, { color: colors.textSecondary }]}>
                Record or transcribe a meeting to automatically extract key decisions and action checklists.
              </Text>
            </View>
          </View>
        ) : (
          todayHighlightRecordings.map((rec) => {
            return (
              <View
                key={rec.id}
                style={[styles.highlightCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.highlightCardHeader}>
                  <Text style={[styles.highlightTitle, { color: colors.text }]}>{rec.meetingTitle}</Text>
                  <Text style={[styles.highlightMeta, { color: colors.textSecondary }]}>
                    {rec.summary?.actionItems.length || 0} action items · AI Summary
                  </Text>
                </View>

                {/* Action Item Checklists */}
                <View style={styles.checklistContainer}>
                  {rec.summary?.actionItems.map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      onPress={() => toggleActionItem(rec.id, item.id)}
                      style={styles.checklistItemRow}>
                      <View
                        style={[
                          styles.checkbox,
                          item.done
                            ? { backgroundColor: '#34A853', borderColor: '#34A853' }
                            : { borderColor: colors.outline },
                        ]}>
                        {item.done && <Ionicons name="checkmark" size={13} color="#FFFFFF" />}
                      </View>
                      <Text
                        style={[
                          styles.checklistText,
                          { color: item.done ? colors.textMuted : colors.text },
                          item.done && styles.checklistTextStrikethrough,
                        ]}>
                        {item.task}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            );
          })
        )}

        {/* 5. SCHEDULED MEETINGS QUICK LIST */}
        <View style={[styles.sectionHeaderRow, { marginTop: 10 }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Scheduled Meetings</Text>
          <TouchableOpacity onPress={() => router.push('/meetings')}>
            <Text style={[styles.seeAllText, { color: colors.coral }]}>View Calendar</Text>
          </TouchableOpacity>
        </View>

        {upcomingMeetingsList.length === 0 ? (
          <View style={[styles.emptyUpcomingCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.emptyIconCircle, { backgroundColor: colors.surfaceContainer }]}>
              <Ionicons name="calendar-outline" size={24} color={colors.primary} />
            </View>
            <Text style={[styles.emptyUpcomingTitle, { color: colors.text }]}>No meetings scheduled today</Text>
            <Text style={[styles.emptyUpcomingSub, { color: colors.textSecondary }]}>
              Schedule a new meeting or connect your calendar to sync events.
            </Text>
            <TouchableOpacity
              onPress={() => setManualModalOpen(true)}
              style={[styles.addFirstMeetingPill, { backgroundColor: colors.primary }]}>
              <Ionicons name="add" size={15} color="#FFFFFF" style={{ marginRight: 4 }} />
              <Text style={styles.addFirstMeetingPillText}>Schedule Meeting</Text>
            </TouchableOpacity>
          </View>
        ) : (
          upcomingMeetingsList.map((m) => (
            <MeetingCard
              key={m.id}
              meeting={m}
              onPress={() => router.push({ pathname: '/meeting/[id]', params: { id: m.id } })}
              onRecordPress={() => handleStartRecording(m)}
              onInvitePress={() => setInviteMeeting(m)}
            />
          ))
        )}
      </ScrollView>

      {/* Quick Note Composer Modal */}
      <Modal
        visible={quickNoteModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setQuickNoteModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.quickNoteModalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.modalHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={[styles.quickNoteDot, { backgroundColor: colors.olive }]} />
                <Text style={[styles.modalTitle, { color: colors.text }]}>Quick Notes</Text>
              </View>
              <TouchableOpacity onPress={() => setQuickNoteModalVisible(false)}>
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalSub, { color: colors.textSecondary }]}>
              Save a personal reminder, context, or key takeaways.
            </Text>

            <TextInput
              style={[
                styles.quickNoteInput,
                {
                  backgroundColor: colors.surfaceContainer,
                  borderColor: colors.border,
                  color: colors.text,
                },
              ]}
              multiline
              numberOfLines={4}
              value={quickNoteDraft}
              onChangeText={setQuickNoteDraft}
              placeholder="Save a personal reminder about this person..."
              placeholderTextColor={colors.textMuted}
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                onPress={() => {
                  setQuickNoteModalVisible(false);
                  handleStartRecording();
                }}
                style={[styles.modalVoiceBtn, { backgroundColor: colors.coralLight }]}>
                <Ionicons name="mic" size={14} color={colors.coral} style={{ marginRight: 4 }} />
                <Text style={[styles.modalVoiceBtnText, { color: colors.coral }]}>Voice Memo</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleSaveQuickNote}
                style={[styles.modalSaveBtn, { backgroundColor: colors.primary }]}>
                <Text style={styles.modalSaveBtnText}>Save Note</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Manual Meeting Scheduling Modal */}
      <ManualMeetingModal
        visible={manualModalOpen}
        onClose={() => setManualModalOpen(false)}
        onSubmit={(meetingData) => {
          addMeeting(meetingData);
          setManualModalOpen(false);
        }}
      />

      {/* Meeting Invite / Share Modal */}
      <MeetingInviteModal
        visible={inviteMeeting !== null}
        meeting={inviteMeeting}
        onClose={() => setInviteMeeting(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 6,
    backgroundColor: 'transparent',
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  avatarInitials: {
    fontSize: 15,
    fontWeight: '800',
    color: '#3D2E00',
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'transparent',
  },
  headerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  notificationBadge: {
    position: 'absolute',
    top: 9,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  greetingSection: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 14,
    backgroundColor: 'transparent',
  },
  greetingTitle: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  greetingSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 2,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  toastBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 14,
  },
  toastBannerText: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  ongoingCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 14,
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  ongoingCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  videoIconWell: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  ongoingTextCol: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  ongoingLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
    backgroundColor: 'transparent',
  },
  ongoingLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  liveIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'transparent',
  },
  liveBlinker: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  liveText: {
    fontSize: 10,
    fontWeight: '700',
  },
  ongoingTitle: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  ongoingFacepile: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  miniAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  miniAvatarText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  miniAvatarBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  miniAvatarBadgeText: {
    fontSize: 9,
    fontWeight: '700',
  },
  splitRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
    backgroundColor: 'transparent',
  },
  splitCard: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    minHeight: 144,
    justifyContent: 'space-between',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  splitCardHeader: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  nextMeetingDate: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  nextMeetingTime: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
    marginBottom: 12,
  },
  reminderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    paddingVertical: 7,
    paddingHorizontal: 10,
  },
  reminderBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  quickNotesTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    backgroundColor: 'transparent',
  },
  quickNotesTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  quickNotesIconCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickNotesBody: {
    color: '#EBF0E6',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
  },
  quickNotesFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    backgroundColor: 'transparent',
  },
  quickNotesTapHint: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 10,
    fontWeight: '600',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: 'transparent',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  seeAllText: {
    fontSize: 12,
    fontWeight: '700',
  },
  highlightCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginBottom: 14,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
  },
  highlightCardHeader: {
    marginBottom: 10,
    backgroundColor: 'transparent',
  },
  highlightTitle: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
    marginBottom: 2,
  },
  highlightMeta: {
    fontSize: 11,
    fontWeight: '500',
  },
  checklistContainer: {
    gap: 8,
    backgroundColor: 'transparent',
  },
  checklistItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  checklistText: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  checklistTextStrikethrough: {
    textDecorationLine: 'line-through',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  quickNoteModalCard: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    elevation: 8,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
    backgroundColor: 'transparent',
  },
  quickNoteDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  modalSub: {
    fontSize: 12,
    marginBottom: 14,
  },
  quickNoteInput: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    fontSize: 13,
    minHeight: 90,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: 'transparent',
  },
  modalVoiceBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 20,
  },
  modalVoiceBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  modalSaveBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 20,
  },
  modalSaveBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  quickStartBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyHighlightCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    gap: 12,
    marginBottom: 14,
  },
  emptyHighlightIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyHighlightTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  emptyHighlightSub: {
    fontSize: 12,
    lineHeight: 16,
  },
  emptyUpcomingCard: {
    alignItems: 'center',
    padding: 24,
    borderRadius: 24,
    borderWidth: 1,
    marginBottom: 16,
  },
  emptyIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  emptyUpcomingTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  emptyUpcomingSub: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
    maxWidth: 260,
  },
  addFirstMeetingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  addFirstMeetingPillText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
