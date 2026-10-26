import React, { useEffect, useState, useRef } from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  ActivityIndicator,
  TextInput,
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
import { WaveformVisualizer } from '@/components/WaveformVisualizer';
import { AudioRecordButton } from '@/components/AudioRecordButton';
import { RecordingPlayer } from '@/components/RecordingPlayer';
import { Recording } from '@/types/meeting';
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
    settings,
    startRecordingSession,
    pauseRecordingSession,
    resumeRecordingSession,
    updateActiveElapsed,
    updateActiveMeter,
    stopAndSaveRecordingSession,
    discardRecordingSession,
  } = useMeetingStore();

  const [manualMeetingId, setManualMeetingId] = useState<string | undefined>(undefined);
  const selectedMeetingId = activeRecording.meetingId ?? manualMeetingId;

  const [meetingPickerOpen, setMeetingPickerOpen] = useState(false);
  const [savedRecording, setSavedRecording] = useState<Recording | null>(null);
  const [showSavedModal, setShowSavedModal] = useState(false);

  // Real-time transcription state
  const [liveTranscript, setLiveTranscript] = useState<string>('');
  const [isEditingTranscript, setIsEditingTranscript] = useState<boolean>(false);
  const [editingText, setEditingText] = useState<string>('');
  const transcriptScrollRef = useRef<ScrollView | null>(null);

  // MeetaNotes UI Kit Meeting Room state
  const [recordViewMode, setRecordViewMode] = useState<'room' | 'deck'>('room');
  const [isMicMuted, setIsMicMuted] = useState<boolean>(false);
  const [isCameraOff, setIsCameraOff] = useState<boolean>(false);

  // Real-time topic recall state
  const [topicMatches, setTopicMatches] = useState<TopicMatchResult[]>([]);

  // Index past recordings & meetings into RealtimeTopicRetrievalService
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

  // Local SLM synthesis state
  const [isProcessingSLM, setIsProcessingSLM] = useState<boolean>(false);
  const [slmStepLabel, setSlmStepLabel] = useState<string>('');
  const [slmPercent, setSlmPercent] = useState<number>(0);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Handle active recording timer
  useEffect(() => {
    if (activeRecording.isRecording && !activeRecording.isPaused) {
      timerRef.current = setInterval(() => {
        updateActiveElapsed(activeRecording.elapsedSeconds + 1);
        updateActiveMeter(0.3 + Math.random() * 0.5);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [
    activeRecording.isRecording,
    activeRecording.isPaused,
    activeRecording.elapsedSeconds,
    updateActiveElapsed,
    updateActiveMeter,
  ]);

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

  const formatEstimatedFileSize = (seconds: number): string => {
    const bytes = seconds * 32000;
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const handleStart = async () => {
    const chosenMeeting = meetings.find((m) => m.id === selectedMeetingId);
    const meetingTitle = chosenMeeting?.title || 'Quick Voice Note';

    setLiveTranscript('');
    setTopicMatches([]);
    realtimeTopicRetrievalService.clear();
    startRecordingSession(selectedMeetingId, meetingTitle);

    // Start real-time speech transcription
    realtimeTranscriptionService.start({
      meetingTitle,
      onTranscriptUpdate: (_chunk, full) => {
        setLiveTranscript(full);
        // Feed live speech to RealtimeTopicRetrievalService for instant topic matches
        realtimeTopicRetrievalService.feedRealtimeSpeech(full);
        // Auto scroll to bottom
        setTimeout(() => {
          transcriptScrollRef.current?.scrollToEnd({ animated: true });
        }, 80);
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
    pauseRecordingSession();
    realtimeTranscriptionService.pause();
    await audioRecorder.pauseRecording();
  };

  const handleResume = async () => {
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

  const handleStop = async () => {
    const audioUri = await audioRecorder.stopRecording();
    const finalTranscript = (realtimeTranscriptionService.stop() || liveTranscript).trim();
    realtimeTopicRetrievalService.clear();

    // Start SLM key points synthesis
    setIsProcessingSLM(true);
    setSlmPercent(10);
    setSlmStepLabel('Tokenizing transcript with local SLM...');

    try {
      const chosenMeeting = meetings.find((m) => m.id === selectedMeetingId);
      const meetingTitle = chosenMeeting?.title || activeRecording.meetingTitle || 'Quick Voice Note';

      const slmResult = await slmSummarizerService.generateKeyPointsWithSLM(
        finalTranscript,
        meetingTitle,
        (step, percent) => {
          setSlmStepLabel(step);
          setSlmPercent(percent);
        }
      );

      const newRec = stopAndSaveRecordingSession(audioUri, {
        transcript: finalTranscript,
        summary: slmResult.summary,
        notes: slmResult.notes,
        tags: slmResult.tags,
      });

      setSavedRecording(newRec);
      setIsProcessingSLM(false);
      setShowSavedModal(true);
    } catch (err) {
      console.warn('SLM generation exception, fallback to base save:', err);
      const newRec = stopAndSaveRecordingSession(audioUri, {
        transcript: finalTranscript,
      });
      setSavedRecording(newRec);
      setIsProcessingSLM(false);
      setShowSavedModal(true);
    }
  };

  const handleDiscard = async () => {
    await audioRecorder.cancelRecording();
    realtimeTranscriptionService.stop();
    realtimeTopicRetrievalService.clear();
    setTopicMatches([]);
    setLiveTranscript('');
    discardRecordingSession();
  };

  const selectedMeeting = meetings.find((m) => m.id === selectedMeetingId);
  const liveWordCount = liveTranscript.split(/\s+/).filter(Boolean).length;
  const isSpeechSupported = realtimeTranscriptionService.isSpeechSupported();
  const isPermissionDenied = realtimeTranscriptionService.isPermissionDenied();

  let placeholderText = 'Listening for speech in 16kHz PCM audio... Speak into your microphone.';
  if (isPermissionDenied) {
    placeholderText = 'Microphone permission needed. Realtime stream active. Tap "Edit / Dictate" to add notes.';
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.background, paddingTop: Math.max(insets.top, 16) }]}>
      {/* Top Bar with Mode Switcher */}
      <View style={styles.topHeader}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.screenTitle, { color: colors.text }]}>
            {recordViewMode === 'room' ? 'Live Meeting' : 'Record Audio'}
          </Text>
          <Text style={[styles.screenSub, { color: colors.textSecondary }]}>
            {recordViewMode === 'room' ? 'MeetaNotes In-Progress Session' : '16kHz PCM audio & on-device Whisper transcription'}
          </Text>
        </View>

        {/* View Mode Switcher Pills */}
        <View style={[styles.modeToggleGroup, { backgroundColor: colors.surfaceContainer, borderColor: colors.border }]}>
          <TouchableOpacity
            onPress={() => setRecordViewMode('room')}
            style={[
              styles.modeToggleBtn,
              recordViewMode === 'room' && { backgroundColor: colors.coral },
            ]}>
            <Ionicons
              name="videocam"
              size={13}
              color={recordViewMode === 'room' ? '#FFFFFF' : colors.textSecondary}
              style={{ marginRight: 4 }}
            />
            <Text
              style={[
                styles.modeToggleBtnText,
                { color: recordViewMode === 'room' ? '#FFFFFF' : colors.textSecondary },
              ]}>
              Room
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setRecordViewMode('deck')}
            style={[
              styles.modeToggleBtn,
              recordViewMode === 'deck' && { backgroundColor: colors.coral },
            ]}>
            <Ionicons
              name="pulse"
              size={13}
              color={recordViewMode === 'deck' ? '#FFFFFF' : colors.textSecondary}
              style={{ marginRight: 4 }}
            />
            <Text
              style={[
                styles.modeToggleBtnText,
                { color: recordViewMode === 'deck' ? '#FFFFFF' : colors.textSecondary },
              ]}>
              Deck
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Target Meeting Selector Anchor */}
        <View style={styles.selectorWrapper}>
          <Text style={[styles.selectorLabel, { color: colors.textSecondary }]}>TARGET MEETING</Text>
          <TouchableOpacity
            disabled={activeRecording.isRecording}
            onPress={() => setMeetingPickerOpen(true)}
            style={[
              styles.meetingSelectorBtn,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                opacity: activeRecording.isRecording ? 0.8 : 1,
              },
            ]}>
            <Ionicons
              name={selectedMeeting ? 'videocam' : 'mic-circle'}
              size={18}
              color={selectedMeeting ? colors.primary : colors.textSecondary}
            />
            <Text
              numberOfLines={1}
              style={[
                styles.meetingSelectorText,
                { color: selectedMeeting ? colors.text : colors.textSecondary },
              ]}>
              {selectedMeeting ? selectedMeeting.title : 'Quick Voice Note (Tap to link a meeting)'}
            </Text>
            {!activeRecording.isRecording && (
              <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
            )}
          </TouchableOpacity>
        </View>

        {/* 1. ROOM VIEW: 2x2 Participant Video Grid + Floating Speech Pill + Dock */}
        {recordViewMode === 'room' ? (
          <View style={styles.roomViewContainer}>
            {/* Top Floating Speech Banner Pill (Matching UI Kit Image 1) */}
            <View style={[styles.floatingSpeechPill, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={[styles.speechIconCircle, { backgroundColor: colors.coralLight }]}>
                <Ionicons name="chatbubble-ellipses" size={14} color={colors.coral} />
              </View>
              <Text style={[styles.floatingSpeechText, { color: colors.text }]} numberOfLines={1}>
                {liveTranscript.length > 0 ? liveTranscript : "Listening for speech to transcribe..."}
              </Text>
              <TouchableOpacity
                onPress={() => setIsEditingTranscript(true)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="expand-outline" size={15} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* 2x2 Video Participant Grid (Matching UI Kit Image 1) */}
            <View style={styles.participantGrid}>
              {/* Participant 1: Sherinz Joel */}
              <View style={[styles.participantTile, { backgroundColor: '#3A4832' }]}>
                <View style={styles.participantAvatarBig}>
                  <Text style={styles.participantAvatarInitials}>SJ</Text>
                </View>
                <View style={styles.participantMicBadge}>
                  <Ionicons name="mic" size={12} color="#111827" />
                </View>
                <View style={styles.participantNameBadge}>
                  <Text style={styles.participantNameText}>Sherinz Joel</Text>
                </View>
              </View>

              {/* Participant 2: Jasmine Wild */}
              <View style={[styles.participantTile, { backgroundColor: '#80503D' }]}>
                <View style={styles.participantAvatarBig}>
                  <Text style={styles.participantAvatarInitials}>JW</Text>
                </View>
                <View style={styles.participantMicBadge}>
                  <Ionicons name="mic" size={12} color="#111827" />
                </View>
                <View style={styles.participantNameBadge}>
                  <Text style={styles.participantNameText}>Jasmine Wild</Text>
                </View>
              </View>

              {/* Participant 3: Daniel Ross */}
              <View style={[styles.participantTile, { backgroundColor: '#8C6C26' }]}>
                <View style={styles.participantAvatarBig}>
                  <Text style={styles.participantAvatarInitials}>DR</Text>
                </View>
                <View style={styles.participantMicBadge}>
                  <Ionicons name="mic-off" size={12} color="#EF4444" />
                </View>
                <View style={styles.participantNameBadge}>
                  <Text style={styles.participantNameText}>Daniel Ross</Text>
                </View>
              </View>

              {/* Participant 4: You (Host) */}
              <View style={[styles.participantTile, { backgroundColor: isCameraOff ? '#1A1C22' : '#2D4468' }]}>
                <View style={styles.participantAvatarBig}>
                  <Text style={styles.participantAvatarInitials}>
                    {isCameraOff ? 'OFF' : 'YOU'}
                  </Text>
                </View>
                <View style={styles.participantMicBadge}>
                  <Ionicons
                    name={isMicMuted ? "mic-off" : "mic"}
                    size={12}
                    color={isMicMuted ? "#EF4444" : "#111827"}
                  />
                </View>
                <View style={styles.participantNameBadge}>
                  <Text style={styles.participantNameText}>You (Host)</Text>
                </View>
              </View>
            </View>

            {/* In-Call Floating Control Dock (UI Kit Image 1) */}
            <View style={[styles.inCallDock, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <TouchableOpacity
                onPress={() => setIsMicMuted(!isMicMuted)}
                style={[styles.dockBtn, isMicMuted && { backgroundColor: '#FEE2E2' }]}>
                <Ionicons
                  name={isMicMuted ? "mic-off" : "mic"}
                  size={20}
                  color={isMicMuted ? "#EF4444" : colors.text}
                />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setIsCameraOff(!isCameraOff)}
                style={[styles.dockBtn, isCameraOff && { backgroundColor: '#FEE2E2' }]}>
                <Ionicons
                  name={isCameraOff ? "videocam-off" : "videocam"}
                  size={20}
                  color={isCameraOff ? "#EF4444" : colors.text}
                />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  const samples = [
                    'We reviewed the database migration and API gateway response latencies.',
                    'Hannah noted that project timelines are locked for next Friday.',
                  ];
                  const randomSample = samples[Math.floor(Math.random() * samples.length)];
                  realtimeTranscriptionService.appendSegment(randomSample);
                  setLiveTranscript((prev) => (prev ? `${prev} ${randomSample}` : randomSample));
                }}
                style={styles.dockBtn}>
                <Ionicons name="chatbubble-ellipses-outline" size={20} color={colors.text} />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setRecordViewMode('deck')}
                style={styles.dockBtn}>
                <Ionicons name="ellipsis-horizontal" size={20} color={colors.text} />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={activeRecording.isRecording ? handleStop : handleStart}
                style={[
                  styles.endCallBtn,
                  { backgroundColor: activeRecording.isRecording ? '#E53935' : colors.primary },
                ]}>
                <Ionicons
                  name={activeRecording.isRecording ? "call" : "radio"}
                  size={20}
                  color="#FFFFFF"
                />
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          /* 2. AUDIO DECK & WAVEFORM VIEW */
          <View
            style={[
              styles.recordingCard,
              {
                backgroundColor: colors.surface,
                borderColor: activeRecording.isRecording
                  ? activeRecording.isPaused
                    ? colors.warning
                    : colors.coral
                  : colors.border,
              },
            ]}>
          {/* Active Status Badge */}
          <View style={styles.statusFlagRow}>
            <View
              style={[
                styles.recordingDot,
                {
                  backgroundColor: activeRecording.isRecording
                    ? activeRecording.isPaused
                      ? '#F59E0B'
                      : '#EF4444'
                    : '#10B981',
                },
              ]}
            />
            <Text
              style={[
                styles.statusFlagText,
                {
                  color: activeRecording.isRecording
                    ? activeRecording.isPaused
                      ? '#F59E0B'
                      : '#EF4444'
                    : colors.textSecondary,
                },
              ]}>
              {activeRecording.isRecording
                ? activeRecording.isPaused
                  ? 'PAUSED'
                  : 'RECORDING AUDIO'
                : 'READY TO RECORD'}
            </Text>
          </View>

          {/* Large Clean Minimal Timer */}
          <Text style={[styles.timerDisplay, { color: colors.text }]}>
            {formatTimer(activeRecording.elapsedSeconds)}
          </Text>

          {/* Metric Details */}
          <View style={styles.metricRow}>
            <View style={styles.metricItem}>
              <Text style={[styles.metricLabel, { color: colors.textMuted }]}>FILE SIZE</Text>
              <Text style={[styles.metricValue, { color: colors.textSecondary }]}>
                {formatEstimatedFileSize(activeRecording.elapsedSeconds)}
              </Text>
            </View>
            <View style={[styles.metricDivider, { backgroundColor: colors.cardBorder }]} />
            <View style={styles.metricItem}>
              <Text style={[styles.metricLabel, { color: colors.textMuted }]}>FORMAT</Text>
              <Text style={[styles.metricValue, { color: colors.textSecondary }]}>16kHz Mono WAV</Text>
            </View>
            <View style={[styles.metricDivider, { backgroundColor: colors.cardBorder }]} />
            <View style={styles.metricItem}>
              <Text style={[styles.metricLabel, { color: colors.textMuted }]}>SLM SYNTHESIS</Text>
              <Text style={[styles.metricValue, { color: colors.accent }]}>Local Ready</Text>
            </View>
          </View>

          {/* Dynamic Sound Waveform Visualizer */}
          <View style={styles.waveformContainer}>
            <WaveformVisualizer
              isRecording={activeRecording.isRecording}
              isPaused={activeRecording.isPaused}
              meterLevel={activeRecording.meterLevel}
            />
          </View>

          {/* Real-time Past Topics Recall Panel */}
          {(activeRecording.isRecording || liveTranscript.length > 0) && (
            <LiveTopicRecallPanel
              topicMatches={topicMatches}
              isRecording={activeRecording.isRecording && !activeRecording.isPaused}
              onInsertContextSnippet={handleInsertContextSnippet}
            />
          )}

          {/* Real-time Live Transcription Panel */}
          {(activeRecording.isRecording || liveTranscript.length > 0) && (
            <View style={[styles.liveTranscriptBox, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
              <View style={styles.liveTranscriptHeader}>
                <View style={styles.liveBadgeRow}>
                  <View
                    style={[
                      styles.livePulsingDot,
                      {
                        backgroundColor:
                          activeRecording.isRecording && !activeRecording.isPaused
                            ? '#10B981'
                            : '#F59E0B',
                      },
                    ]}
                  />
                  <Text
                    style={[
                      styles.liveBadgeText,
                      {
                        color:
                          activeRecording.isRecording && !activeRecording.isPaused
                            ? '#10B981'
                            : '#F59E0B',
                      },
                    ]}>
                    {activeRecording.isRecording && !activeRecording.isPaused
                      ? isSpeechSupported
                        ? 'LIVE MIC STT'
                        : 'REAL-TIME TRANSCRIBING'
                      : 'TRANSCRIPTION PAUSED'}
                  </Text>
                </View>

                <View style={styles.liveHeaderRight}>
                  {activeRecording.isRecording && !activeRecording.isPaused && (
                    <TouchableOpacity
                      onPress={() => {
                        const samples = [
                          'We discussed the Google OAuth proxy and calendar synchronization for physical mobile devices.',
                          'Alex evaluated the Whisper tiny quantization benchmark and 16kHz mono audio memory buffers.',
                          'We reviewed the dedicated Notes tab design with real-time keyword search and action item checklists.',
                        ];
                        const randomSample = samples[Math.floor(Math.random() * samples.length)];
                        realtimeTranscriptionService.appendSegment(randomSample);
                        setLiveTranscript((prev) => {
                          const updated = prev ? `${prev} ${randomSample}` : randomSample;
                          realtimeTopicRetrievalService.feedRealtimeSpeech(updated);
                          return updated;
                        });
                      }}
                      style={[styles.editTranscriptBtn, { backgroundColor: colors.card, borderColor: colors.cardBorder, marginRight: 6 }]}
                      accessibilityLabel="Insert sample speech">
                      <Ionicons name="sparkles" size={11} color={colors.primary} />
                      <Text style={[styles.editTranscriptBtnText, { color: colors.primary }]}>Test Topic Speech</Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    onPress={() => {
                      setEditingText(liveTranscript);
                      setIsEditingTranscript(true);
                    }}
                    style={[styles.editTranscriptBtn, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
                    accessibilityLabel="Edit or Dictate Transcript">
                    <Ionicons name="create-outline" size={11} color={colors.accent} />
                    <Text style={[styles.editTranscriptBtnText, { color: colors.accent }]}>Edit / Dictate</Text>
                  </TouchableOpacity>

                  <Text style={[styles.liveWordCountText, { color: colors.textMuted }]}>
                    {liveWordCount} words
                  </Text>
                </View>
              </View>

              <ScrollView
                ref={transcriptScrollRef}
                style={styles.liveTranscriptScroll}
                contentContainerStyle={{ paddingVertical: 4 }}
                nestedScrollEnabled={true}
                showsVerticalScrollIndicator={false}>
                {liveTranscript.length > 0 ? (
                  <Text style={[styles.liveTranscriptText, { color: colors.text }]}>
                    {liveTranscript}
                    {activeRecording.isRecording && !activeRecording.isPaused && (
                      <Text style={[styles.liveBlinkingCursor, { color: colors.accent }]}> ▍</Text>
                    )}
                  </Text>
                ) : (
                  <Text style={[styles.liveTranscriptPlaceholder, { color: colors.textMuted }]}>
                    {placeholderText}
                    {activeRecording.isRecording && !activeRecording.isPaused && (
                      <Text style={[styles.liveBlinkingCursor, { color: colors.accent }]}> ▍</Text>
                    )}
                  </Text>
                )}
              </ScrollView>
            </View>
          )}

          {/* Control Deck Button */}
          <View style={styles.buttonContainer}>
            <AudioRecordButton
              isRecording={activeRecording.isRecording}
              isPaused={activeRecording.isPaused}
              onPressRecord={handleStart}
              onPressPause={activeRecording.isPaused ? handleResume : handlePause}
              onPressStop={handleStop}
              size={76}
            />
          </View>

          {/* Model Status Indicator */}
          {!activeRecording.isRecording && (
            <TouchableOpacity
              onPress={() => router.push('/settings')}
              style={[styles.modelStatusBadge, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
              <Ionicons
                name={settings.whisperModelDownloaded ? 'hardware-chip' : 'cloud-download-outline'}
                size={13}
                color={settings.whisperModelDownloaded ? colors.accent : colors.warning}
              />
              <Text style={[styles.modelStatusText, { color: colors.textSecondary }]}>
                Whisper {settings.whisperModel.replace('.en.bin', '').replace('ggml-', '')} + {settings.activeSlmModel ? settings.activeSlmModel.replace('.gguf', '').replace('-it', '').toUpperCase() : 'GEMMA'} SLM
              </Text>
              <Ionicons name="chevron-forward" size={11} color={colors.textMuted} />
            </TouchableOpacity>
          )}

          {/* Discard Session Action */}
          {activeRecording.isRecording && (
            <TouchableOpacity onPress={handleDiscard} style={styles.discardBtn}>
              <Text style={styles.discardBtnText}>Discard Recording</Text>
            </TouchableOpacity>
          )}
        </View>
        )}
      </ScrollView>

      {/* Meeting Picker Modal */}
      <Modal
        visible={meetingPickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setMeetingPickerOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.pickerModal, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
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
                    backgroundColor: !selectedMeetingId ? colors.surface : 'transparent',
                    borderColor: !selectedMeetingId ? colors.accent : colors.cardBorder,
                  },
                ]}>
                <Ionicons name="mic-circle" size={20} color={colors.tint} style={{ marginRight: 10 }} />
                <View>
                  <Text style={[styles.optionTitle, { color: colors.text }]}>Quick Voice Memo</Text>
                  <Text style={[styles.optionSub, { color: colors.textSecondary }]}>
                    Ad-hoc recording with real-time transcription
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
                        backgroundColor: isChosen ? colors.surface : 'transparent',
                        borderColor: isChosen ? colors.accent : colors.cardBorder,
                      },
                    ]}>
                    <Ionicons name="calendar" size={18} color={colors.tint} style={{ marginRight: 10 }} />
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

      {/* On-Device Local SLM Synthesis Processing Modal */}
      <Modal visible={isProcessingSLM} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.slmCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={[styles.slmIconRing, { backgroundColor: colors.surface }]}>
              <Ionicons name="sparkles" size={28} color={colors.accent} />
            </View>

            <Text style={[styles.slmTitle, { color: colors.text }]}>Synthesizing Key Points</Text>
            <Text style={[styles.slmSub, { color: colors.textSecondary }]}>
              Running Local SLM (SmolLM2-360M) on-device
            </Text>

            {/* Progress bar */}
            <View style={[styles.slmProgressBg, { backgroundColor: colors.cardBorder }]}>
              <View style={[styles.slmProgressFill, { width: `${slmPercent}%`, backgroundColor: colors.accent }]} />
            </View>

            <View style={styles.slmStatusRow}>
              <ActivityIndicator size="small" color={colors.accent} style={{ marginRight: 8 }} />
              <Text style={[styles.slmStatusText, { color: colors.text }]}>
                {slmStepLabel || 'Processing tokens...'}
              </Text>
            </View>

            <View style={[styles.slmEngineBadge, { backgroundColor: colors.surface }]}>
              <Ionicons name="shield-checkmark" size={12} color="#10B981" />
              <Text style={[styles.slmEngineText, { color: colors.textSecondary }]}>
                100% Private · Zero Cloud Transmission
              </Text>
            </View>
          </View>
        </View>
      </Modal>

      {/* Real-time Transcript Dictation / Manual Edit Modal */}
      <Modal
        visible={isEditingTranscript}
        transparent
        animationType="fade"
        onRequestClose={() => setIsEditingTranscript(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.editTranscriptModalCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={styles.editTranscriptModalHeader}>
              <View>
                <Text style={[styles.editTranscriptModalTitle, { color: colors.text }]}>
                  Edit / Dictate Transcript
                </Text>
                <Text style={[styles.editTranscriptModalSub, { color: colors.textSecondary }]}>
                  Speak using your keyboard mic or type notes directly
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
                  backgroundColor: colors.surface,
                  color: colors.text,
                  borderColor: colors.cardBorder,
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
                style={[styles.editModalSecondaryBtn, { borderColor: colors.cardBorder }]}>
                <Ionicons name="trash-outline" size={13} color={colors.textSecondary} style={{ marginRight: 4 }} />
                <Text style={[styles.editModalSecondaryText, { color: colors.textSecondary }]}>Clear</Text>
              </TouchableOpacity>

              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity
                  onPress={() => setIsEditingTranscript(false)}
                  style={[styles.editModalSecondaryBtn, { borderColor: colors.cardBorder }]}>
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
                  style={[styles.editModalPrimaryBtn, { backgroundColor: colors.primary }]}>
                  <Ionicons name="checkmark" size={14} color={colors.primaryText} style={{ marginRight: 4 }} />
                  <Text style={[styles.editModalPrimaryText, { color: colors.primaryText }]}>Apply</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Post-Recording Success Modal with Synthesized Key Points */}
      <Modal
        visible={showSavedModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSavedModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.savedCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={styles.savedIconCircle}>
              <Ionicons name="checkmark-circle" size={44} color="#10B981" />
            </View>

            <Text style={[styles.savedTitle, { color: colors.text }]}>Meeting Synthesized</Text>
            <Text style={[styles.savedSub, { color: colors.textSecondary }]}>
              {savedRecording?.meetingTitle}
            </Text>

            <ScrollView style={{ maxHeight: 340, width: '100%', marginBottom: 16 }} showsVerticalScrollIndicator={false}>
              {/* Executive Summary Preview */}
              {savedRecording?.summary?.executiveSummary && (
                <View style={[styles.savedSummaryBox, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
                  <View style={styles.savedSectionHeader}>
                    <Ionicons name="sparkles" size={13} color={colors.accent} />
                    <Text style={[styles.savedSectionTitle, { color: colors.accent }]}>
                      Executive Summary
                    </Text>
                  </View>
                  <Text style={[styles.savedSummaryText, { color: colors.text }]}>
                    {savedRecording.summary.executiveSummary}
                  </Text>
                </View>
              )}

              {/* Key Decisions Preview */}
              {savedRecording?.summary?.keyDecisions && savedRecording.summary.keyDecisions.length > 0 && (
                <View style={[styles.savedSectionBlock, { borderColor: colors.cardBorder }]}>
                  <Text style={[styles.savedSectionTitleText, { color: colors.textSecondary }]}>
                    KEY DECISIONS ({savedRecording.summary.keyDecisions.length})
                  </Text>
                  {savedRecording.summary.keyDecisions.map((dec, i) => (
                    <View key={i} style={styles.savedDecisionRow}>
                      <Ionicons name="checkmark-circle" size={13} color={colors.accent} style={{ marginTop: 2 }} />
                      <Text style={[styles.savedDecisionText, { color: colors.text }]}>{dec}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Action Items Preview */}
              {savedRecording?.summary?.actionItems && savedRecording.summary.actionItems.length > 0 && (
                <View style={[styles.savedSectionBlock, { borderColor: colors.cardBorder }]}>
                  <Text style={[styles.savedSectionTitleText, { color: colors.textSecondary }]}>
                    ACTION ITEMS ({savedRecording.summary.actionItems.length})
                  </Text>
                  {savedRecording.summary.actionItems.map((act) => (
                    <View key={act.id} style={styles.savedActionRow}>
                      <Ionicons name="checkbox-outline" size={14} color={colors.accent} style={{ marginTop: 2 }} />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.savedActionTask, { color: colors.text }]}>{act.task}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                          {act.assignee && (
                            <Text style={[styles.savedActionAssignee, { color: colors.textMuted }]}>
                              👤 {act.assignee}
                            </Text>
                          )}
                          {act.priority && (
                            <Text style={{ fontSize: 10, fontWeight: '700', color: act.priority === 'high' ? '#EF4444' : '#6B7280' }}>
                              [{act.priority.toUpperCase()}]
                            </Text>
                          )}
                          {act.category && (
                            <Text style={{ fontSize: 10, color: colors.textMuted }}>
                              • {act.category}
                            </Text>
                          )}
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {/* Audio Playback preview */}
              {savedRecording?.uri && (
                <View style={{ marginTop: 8 }}>
                  <RecordingPlayer
                    uri={savedRecording.uri}
                    durationSeconds={savedRecording.durationSeconds}
                  />
                </View>
              )}
            </ScrollView>

            {/* Modal Actions */}
            <View style={styles.savedActions}>
              <TouchableOpacity
                onPress={() => {
                  setShowSavedModal(false);
                  router.push('/(tabs)');
                }}
                style={[styles.modalActionSecondary, { borderColor: colors.cardBorder }]}>
                <Text style={[styles.modalActionSecondaryText, { color: colors.textSecondary }]}>Dashboard</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  setShowSavedModal(false);
                  if (savedRecording) {
                    router.push({ pathname: '/notes/[id]', params: { id: savedRecording.id } });
                  } else {
                    router.push('/(tabs)/notes');
                  }
                }}
                style={[styles.modalActionPrimary, { backgroundColor: colors.primary }]}>
                <Ionicons name="document-text-outline" size={14} color={colors.primaryText} style={{ marginRight: 6 }} />
                <Text style={[styles.modalActionPrimaryText, { color: colors.primaryText }]}>Open Note</Text>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 10,
    backgroundColor: 'transparent',
  },
  modeToggleGroup: {
    flexDirection: 'row',
    borderRadius: 20,
    borderWidth: 1,
    padding: 3,
    gap: 4,
  },
  modeToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  modeToggleBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  roomViewContainer: {
    width: '100%',
    maxWidth: 420,
    gap: 16,
    backgroundColor: 'transparent',
  },
  floatingSpeechPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1,
    gap: 10,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
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
    fontWeight: '600',
    lineHeight: 16,
  },
  participantGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
    backgroundColor: 'transparent',
  },
  participantTile: {
    width: '48%',
    aspectRatio: 1.1,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  participantAvatarBig: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  participantAvatarInitials: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  participantMicBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
  },
  participantNameBadge: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  participantNameText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  inCallDock: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderRadius: 32,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    marginTop: 6,
  },
  dockBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  endCallBtn: {
    width: 52,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
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
    padding: 16,
    alignItems: 'center',
    gap: 16,
  },
  selectorWrapper: {
    width: '100%',
    maxWidth: 420,
  },
  selectorLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  meetingSelectorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    gap: 10,
  },
  meetingSelectorText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
  },
  recordingCard: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 28,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  statusFlagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusFlagText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  timerDisplay: {
    fontSize: 52,
    fontWeight: '800',
    letterSpacing: -1.5,
    fontVariant: ['tabular-nums'],
    marginBottom: 10,
  },
  metricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 16,
  },
  metricItem: {
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  metricValue: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  metricDivider: {
    width: 1,
    height: 20,
  },
  waveformContainer: {
    width: '100%',
    marginBottom: 16,
  },
  liveTranscriptBox: {
    width: '100%',
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 16,
  },
  liveTranscriptHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  liveBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  livePulsingDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  liveBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  liveHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  whisperEnginePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 3,
  },
  whisperEnginePillText: {
    fontSize: 9,
    fontWeight: '600',
  },
  liveWordCountText: {
    fontSize: 10,
  },
  liveTranscriptScroll: {
    maxHeight: 110,
  },
  liveTranscriptText: {
    fontSize: 13,
    lineHeight: 19,
  },
  liveBlinkingCursor: {
    fontWeight: '800',
  },
  buttonContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
  },
  modelStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 14,
    gap: 6,
  },
  modelStatusText: {
    fontSize: 11,
    fontWeight: '500',
  },
  discardBtn: {
    marginTop: 12,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  discardBtnText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  pickerModal: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 18,
    borderWidth: 1,
    padding: 20,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  pickerTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  meetingOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
  },
  optionTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  optionSub: {
    fontSize: 11,
    marginTop: 2,
  },
  slmCard: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
  },
  slmIconRing: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  slmTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  slmSub: {
    fontSize: 12,
    marginBottom: 16,
    textAlign: 'center',
  },
  slmProgressBg: {
    width: '100%',
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 14,
  },
  slmProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
  slmStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  slmStatusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  slmEngineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 5,
  },
  slmEngineText: {
    fontSize: 10,
    fontWeight: '600',
  },
  savedCard: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    alignItems: 'center',
  },
  savedIconCircle: {
    marginBottom: 8,
  },
  savedTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 2,
  },
  savedSub: {
    fontSize: 12,
    marginBottom: 14,
    textAlign: 'center',
  },
  savedSummaryBox: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 10,
  },
  savedSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 4,
  },
  savedSectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  savedSummaryText: {
    fontSize: 12,
    lineHeight: 18,
  },
  savedSectionBlock: {
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 6,
  },
  savedSectionTitleText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  savedDecisionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  savedDecisionText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
  },
  savedActionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  savedActionTask: {
    fontSize: 12,
    lineHeight: 17,
  },
  savedActionAssignee: {
    fontSize: 10,
    marginTop: 1,
  },
  savedActions: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  modalActionSecondary: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  modalActionSecondaryText: {
    fontSize: 13,
    fontWeight: '600',
  },
  modalActionPrimary: {
    flex: 1.5,
    flexDirection: 'row',
    paddingVertical: 11,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalActionPrimaryText: {
    fontSize: 13,
    fontWeight: '600',
  },
  editTranscriptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    gap: 4,
  },
  editTranscriptBtnText: {
    fontSize: 10,
    fontWeight: '600',
  },
  liveTranscriptPlaceholder: {
    fontSize: 13,
    lineHeight: 19,
    fontStyle: 'italic',
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
  },
  editTranscriptModalSub: {
    fontSize: 11,
    marginTop: 2,
  },
  editTranscriptInput: {
    minHeight: 140,
    maxHeight: 240,
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
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
    borderRadius: 8,
    borderWidth: 1,
  },
  editModalSecondaryText: {
    fontSize: 12,
    fontWeight: '600',
  },
  editModalPrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  editModalPrimaryText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
