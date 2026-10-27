import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  Platform,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, View } from '@/components/Themed';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMeetingStore } from '@/store/meetingStore';
import { audioRecorder } from '@/services/audioRecorder';
import { realtimeTranscriptionService } from '@/services/realtimeTranscriptionService';
import { slmSummarizerService } from '@/services/slmSummarizerService';
import { realtimeTopicRetrievalService, TopicMatchResult } from '@/services/realtimeTopicRetrievalService';
import { LiveTopicRecallPanel } from '@/components/LiveTopicRecallPanel';
import { ShaderOrb } from '@/components/ShaderOrb';
import { ToastNotification, ToastConfig } from '@/components/ToastNotification';
import { VoiceParticipantTile } from '@/components/VoiceParticipantTile';
import { CreateVoiceRoomModal } from '@/components/CreateVoiceRoomModal';
import { JoinVoiceRoomModal } from '@/components/JoinVoiceRoomModal';
import { MeetingInviteModal } from '@/components/MeetingInviteModal';
import { useVoiceRoomStore } from '@/store/voiceRoomStore';
import { voiceRoomService } from '@/services/voiceRoomService';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

export default function RecordScreen() {
  const router = useRouter();
  const theme = useColorScheme();
  const colors = Colors[theme];
  const insets = useSafeAreaInsets();

  const {
    meetings,
    recordings,
    activeRecording,
    startRecordingSession,
    pauseRecordingSession,
    resumeRecordingSession,
    updateActiveElapsed,
    updateActiveMeter,
    stopAndSaveRecordingSession,
    discardRecordingSession,
    updateRecording,
  } = useMeetingStore();

  const [manualMeetingId, setManualMeetingId] = useState<string | undefined>(undefined);
  const selectedMeetingId = activeRecording.meetingId ?? manualMeetingId;

  const [meetingPickerOpen, setMeetingPickerOpen] = useState(false);
  const [toast, setToast] = useState<ToastConfig | null>(null);

  // Real-time transcription state
  const [liveTranscript, setLiveTranscript] = useState<string>('');
  const [isEditingTranscript, setIsEditingTranscript] = useState<boolean>(false);
  const [editingText, setEditingText] = useState<string>('');
  const transcriptScrollRef = useRef<ScrollView | null>(null);

  // Room view vs Deck view mode
  const [recordViewMode, setRecordViewMode] = useState<'deck' | 'room'>('deck');
  const [isMicMuted, setIsMicMuted] = useState<boolean>(false);
  const [createRoomModalOpen, setCreateRoomModalOpen] = useState<boolean>(false);
  const [joinRoomModalOpen, setJoinRoomModalOpen] = useState<boolean>(false);
  const [inviteModalOpen, setInviteModalOpen] = useState<boolean>(false);

  const { activeRoom, currentUserId, currentUserName, toggleMicMute } = useVoiceRoomStore();

  // Real-time topic recall state
  const [topicMatches, setTopicMatches] = useState<TopicMatchResult[]>([]);

  // High-accuracy wall clock refs to prevent timer drift
  const sessionStartTimeRef = useRef<number | null>(null);
  const pausedDurationRef = useRef<number>(0);
  const lastPausedAtRef = useRef<number | null>(null);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Index corpus for real-time topic retrieval
  useEffect(() => {
    realtimeTopicRetrievalService.indexCorpus(recordings, meetings);
  }, [recordings, meetings]);

  // Subscribe to real-time topic updates
  useEffect(() => {
    const unsubscribe = realtimeTopicRetrievalService.subscribe((matches) => {
      setTopicMatches(matches);
    });
    return () => {
      unsubscribe();
    };
  }, []);

  // High-precision clock ticker: reads actual monotonic wall clock
  const startTimerTicker = useCallback(() => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);

    timerIntervalRef.current = setInterval(() => {
      if (!sessionStartTimeRef.current) return;
      const now = Date.now();
      const effectiveMs = now - sessionStartTimeRef.current - pausedDurationRef.current;
      const totalSec = Math.max(0, Math.floor(effectiveMs / 1000));
      updateActiveElapsed(totalSec);
    }, 250);
  }, [updateActiveElapsed]);

  const stopTimerTicker = useCallback(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  }, []);

  // Synchronize timer ticker with store recording lifecycle
  useEffect(() => {
    if (activeRecording.isRecording && !activeRecording.isPaused) {
      if (!sessionStartTimeRef.current) {
        sessionStartTimeRef.current = Date.now();
      }
      startTimerTicker();
    } else {
      stopTimerTicker();
    }

    return () => {
      stopTimerTicker();
    };
  }, [activeRecording.isRecording, activeRecording.isPaused, startTimerTicker, stopTimerTicker]);

  const formatTimer = (totalSeconds: number): string => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    const hours = Math.floor(mins / 60);
    const remMins = mins % 60;

    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${remMins
        .toString()
        .padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStart = async () => {
    const chosenMeeting = meetings.find((m) => m.id === selectedMeetingId);
    const meetingTitle = chosenMeeting?.title || 'Quick Voice Note';

    setLiveTranscript('');
    setTopicMatches([]);
    realtimeTopicRetrievalService.clear();

    sessionStartTimeRef.current = Date.now();
    pausedDurationRef.current = 0;
    lastPausedAtRef.current = null;

    startRecordingSession(selectedMeetingId, meetingTitle);
    startTimerTicker();

    realtimeTranscriptionService.start({
      meetingTitle,
      onTranscriptUpdate: (_chunk, full) => {
        setLiveTranscript(full);
        realtimeTopicRetrievalService.feedRealtimeSpeech(full);
        setTimeout(() => {
          transcriptScrollRef.current?.scrollToEnd({ animated: true });
        }, 60);
      },
    });

    await audioRecorder.startRecording((status) => {
      if (status.metering !== undefined) {
        updateActiveMeter(status.metering);
        realtimeTranscriptionService.feedAudioMeter(status.metering);
      }
    });
  };

  const handlePause = async () => {
    lastPausedAtRef.current = Date.now();
    stopTimerTicker();
    pauseRecordingSession();
    realtimeTranscriptionService.pause();
    await audioRecorder.pauseRecording();
  };

  const handleResume = async () => {
    if (lastPausedAtRef.current) {
      pausedDurationRef.current += Date.now() - lastPausedAtRef.current;
      lastPausedAtRef.current = null;
    }
    startTimerTicker();
    resumeRecordingSession();
    realtimeTranscriptionService.resume();
    await audioRecorder.resumeRecording();
  };

  const handleInsertContextSnippet = (snippet: string) => {
    setLiveTranscript((prev) => {
      const updated = prev ? `${prev.trimEnd()}\n${snippet}` : snippet;
      realtimeTranscriptionService.appendSegment(snippet);
      realtimeTopicRetrievalService.feedRealtimeSpeech(updated);
      return updated;
    });
  };

  // Background AI stop handler with instant user feedback & toast notifications
  const handleStop = async () => {
    stopTimerTicker();
    sessionStartTimeRef.current = null;
    pausedDurationRef.current = 0;
    lastPausedAtRef.current = null;

    const audioUri = await audioRecorder.stopRecording();
    const finalTranscript = (realtimeTranscriptionService.stop() || liveTranscript).trim();
    realtimeTopicRetrievalService.clear();

    const chosenMeeting = meetings.find((m) => m.id === selectedMeetingId);
    const meetingTitle = chosenMeeting?.title || activeRecording.meetingTitle || 'Quick Voice Note';

    // 1. Immediately save recording to store
    const newRec = stopAndSaveRecordingSession(audioUri, {
      transcript: finalTranscript,
    });

    // 2. Clear UI state immediately to release the user
    setLiveTranscript('');
    setTopicMatches([]);

    // 3. Show "AI Processing Started" Toast
    setToast({
      type: 'processing',
      title: 'AI Processing Started',
      message: `Analyzing transcript & generating action items for "${meetingTitle}"...`,
      duration: 3500,
    });

    // 4. Run SLM synthesis in background asynchronously
    (async () => {
      try {
        const slmResult = await slmSummarizerService.generateKeyPointsWithSLM(
          finalTranscript,
          meetingTitle
        );

        updateRecording(newRec.id, {
          status: 'completed',
          summary: slmResult.summary,
          notes: slmResult.notes,
          tags: slmResult.tags,
        });

        // 5. Show "Insights Ready" completion Toast
        setToast({
          type: 'success',
          title: 'Insights Ready',
          message: `Summary & action items generated for "${meetingTitle}"`,
          actionLabel: 'View',
          onAction: () => {
            router.push(`/meeting/${newRec.meetingId || newRec.id}`);
          },
          duration: 6000,
        });
      } catch (err) {
        console.warn('Background SLM generation error:', err);
        setToast({
          type: 'info',
          title: 'Recording Saved',
          message: `Voice note saved to library. You can re-synthesize anytime.`,
          duration: 4000,
        });
      }
    })();
  };

  const handleDiscard = async () => {
    Alert.alert(
      'Discard Recording?',
      'Are you sure you want to discard this recording? The audio will not be saved.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: async () => {
            stopTimerTicker();
            sessionStartTimeRef.current = null;
            pausedDurationRef.current = 0;
            lastPausedAtRef.current = null;

            await audioRecorder.cancelRecording();
            realtimeTranscriptionService.stop();
            realtimeTopicRetrievalService.clear();
            setTopicMatches([]);
            setLiveTranscript('');
            discardRecordingSession();
          },
        },
      ]
    );
  };

  const selectedMeeting = meetings.find((m) => m.id === selectedMeetingId);
  const isPermissionDenied = realtimeTranscriptionService.isPermissionDenied();

  let placeholderText = 'Listening for speech in 16kHz PCM audio... Speak into your microphone.';
  if (isPermissionDenied) {
    placeholderText = 'Microphone permission needed. Tap "Edit / Dictate" to add notes directly.';
  }

  const orbMode = activeRecording.isRecording
    ? activeRecording.isPaused
      ? 'paused'
      : 'recording'
    : 'idle';

  return (
    <View style={[styles.screen, { backgroundColor: colors.background, paddingTop: Math.max(insets.top, 14) }]}>
      {/* Floating In-App Toast Notification */}
      <ToastNotification
        toast={toast}
        onDismiss={() => setToast(null)}
        topOffset={Math.max(insets.top + 10, 24)}
      />

      {/* 1. MINIMAL TOP HEADER */}
      <View style={styles.topHeader}>
        <TouchableOpacity
          disabled={activeRecording.isRecording}
          onPress={() => setMeetingPickerOpen(true)}
          style={[
            styles.quietMeetingPill,
            {
              backgroundColor: colors.surfaceContainer,
              borderColor: colors.border,
              opacity: activeRecording.isRecording ? 0.8 : 1,
            },
          ]}>
          <Ionicons
            name={selectedMeeting ? 'calendar-outline' : 'mic-outline'}
            size={13}
            color={selectedMeeting ? colors.coral : colors.textSecondary}
          />
          <Text
            numberOfLines={1}
            style={[styles.quietMeetingPillText, { color: colors.text }]}>
            {selectedMeeting ? selectedMeeting.title : 'Quick Voice Note'}
          </Text>
          {!activeRecording.isRecording && (
            <Ionicons name="chevron-down" size={12} color={colors.textSecondary} />
          )}
        </TouchableOpacity>

        {/* View Mode Switcher: Solo Studio vs Voice Stage */}
        <TouchableOpacity
          onPress={() => setRecordViewMode(recordViewMode === 'deck' ? 'room' : 'deck')}
          style={[
            styles.viewModePillBtn,
            {
              backgroundColor: recordViewMode === 'room' ? colors.coralLight : colors.surfaceContainer,
              borderColor: recordViewMode === 'room' ? colors.coral : colors.border,
            },
          ]}
          accessibilityLabel={recordViewMode === 'deck' ? 'Switch to Voice Room Stage' : 'Switch to Solo Studio Deck'}>
          <Ionicons
            name={recordViewMode === 'deck' ? 'people-outline' : 'disc-outline'}
            size={14}
            color={recordViewMode === 'room' ? colors.coralDark : colors.text}
          />
          <Text
            style={[
              styles.viewModePillText,
              { color: recordViewMode === 'room' ? colors.coralDark : colors.textSecondary },
            ]}>
            {recordViewMode === 'deck' ? 'Voice Stage' : 'Solo Studio'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom + 90, 110) }]}
        showsVerticalScrollIndicator={false}>

        {/* 2. STUDIO VIEW */}
        {recordViewMode === 'deck' ? (
          <View style={styles.studioContainer}>
            {/* HERO STAGE: QUANTUM SHADER ORB */}
            <View style={styles.orbHeroStage}>
              <ShaderOrb
                state={orbMode}
                meterLevel={activeRecording.meterLevel}
                size={210}
              />

              {/* Minimal Elapsed Timer */}
              <Text style={[styles.timerDisplay, { color: colors.text }]}>
                {formatTimer(activeRecording.elapsedSeconds)}
              </Text>

              {/* Quiet State Subtitle */}
              <View style={styles.stateSubtitleRow}>
                {activeRecording.isRecording && !activeRecording.isPaused && (
                  <View style={[styles.recordingLiveDot, { backgroundColor: '#EF4444' }]} />
                )}
                <Text style={[styles.stateSubtitleText, { color: colors.textSecondary }]}>
                  {activeRecording.isRecording
                    ? activeRecording.isPaused
                      ? 'Paused'
                      : 'Listening...'
                    : 'Tap to start recording'}
                </Text>
              </View>
            </View>

            {/* REAL-TIME PAST TOPIC RECALL PANEL */}
            {(activeRecording.isRecording || liveTranscript.length > 0) && topicMatches.length > 0 && (
              <View style={{ width: '100%', marginBottom: 12 }}>
                <LiveTopicRecallPanel
                  topicMatches={topicMatches}
                  isRecording={activeRecording.isRecording && !activeRecording.isPaused}
                  onInsertContextSnippet={handleInsertContextSnippet}
                />
              </View>
            )}

            {/* REAL-TIME LIVE TRANSCRIPTION STREAM */}
            {(activeRecording.isRecording || liveTranscript.length > 0) && (
              <View
                style={[
                  styles.liveTranscriptBox,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}>
                <View style={styles.liveTranscriptHeader}>
                  <Text style={[styles.liveTranscriptLabel, { color: colors.textMuted }]}>
                    LIVE TRANSCRIPT
                  </Text>

                  <TouchableOpacity
                    onPress={() => {
                      setEditingText(liveTranscript);
                      setIsEditingTranscript(true);
                    }}
                    style={styles.editTranscriptBtn}
                    accessibilityLabel="Edit or Dictate Transcript">
                    <Ionicons name="create-outline" size={13} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                <ScrollView
                  ref={transcriptScrollRef}
                  style={styles.liveTranscriptScroll}
                  contentContainerStyle={{ paddingVertical: 2 }}
                  nestedScrollEnabled={true}
                  showsVerticalScrollIndicator={false}>
                  {liveTranscript.length > 0 ? (
                    <Text style={[styles.liveTranscriptText, { color: colors.text }]}>
                      {liveTranscript}
                      {activeRecording.isRecording && !activeRecording.isPaused && (
                        <Text style={[styles.liveBlinkingCursor, { color: colors.coral }]}> ▍</Text>
                      )}
                    </Text>
                  ) : (
                    <Text style={[styles.liveTranscriptPlaceholder, { color: colors.textMuted }]}>
                      {placeholderText}
                      {activeRecording.isRecording && !activeRecording.isPaused && (
                        <Text style={[styles.liveBlinkingCursor, { color: colors.coral }]}> ▍</Text>
                      )}
                    </Text>
                  )}
                </ScrollView>
              </View>
            )}

            {/* RECORDING CONTROL DOCK */}
            <View style={styles.controlDeck}>
              {!activeRecording.isRecording ? (
                /* IDLE STATE: Large Coral Studio Trigger */
                <TouchableOpacity
                  onPress={handleStart}
                  activeOpacity={0.88}
                  style={[styles.recordStudioBtn, { backgroundColor: colors.coral }]}>
                  <View style={styles.recordStudioBtnInner}>
                    <Ionicons name="mic" size={32} color="#FFFFFF" />
                  </View>
                </TouchableOpacity>
              ) : (
                /* ACTIVE RECORDING STATE: Pause / Stop Deck */
                <View style={styles.activeControlsRow}>
                  {/* Pause / Resume Button */}
                  <TouchableOpacity
                    onPress={activeRecording.isPaused ? handleResume : handlePause}
                    activeOpacity={0.8}
                    style={[
                      styles.pauseBtn,
                      {
                        backgroundColor: colors.surface,
                        borderColor: colors.border,
                      },
                    ]}>
                    <Ionicons
                      name={activeRecording.isPaused ? 'play' : 'pause'}
                      size={22}
                      color={colors.text}
                    />
                  </TouchableOpacity>

                  {/* Stop & Save Button */}
                  <TouchableOpacity
                    onPress={handleStop}
                    activeOpacity={0.85}
                    style={[styles.stopBtn, { backgroundColor: '#E53935' }]}>
                    <View style={styles.stopInnerSquare} />
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* DISCARD BUTTON (When recording) */}
            {activeRecording.isRecording && (
              <TouchableOpacity onPress={handleDiscard} style={styles.discardBtn}>
                <Ionicons name="trash-outline" size={13} color="#EF4444" style={{ marginRight: 5 }} />
                <Text style={styles.discardBtnText}>Discard Recording</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          /* 4. ROOM VIEW */
          <View style={styles.roomViewContainer}>
            {/* Active Room Header Pill or Launch Banner */}
            {activeRoom ? (
              <View style={[styles.activeRoomQuickBar, { backgroundColor: colors.coralLight, borderColor: colors.coral }]}>
                <View style={[styles.activeRoomLiveDot, { backgroundColor: colors.coral }]} />
                <View style={{ flex: 1, backgroundColor: 'transparent' }}>
                  <Text style={[styles.activeRoomQuickTitle, { color: colors.coralDark }]}>
                    LIVE ROOM • {activeRoom.code}
                  </Text>
                  <Text style={[styles.activeRoomQuickSub, { color: colors.text }]} numberOfLines={1}>
                    {activeRoom.title} ({activeRoom.participants.length} connected)
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => router.push({ pathname: '/meeting/room', params: { id: activeRoom.id, code: activeRoom.code } })}
                  style={[styles.fullscreenRoomBtn, { backgroundColor: colors.coral }]}>
                  <Text style={styles.fullscreenRoomBtnText}>Full View</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={[styles.noRoomBanner, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={[styles.noRoomIconBadge, { backgroundColor: colors.coralLight }]}>
                  <Ionicons name="radio" size={18} color={colors.coral} />
                </View>
                <View style={{ flex: 1, backgroundColor: 'transparent' }}>
                  <Text style={[styles.noRoomTitle, { color: colors.text }]}>Voice Meeting Rooms</Text>
                  <Text style={[styles.noRoomSub, { color: colors.textSecondary }]}>
                    Real-time WebRTC audio room with scannable QR code
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  <TouchableOpacity
                    onPress={() => setCreateRoomModalOpen(true)}
                    style={[styles.quickLaunchBtn, { backgroundColor: colors.primary }]}>
                    <Ionicons name="add" size={14} color="#FFF" />
                    <Text style={styles.quickLaunchBtnText}>New</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setJoinRoomModalOpen(true)}
                    style={[styles.quickJoinBtn, { borderColor: colors.border }]}>
                    <Text style={[styles.quickJoinBtnText, { color: colors.text }]}>Join</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            <View style={[styles.floatingSpeechPill, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={[styles.speechIconCircle, { backgroundColor: colors.coralLight }]}>
                <Ionicons name="chatbubble-ellipses" size={14} color={colors.coral} />
              </View>
              <Text style={[styles.floatingSpeechText, { color: colors.text }]} numberOfLines={1}>
                {liveTranscript.length > 0 ? liveTranscript : 'Listening for speech to transcribe...'}
              </Text>
              <TouchableOpacity
                onPress={() => setIsEditingTranscript(true)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="expand-outline" size={15} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Live Participants Grid OR Clean Empty Stage State */}
            {activeRoom && activeRoom.participants.length > 0 ? (
              <View style={styles.participantGrid}>
                {activeRoom.participants.map((p) => (
                  <View key={p.id} style={{ width: '48%', margin: '1%' }}>
                    <VoiceParticipantTile
                      participant={p}
                      isCurrentUser={p.id === currentUserId}
                      onPress={() => {
                        if (p.id === currentUserId) {
                          const nextMuted = toggleMicMute();
                          setIsMicMuted(nextMuted);
                          voiceRoomService.setMute(nextMuted, currentUserId, currentUserName);
                        }
                      }}
                    />
                  </View>
                ))}

                {/* If user is alone in the room, show an invite card right in the grid */}
                {activeRoom.participants.length === 1 && (
                  <View style={{ width: '48%', margin: '1%' }}>
                    <TouchableOpacity
                      onPress={() => setInviteModalOpen(true)}
                      style={[styles.inviteParticipantTile, { borderColor: colors.border, backgroundColor: colors.surfaceContainer }]}>
                      <View style={[styles.invitePlusBadge, { backgroundColor: colors.coralLight }]}>
                        <Ionicons name="person-add" size={20} color={colors.coral} />
                      </View>
                      <Text style={[styles.inviteTileTitle, { color: colors.text }]}>Invite Teammates</Text>
                      <Text style={[styles.inviteTileSub, { color: colors.textSecondary }]}>
                        Share Code: {activeRoom.code}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ) : (
              /* Sleek Empty State: NO dummy participants */
              <View style={[styles.emptyRoomCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={[styles.emptyRoomIconCircle, { backgroundColor: colors.coralLight }]}>
                  <Ionicons name="people" size={28} color={colors.coral} />
                </View>
                <Text style={[styles.emptyRoomTitle, { color: colors.text }]}>
                  Voice Meeting Stage
                </Text>
                <Text style={[styles.emptyRoomSubtitle, { color: colors.textSecondary }]}>
                  No active voice room in session. Create a live room to invite teammates via QR code or direct link, or join an ongoing room.
                </Text>
                <View style={styles.emptyRoomActionsCol}>
                  <TouchableOpacity
                    onPress={() => setCreateRoomModalOpen(true)}
                    style={[styles.emptyRoomPrimaryBtn, { backgroundColor: colors.coral }]}>
                    <Ionicons name="add-circle" size={16} color="#FFFFFF" />
                    <Text style={styles.emptyRoomPrimaryBtnText}>Create Voice Room</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setJoinRoomModalOpen(true)}
                    style={[styles.emptyRoomSecondaryBtn, { borderColor: colors.border, backgroundColor: colors.surfaceContainer }]}>
                    <Ionicons name="enter-outline" size={16} color={colors.text} />
                    <Text style={[styles.emptyRoomSecondaryBtnText, { color: colors.text }]}>Join with Code or QR</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setRecordViewMode('deck')}
                    style={styles.emptyRoomBackBtn}>
                    <Ionicons name="arrow-back" size={13} color={colors.textSecondary} />
                    <Text style={[styles.emptyRoomBackBtnText, { color: colors.textSecondary }]}>
                      Return to Solo Studio Deck
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* In-Call Floating Control Dock */}
            {activeRoom && (
              <View style={[styles.inCallDock, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <TouchableOpacity
                  onPress={() => {
                    const nextMuted = !isMicMuted;
                    setIsMicMuted(nextMuted);
                    toggleMicMute(nextMuted);
                    voiceRoomService.setMute(nextMuted, currentUserId, currentUserName);
                  }}
                  style={[styles.dockBtn, isMicMuted && { backgroundColor: '#FEE2E2' }]}>
                  <Ionicons
                    name={isMicMuted ? 'mic-off' : 'mic'}
                    size={20}
                    color={isMicMuted ? '#EF4444' : colors.text}
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setInviteModalOpen(true)}
                  style={styles.dockBtn}>
                  <Ionicons name="qr-code-outline" size={20} color={colors.coral} />
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => router.push({ pathname: '/meeting/room', params: { id: activeRoom.id, code: activeRoom.code } })}
                  style={styles.dockBtn}>
                  <Ionicons name="expand-outline" size={20} color={colors.text} />
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setRecordViewMode('deck')}
                  style={styles.dockBtn}>
                  <Ionicons name="disc-outline" size={20} color={colors.textSecondary} />
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    voiceRoomService.leaveVoiceRoom(activeRoom.id, currentUserId, currentUserName);
                  }}
                  style={[styles.endCallBtn, { backgroundColor: '#E53935' }]}>
                  <Ionicons name="close" size={20} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Target Meeting Picker Modal */}
      <Modal
        visible={meetingPickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setMeetingPickerOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.pickerModal, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.pickerHeader}>
              <Text style={[styles.pickerTitle, { color: colors.text }]}>Select Target Meeting</Text>
              <TouchableOpacity onPress={() => setMeetingPickerOpen(false)}>
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 320 }}>
              <TouchableOpacity
                onPress={() => {
                  setManualMeetingId(undefined);
                  setMeetingPickerOpen(false);
                }}
                style={[
                  styles.meetingOption,
                  {
                    backgroundColor: !selectedMeetingId ? colors.surfaceContainer : 'transparent',
                    borderColor: !selectedMeetingId ? colors.coral : colors.border,
                  },
                ]}>
                <Ionicons name="mic-outline" size={20} color={colors.coral} style={{ marginRight: 10 }} />
                <View>
                  <Text style={[styles.optionTitle, { color: colors.text }]}>Quick Voice Note</Text>
                  <Text style={[styles.optionSub, { color: colors.textSecondary }]}>
                    Ad-hoc voice capture with offline transcription
                  </Text>
                </View>
              </TouchableOpacity>

              {meetings.map((m) => {
                const isChosen = m.id === selectedMeetingId;
                return (
                  <TouchableOpacity
                    key={m.id}
                    onPress={() => {
                      setManualMeetingId(m.id);
                      setMeetingPickerOpen(false);
                    }}
                    style={[
                      styles.meetingOption,
                      {
                        backgroundColor: isChosen ? colors.surfaceContainer : 'transparent',
                        borderColor: isChosen ? colors.coral : colors.border,
                      },
                    ]}>
                    <Ionicons name="calendar-outline" size={18} color={colors.coral} style={{ marginRight: 10 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.optionTitle, { color: colors.text }]}>{m.title}</Text>
                      <Text style={[styles.optionSub, { color: colors.textSecondary }]}>
                        {m.startTime} – {m.endTime}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Real-time Dictation / Manual Edit Modal */}
      <Modal
        visible={isEditingTranscript}
        transparent
        animationType="fade"
        onRequestClose={() => setIsEditingTranscript(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.editTranscriptModalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.editTranscriptModalHeader}>
              <View>
                <Text style={[styles.editTranscriptModalTitle, { color: colors.text }]}>
                  Edit / Dictate Transcript
                </Text>
                <Text style={[styles.editTranscriptModalSub, { color: colors.textSecondary }]}>
                  Dictate using keyboard voice typing or refine manually
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsEditingTranscript(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <TextInput
              style={[
                styles.editTranscriptInput,
                {
                  backgroundColor: colors.surfaceContainer,
                  color: colors.text,
                  borderColor: colors.border,
                },
              ]}
              multiline
              autoFocus
              placeholder="Speak or type your meeting discussion here..."
              placeholderTextColor={colors.textMuted}
              value={editingText}
              onChangeText={setEditingText}
              textAlignVertical="top"
            />

            <View style={styles.editTranscriptModalActions}>
              <TouchableOpacity
                onPress={() => setEditingText('')}
                style={[styles.editModalSecondaryBtn, { borderColor: colors.border }]}>
                <Ionicons name="trash-outline" size={13} color={colors.textSecondary} style={{ marginRight: 4 }} />
                <Text style={[styles.editModalSecondaryText, { color: colors.textSecondary }]}>Clear</Text>
              </TouchableOpacity>

              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity
                  onPress={() => setIsEditingTranscript(false)}
                  style={[styles.editModalSecondaryBtn, { borderColor: colors.border }]}>
                  <Text style={[styles.editModalSecondaryText, { color: colors.textSecondary }]}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    const text = editingText.trim();
                    realtimeTranscriptionService.setTranscript(text);
                    setLiveTranscript(text);
                    realtimeTopicRetrievalService.feedRealtimeSpeech(text);
                    setIsEditingTranscript(false);
                  }}
                  style={[styles.editModalPrimaryBtn, { backgroundColor: colors.coral }]}>
                  <Ionicons name="checkmark" size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
                  <Text style={[styles.editModalPrimaryText, { color: '#FFFFFF' }]}>Apply</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Create Voice Room Modal */}
      <CreateVoiceRoomModal
        visible={createRoomModalOpen}
        onClose={() => setCreateRoomModalOpen(false)}
      />

      {/* Join Voice Room Modal */}
      <JoinVoiceRoomModal
        visible={joinRoomModalOpen}
        onClose={() => setJoinRoomModalOpen(false)}
      />

      {/* Voice Room Invite QR Modal */}
      {activeRoom && (
        <MeetingInviteModal
          visible={inviteModalOpen}
          meeting={{
            id: activeRoom.id,
            title: activeRoom.title,
            date: 'Today',
            startTime: 'Live',
            endTime: '',
            durationMinutes: 30,
            platform: 'other',
            meetingUrl: `https://meetanotes.io/room/${activeRoom.code}`,
            attendees: activeRoom.participants.map((p) => p.name),
            agenda: activeRoom.topic,
            source: 'manual',
            status: 'in_progress',
            recordingIds: [],
            createdAt: activeRoom.createdAt,
          }}
          onClose={() => setInviteModalOpen(false)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 14,
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.5,
    fontFamily: Platform.select({ ios: 'System', android: 'sans-serif' }),
  },
  screenSub: {
    fontSize: 12,
    fontWeight: '400',
    marginTop: 2,
    fontFamily: Platform.select({ ios: 'System', android: 'sans-serif' }),
  },
  quietMeetingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    gap: 7,
    maxWidth: '80%',
  },
  quietMeetingPillText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: Platform.select({ ios: 'System', android: 'sans-serif' }),
  },
  viewModeIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewModePillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 16,
    borderWidth: 1,
    gap: 5,
  },
  viewModePillText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: Platform.select({ ios: 'System', android: 'sans-serif' }),
  },
  scrollContent: {
    paddingHorizontal: 16,
  },
  studioContainer: {
    alignItems: 'center',
  },
  orbHeroStage: {
    width: '100%',
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 20,
  },
  timerDisplay: {
    fontSize: 52,
    fontWeight: '700',
    letterSpacing: -1,
    fontVariant: ['tabular-nums'],
    marginTop: 16,
    marginBottom: 4,
    fontFamily: Platform.select({ ios: 'System', android: 'sans-serif' }),
  },
  stateSubtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  recordingLiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  stateSubtitleText: {
    fontSize: 12,
    fontWeight: '500',
    fontFamily: Platform.select({ ios: 'System', android: 'sans-serif' }),
  },
  liveTranscriptBox: {
    width: '100%',
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    marginTop: 8,
  },
  liveTranscriptHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  liveTranscriptLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
    fontFamily: Platform.select({ ios: 'System', android: 'sans-serif' }),
  },
  editTranscriptBtn: {
    padding: 4,
  },
  liveTranscriptScroll: {
    maxHeight: 120,
  },
  liveTranscriptText: {
    fontSize: 13,
    lineHeight: 19,
    fontFamily: Platform.select({ ios: 'System', android: 'sans-serif' }),
  },
  liveTranscriptPlaceholder: {
    fontSize: 13,
    lineHeight: 19,
    fontStyle: 'italic',
    fontFamily: Platform.select({ ios: 'System', android: 'sans-serif' }),
  },
  liveBlinkingCursor: {
    fontSize: 14,
    fontWeight: '700',
  },
  controlDeck: {
    marginTop: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordStudioBtn: {
    width: 82,
    height: 82,
    borderRadius: 41,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#EB5E41',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
  },
  recordStudioBtnInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 28,
  },
  pauseBtn: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  stopBtn: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#E53935',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
  stopInnerSquare: {
    width: 26,
    height: 26,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
  },
  discardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 18,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  discardBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#EF4444',
    fontFamily: Platform.select({ ios: 'System', android: 'sans-serif' }),
  },
  modelStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
    marginTop: 22,
  },
  modelStatusText: {
    fontSize: 11,
    fontWeight: '500',
    fontFamily: Platform.select({ ios: 'System', android: 'sans-serif' }),
  },
  roomViewContainer: {
    marginTop: 4,
  },
  floatingSpeechPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 24,
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 10,
    marginBottom: 14,
  },
  speechIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatingSpeechText: {
    flex: 1,
    fontSize: 12,
    fontFamily: Platform.select({ ios: 'System', android: 'sans-serif' }),
  },
  participantGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  emptyRoomCard: {
    width: '100%',
    padding: 24,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    marginVertical: 10,
  },
  emptyRoomIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyRoomTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
    textAlign: 'center',
    fontFamily: Platform.select({ ios: 'System', android: 'sans-serif' }),
  },
  emptyRoomSubtitle: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 8,
    fontFamily: Platform.select({ ios: 'System', android: 'sans-serif' }),
  },
  emptyRoomActionsCol: {
    width: '100%',
    gap: 10,
  },
  emptyRoomPrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 14,
    gap: 8,
  },
  emptyRoomPrimaryBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  emptyRoomSecondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
  },
  emptyRoomSecondaryBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  emptyRoomBackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 5,
    marginTop: 4,
  },
  emptyRoomBackBtnText: {
    fontSize: 12,
    fontWeight: '500',
  },
  inviteParticipantTile: {
    aspectRatio: 1,
    borderRadius: 18,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
  },
  invitePlusBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  inviteTileTitle: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  inviteTileSub: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 2,
    textAlign: 'center',
  },
  inCallDock: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderRadius: 24,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginTop: 16,
  },
  dockBtn: {
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
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  pickerModal: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  pickerTitle: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: Platform.select({ ios: 'System', android: 'sans-serif' }),
  },
  meetingOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  optionTitle: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: Platform.select({ ios: 'System', android: 'sans-serif' }),
  },
  optionSub: {
    fontSize: 11,
    marginTop: 2,
    fontFamily: Platform.select({ ios: 'System', android: 'sans-serif' }),
  },
  editTranscriptModalCard: {
    width: '100%',
    maxWidth: 460,
    borderRadius: 18,
    borderWidth: 1,
    padding: 20,
  },
  editTranscriptModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  editTranscriptModalTitle: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: Platform.select({ ios: 'System', android: 'sans-serif' }),
  },
  editTranscriptModalSub: {
    fontSize: 11,
    marginTop: 2,
    fontFamily: Platform.select({ ios: 'System', android: 'sans-serif' }),
  },
  editTranscriptInput: {
    minHeight: 140,
    maxHeight: 240,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
    fontFamily: Platform.select({ ios: 'System', android: 'sans-serif' }),
  },
  editTranscriptModalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  editModalSecondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  editModalSecondaryText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: Platform.select({ ios: 'System', android: 'sans-serif' }),
  },
  editModalPrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  editModalPrimaryText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: Platform.select({ ios: 'System', android: 'sans-serif' }),
  },
  activeRoomQuickBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 18,
    borderWidth: 1.5,
    marginBottom: 14,
    elevation: 3,
  },
  activeRoomLiveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 10,
  },
  activeRoomQuickTitle: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  activeRoomQuickSub: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  fullscreenRoomBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    marginLeft: 8,
  },
  fullscreenRoomBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  noRoomBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 14,
    gap: 10,
  },
  noRoomIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noRoomTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  noRoomSub: {
    fontSize: 11,
    fontWeight: '400',
    marginTop: 1,
  },
  quickLaunchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    gap: 2,
  },
  quickLaunchBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  quickJoinBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
  },
  quickJoinBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
