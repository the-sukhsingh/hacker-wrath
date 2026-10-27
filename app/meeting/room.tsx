import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Clipboard,
  Platform,
  Alert,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Text, View } from '@/components/Themed';
import { Ionicons } from '@expo/vector-icons';
import { useVoiceRoomStore } from '@/store/voiceRoomStore';
import { useMeetingStore } from '@/store/meetingStore';
import { voiceRoomService } from '@/services/voiceRoomService';
import { slmSummarizerService } from '@/services/slmSummarizerService';
import { VoiceParticipantTile } from '@/components/VoiceParticipantTile';
import { MeetingInviteModal } from '@/components/MeetingInviteModal';
import { ToastNotification, ToastConfig } from '@/components/ToastNotification';
import { LiveTopicRecallPanel } from '@/components/LiveTopicRecallPanel';
import { realtimeTopicRetrievalService, TopicMatchResult } from '@/services/realtimeTopicRetrievalService';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { Meeting } from '@/types/meeting';

export default function VoiceRoomScreen() {
  const router = useRouter();
  const theme = useColorScheme();
  const colors = Colors[theme];
  const insets = useSafeAreaInsets();
  const { id, code } = useLocalSearchParams<{ id?: string; code?: string }>();

  const {
    activeRoom,
    currentUserId,
    currentUserName,
    isMicMuted,
    isHandRaised,
    joinRoom,
    leaveRoom,
    endActiveRoom,
    toggleMicMute,
    toggleHandRaise,
  } = useVoiceRoomStore();

  const { addRecording, meetings, recordings } = useMeetingStore();

  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [copiedCode, setCopiedCode] = useState(false);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [transcriptDrawerOpen, setTranscriptDrawerOpen] = useState(false);
  const [endCallModalOpen, setEndCallModalOpen] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [toast, setToast] = useState<ToastConfig | null>(null);
  const [topicMatches, setTopicMatches] = useState<TopicMatchResult[]>([]);

  const sessionStartTimeRef = useRef<number>(Date.now());
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 1. Ensure room is joined
  useEffect(() => {
    let room = activeRoom;
    if (!room && (code || id)) {
      room = joinRoom(code || id || '', currentUserName);
    }

    if (room) {
      const myParticipant = room.participants.find((p) => p.id === currentUserId) || {
        id: currentUserId,
        name: currentUserName,
        avatarColor: '#E06D53',
        initials: 'LV',
        role: room.hostId === currentUserId ? ('host' as const) : ('speaker' as const),
        isMuted: false,
        isSpeaking: false,
        audioLevel: 0,
        handRaised: false,
        joinedAt: Date.now(),
      };

      voiceRoomService.joinVoiceRoom(room.id, myParticipant);
    }

    return () => {
      // Clean up when unmounting
      if (activeRoom) {
        voiceRoomService.leaveVoiceRoom(activeRoom.id, currentUserId, currentUserName);
      }
    };
  }, []);

  // 2. High-precision duration timer
  useEffect(() => {
    sessionStartTimeRef.current = Date.now();
    timerIntervalRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - sessionStartTimeRef.current) / 1000);
      setElapsedSeconds(elapsed);
    }, 500);

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, []);

  // 3. Topic retrieval subscription
  useEffect(() => {
    realtimeTopicRetrievalService.indexCorpus(recordings, meetings);
    const unsubscribe = realtimeTopicRetrievalService.subscribe((matches) => {
      setTopicMatches(matches);
    });
    return () => unsubscribe();
  }, [recordings, meetings]);

  const formatTimer = (totalSeconds: number): string => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleCopyCode = () => {
    if (!activeRoom) return;
    Clipboard.setString(activeRoom.code);
    setCopiedCode(true);
    setToast({
      title: 'Room Code Copied',
      message: `Code "${activeRoom.code}" copied to clipboard.`,
      type: 'success',
      duration: 2000,
    });
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleToggleMic = () => {
    const nextMuted = toggleMicMute();
    if (activeRoom) {
      voiceRoomService.setMute(nextMuted, currentUserId, currentUserName);
    }
  };

  const handleToggleHand = () => {
    const nextHand = toggleHandRaise();
    if (activeRoom) {
      voiceRoomService.sendHandRaise(nextHand, currentUserId, currentUserName);
    }
  };

  const handleEndAndSummarize = async () => {
    if (!activeRoom) return;

    setEndCallModalOpen(false);
    setIsSummarizing(true);
    setToast({
      title: 'Synthesizing Meeting Minutes',
      message: 'Extracting key decisions and action items with on-device SLM...',
      type: 'processing',
      duration: 0,
    });

    try {
      // Build raw transcript text from room segments
      const fullTranscript =
        activeRoom.transcript.length > 0
          ? activeRoom.transcript.map((t) => `[${t.speakerName}]: ${t.text}`).join('\n')
          : `Meeting in room "${activeRoom.title}" concluded with ${activeRoom.participants.length} participants. Key topics discussed included sprint objectives and team coordination.`;

      // Run SLM summarization
      const slmResult = await slmSummarizerService.generateKeyPointsWithSLM(
        fullTranscript,
        activeRoom.title
      );

      // Save as recording note in meeting store
      const recordingId = `rec-${Date.now().toString(36)}`;
      addRecording({
        id: recordingId,
        meetingId: activeRoom.linkedMeetingId,
        meetingTitle: activeRoom.title,
        uri: 'file:///recordings/voice-room-session.wav',
        durationSeconds: Math.max(elapsedSeconds, 15),
        fileSizeBytes: 420000,
        createdAt: new Date().toISOString(),
        audioFormat: 'wav_16khz_mono',
        status: 'completed',
        transcript: fullTranscript,
        summary: slmResult.summary,
        notes: slmResult.notes,
        tags: slmResult.tags,
      });

      // Leave and end the voice room
      voiceRoomService.endRoom(activeRoom.id, currentUserId, currentUserName);
      endActiveRoom();

      setToast({
        title: 'Meeting Notes Generated!',
        message: 'Action items & decisions saved to My Notes.',
        type: 'success',
        duration: 3000,
      });

      // Navigate to notes
      setTimeout(() => {
        router.replace('/notes');
      }, 1000);
    } catch (err) {
      console.warn('Error summarizing room:', err);
      voiceRoomService.leaveVoiceRoom(activeRoom.id, currentUserId, currentUserName);
      leaveRoom();
      router.back();
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleLeaveOnly = () => {
    setEndCallModalOpen(false);
    if (activeRoom) {
      voiceRoomService.leaveVoiceRoom(activeRoom.id, currentUserId, currentUserName);
      leaveRoom();
    }
    router.back();
  };

  if (!activeRoom) {
    return (
      <View style={[styles.screen, styles.center, { backgroundColor: colors.background }]}>
        <Ionicons name="radio-outline" size={48} color={colors.textMuted} />
        <Text style={[styles.emptyTitle, { color: colors.text }]}>No Active Voice Room</Text>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.backBtn, { backgroundColor: colors.primary }]}>
          <Text style={styles.backBtnText}>Return to Meetings</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Create mock Meeting object for MeetingInviteModal
  const inviteMeetingObj: Meeting = {
    id: activeRoom.id,
    title: activeRoom.title,
    date: 'Today',
    startTime: formatTimer(elapsedSeconds),
    endTime: '',
    durationMinutes: Math.ceil(elapsedSeconds / 60),
    platform: 'other',
    meetingUrl: `https://meetanotes.io/room/${activeRoom.code}`,
    attendees: activeRoom.participants.map((p) => p.name),
    agenda: activeRoom.topic,
    source: 'manual',
    status: 'in_progress',
    recordingIds: [],
    createdAt: activeRoom.createdAt,
  };

  const latestTranscript =
    activeRoom.transcript.length > 0
      ? activeRoom.transcript[activeRoom.transcript.length - 1]
      : null;

  const isHost = activeRoom.hostId === currentUserId;

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      {/* Toast Notification */}
      <ToastNotification toast={toast} onDismiss={() => setToast(null)} />

      {/* TOP HEADER BAR */}
      <View
        style={[
          styles.topHeader,
          {
            paddingTop: insets.top + (Platform.OS === 'ios' ? 8 : 14),
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
        ]}>
        {/* Back / Minimise */}
        <TouchableOpacity
          onPress={() => setEndCallModalOpen(true)}
          style={[styles.headerIconBtn, { backgroundColor: colors.surfaceContainer }]}>
          <Ionicons name="chevron-down" size={22} color={colors.text} />
        </TouchableOpacity>

        {/* Live Status & Room Code Pill */}
        <TouchableOpacity
          onPress={handleCopyCode}
          activeOpacity={0.8}
          style={[styles.liveCodePill, { backgroundColor: colors.surfaceContainerLow, borderColor: colors.border }]}>
          <View style={styles.liveRedDot} />
          <Text style={[styles.liveCodeText, { color: colors.text }]}>
            {activeRoom.code}
          </Text>
          <Ionicons
            name={copiedCode ? 'checkmark' : 'copy-outline'}
            size={13}
            color={copiedCode ? colors.primary : colors.textSecondary}
            style={{ marginLeft: 4 }}
          />
        </TouchableOpacity>

        {/* Elapsed Timer Pill */}
        <View style={[styles.timerBadge, { backgroundColor: colors.surfaceContainer }]}>
          <Ionicons name="time-outline" size={13} color={colors.textSecondary} style={{ marginRight: 4 }} />
          <Text style={[styles.timerText, { color: colors.text }]}>{formatTimer(elapsedSeconds)}</Text>
        </View>

        {/* QR & Invite Button */}
        <TouchableOpacity
          onPress={() => setInviteModalOpen(true)}
          style={[styles.headerIconBtn, { backgroundColor: colors.coralLight }]}>
          <Ionicons name="qr-code" size={18} color={colors.coral} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 110 }]}
        showsVerticalScrollIndicator={false}>
        {/* ROOM TITLE & META */}
        <View style={styles.titleSection}>
          <Text style={[styles.roomTitle, { color: colors.text }]} numberOfLines={2}>
            {activeRoom.title}
          </Text>
          {activeRoom.topic ? (
            <View style={[styles.topicBadge, { backgroundColor: colors.oliveLight }]}>
              <Ionicons name="pricetag-outline" size={12} color={colors.olive} style={{ marginRight: 4 }} />
              <Text style={[styles.topicText, { color: colors.olive }]}>{activeRoom.topic}</Text>
            </View>
          ) : null}

          <View style={styles.participantCountRow}>
            <Ionicons name="people" size={14} color={colors.textSecondary} style={{ marginRight: 5 }} />
            <Text style={[styles.participantCountText, { color: colors.textSecondary }]}>
              {activeRoom.participants.length} in Voice Room
            </Text>
          </View>
        </View>

        {/* PARTICIPANTS STAGE GRID */}
        <View style={styles.stageGrid}>
          {activeRoom.participants.map((participant) => (
            <View key={participant.id} style={styles.gridColumn}>
              <VoiceParticipantTile
                participant={participant}
                isCurrentUser={participant.id === currentUserId}
                onPress={() => {
                  if (participant.id === currentUserId) {
                    handleToggleMic();
                  }
                }}
              />
            </View>
          ))}
        </View>

        {/* REAL-TIME TOPIC RECALL CHIPS */}
        {topicMatches.length > 0 && (
          <View style={{ width: '100%', marginTop: 16 }}>
            <LiveTopicRecallPanel
              topicMatches={topicMatches}
              isRecording={true}
              onInsertContextSnippet={() => {}}
            />
          </View>
        )}

        {/* FLOATING LIVE SPEECH / TRANSCRIPT BANNER */}
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => setTranscriptDrawerOpen(true)}
          style={[
            styles.liveSpeechBanner,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}>
          <View style={[styles.speechIconBubble, { backgroundColor: colors.coralLight }]}>
            <Ionicons name="chatbubble-ellipses" size={16} color={colors.coral} />
          </View>

          <View style={styles.speechTextContainer}>
            <View style={styles.speechSpeakerRow}>
              <Text style={[styles.speechSpeakerName, { color: colors.coral }]}>
                {latestTranscript ? latestTranscript.speakerName : 'Listening...'}
              </Text>
              <Text style={[styles.speechStatusMeta, { color: colors.textMuted }]}>
                {activeRoom.transcript.length} lines • Tap for transcript
              </Text>
            </View>
            <Text style={[styles.speechBodyText, { color: colors.text }]} numberOfLines={2}>
              {latestTranscript ? latestTranscript.text : 'Speak into your microphone to transcribe live...'}
            </Text>
          </View>

          <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
        </TouchableOpacity>
      </ScrollView>

      {/* IN-CALL FLOATING CONTROL DOCK */}
      <View
        style={[
          styles.inCallDockWrapper,
          {
            bottom: Math.max(insets.bottom, 14),
          },
        ]}>
        <View
          style={[
            styles.inCallDock,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}>
          {/* 1. Mute / Unmute Mic */}
          <TouchableOpacity
            onPress={handleToggleMic}
            style={[
              styles.dockCircleBtn,
              {
                backgroundColor: isMicMuted ? '#FEE2E2' : colors.primary,
              },
            ]}>
            <Ionicons
              name={isMicMuted ? 'mic-off' : 'mic'}
              size={22}
              color={isMicMuted ? '#EF4444' : '#FFFFFF'}
            />
          </TouchableOpacity>

          {/* 2. Raise Hand */}
          <TouchableOpacity
            onPress={handleToggleHand}
            style={[
              styles.dockCircleBtn,
              {
                backgroundColor: isHandRaised ? '#FEF3D6' : colors.surfaceContainer,
              },
            ]}>
            <Text style={{ fontSize: 20 }}>{isHandRaised ? '✋' : '👋'}</Text>
          </TouchableOpacity>

          {/* 3. Transcript Sheet */}
          <TouchableOpacity
            onPress={() => setTranscriptDrawerOpen(true)}
            style={[styles.dockCircleBtn, { backgroundColor: colors.surfaceContainer }]}>
            <Ionicons name="document-text-outline" size={20} color={colors.text} />
          </TouchableOpacity>

          {/* 4. Share & QR */}
          <TouchableOpacity
            onPress={() => setInviteModalOpen(true)}
            style={[styles.dockCircleBtn, { backgroundColor: colors.surfaceContainer }]}>
            <Ionicons name="share-social-outline" size={20} color={colors.text} />
          </TouchableOpacity>

          {/* 5. End / Leave Room (Red Button) */}
          <TouchableOpacity
            onPress={() => setEndCallModalOpen(true)}
            style={[styles.endCallBtn, { backgroundColor: '#E53935' }]}>
            <Ionicons name="call" size={20} color="#FFFFFF" style={{ transform: [{ rotate: '135deg' }] }} />
          </TouchableOpacity>
        </View>
      </View>

      {/* FULL TRANSCRIPT MODAL / DRAWER */}
      <Modal
        visible={transcriptDrawerOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setTranscriptDrawerOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.transcriptSheet, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Live Room Transcript</Text>
                <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
                  {activeRoom.transcript.length} speech segments recorded
                </Text>
              </View>
              <TouchableOpacity onPress={() => setTranscriptDrawerOpen(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.transcriptList} showsVerticalScrollIndicator={false}>
              {activeRoom.transcript.length === 0 ? (
                <View style={styles.emptyTranscriptContainer}>
                  <Ionicons name="mic-outline" size={36} color={colors.textMuted} />
                  <Text style={[styles.emptyTranscriptText, { color: colors.textMuted }]}>
                    No speech recorded yet. Speak to begin transcribing.
                  </Text>
                </View>
              ) : (
                activeRoom.transcript.map((item) => (
                  <View key={item.id} style={[styles.transcriptItem, { borderBottomColor: colors.border }]}>
                    <View style={styles.transcriptItemHeader}>
                      <Text style={[styles.transcriptSpeaker, { color: colors.coral }]}>
                        {item.speakerName}
                      </Text>
                      <Text style={[styles.transcriptTime, { color: colors.textMuted }]}>
                        {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </Text>
                    </View>
                    <Text style={[styles.transcriptBody, { color: colors.text }]}>{item.text}</Text>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* END CALL / SUMMARY ACTION MODAL */}
      <Modal
        visible={endCallModalOpen}
        animationType="fade"
        transparent
        onRequestClose={() => setEndCallModalOpen(false)}>
        <View style={styles.modalOverlayCenter}>
          <View style={[styles.endCallDialog, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.endCallIconBadge, { backgroundColor: colors.coralLight }]}>
              <Ionicons name="sparkles" size={24} color={colors.coral} />
            </View>

            <Text style={[styles.endCallTitle, { color: colors.text }]}>
              {isHost ? 'End Voice Meeting?' : 'Leave Voice Room?'}
            </Text>

            <Text style={[styles.endCallDescription, { color: colors.textSecondary }]}>
              Automatically extract key decisions, action items, and structured meeting minutes using on-device SLM.
            </Text>

            <View style={styles.endCallBtnCol}>
              <TouchableOpacity
                onPress={handleEndAndSummarize}
                style={[styles.primaryModalBtn, { backgroundColor: colors.primary }]}>
                <Ionicons name="document-text" size={17} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.primaryModalBtnText}>End & Generate AI Notes</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleLeaveOnly}
                style={[styles.secondaryModalBtn, { borderColor: colors.border }]}>
                <Text style={[styles.secondaryModalBtnText, { color: colors.text }]}>
                  Just Leave Room
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setEndCallModalOpen(false)}
                style={styles.cancelTextBtn}>
                <Text style={[styles.cancelText, { color: colors.textSecondary }]}>Continue Calling</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* QR & INVITE MODAL */}
      <MeetingInviteModal
        visible={inviteModalOpen}
        meeting={inviteMeetingObj}
        onClose={() => setInviteModalOpen(false)}
      />
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
    padding: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 14,
    marginBottom: 20,
  },
  backBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
  },
  backBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  liveCodePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
  },
  liveRedDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#EF4444',
    marginRight: 6,
  },
  liveCodeText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
  },
  timerText: {
    fontSize: 12,
    fontWeight: '700',
  },
  scrollContent: {
    padding: 16,
  },
  titleSection: {
    marginBottom: 16,
  },
  roomTitle: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.4,
    lineHeight: 28,
    marginBottom: 6,
  },
  topicBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    marginBottom: 8,
  },
  topicText: {
    fontSize: 12,
    fontWeight: '600',
  },
  participantCountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  participantCountText: {
    fontSize: 13,
    fontWeight: '500',
  },
  stageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  gridColumn: {
    width: '50%',
    padding: 6,
  },
  liveSpeechBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 1,
    padding: 14,
    marginTop: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  speechIconBubble: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  speechTextContainer: {
    flex: 1,
    paddingRight: 6,
  },
  speechSpeakerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  speechSpeakerName: {
    fontSize: 12,
    fontWeight: '700',
  },
  speechStatusMeta: {
    fontSize: 10,
    fontWeight: '500',
  },
  speechBodyText: {
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
  },
  inCallDockWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 99,
  },
  inCallDock: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 66,
    borderRadius: 36,
    width: '92%',
    maxWidth: 420,
    borderWidth: 1,
    elevation: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    ...(Platform.OS === 'web' ? { backdropFilter: 'blur(20px)' } : {}),
  },
  dockCircleBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  endCallBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#E53935',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalOverlayCenter: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  transcriptSheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    maxHeight: '75%',
    borderWidth: 1,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  modalSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  transcriptList: {
    marginTop: 8,
  },
  emptyTranscriptContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyTranscriptText: {
    fontSize: 13,
    marginTop: 10,
    textAlign: 'center',
  },
  transcriptItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  transcriptItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  transcriptSpeaker: {
    fontSize: 12,
    fontWeight: '700',
  },
  transcriptTime: {
    fontSize: 11,
  },
  transcriptBody: {
    fontSize: 13,
    lineHeight: 18,
  },
  endCallDialog: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    elevation: 16,
  },
  endCallIconBadge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  endCallTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 8,
  },
  endCallDescription: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  endCallBtnCol: {
    width: '100%',
    gap: 10,
  },
  primaryModalBtn: {
    flexDirection: 'row',
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryModalBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  secondaryModalBtn: {
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  secondaryModalBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  cancelTextBtn: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  cancelText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
