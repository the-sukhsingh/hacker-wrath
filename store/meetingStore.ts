import { create } from 'zustand';
import {
  Meeting,
  Recording,
  ConnectedAccount,
  UserSettings,
  AccountProvider,
  MeetingSummary,
} from '@/types/meeting';
import { DownloadedModelRecord } from '@/types/model';

const INITIAL_ACCOUNTS: ConnectedAccount[] = [
  {
    id: 'acc-google',
    provider: 'google',
    name: 'Google Workspace',
    email: '',
    isConnected: false,
    lastSyncedAt: null,
    syncCount: 0,
  },
  {
    id: 'acc-outlook',
    provider: 'outlook',
    name: 'Microsoft 365 Outlook',
    email: '',
    isConnected: false,
    lastSyncedAt: null,
    syncCount: 0,
  },
  {
    id: 'acc-apple',
    provider: 'apple',
    name: 'Apple iCloud Calendar',
    email: '',
    isConnected: false,
    lastSyncedAt: null,
    syncCount: 0,
  },
];

// Start with empty clean state without dummy meetings
const INITIAL_MEETINGS: Meeting[] = [];

const INITIAL_RECORDINGS: Recording[] = [
  {
    id: 'rec-sample-1',
    meetingId: undefined,
    meetingTitle: 'Q4 AI Architecture & Whisper Engine Strategy',
    uri: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
    durationSeconds: 1680,
    fileSizeBytes: 53760000,
    createdAt: new Date(Date.now() - 3600000 * 4).toISOString(), // 4 hours ago
    audioFormat: 'wav_16khz_mono',
    status: 'completed',
    transcript: 'We began the session by reviewing our speech-to-text benchmark metrics. On-device inference with Whisper tiny gives us sub-second latency while guaranteeing absolute privacy because no audio packets ever touch the public internet. Alex noted that 16kHz mono sampling delivers optimal word-error-rate across both conference room speakerphones and Bluetooth headsets. Next steps are to finalize the quantization pipeline and implement automated background note synthesis.',
    summary: {
      executiveSummary: 'Reviewed on-device Whisper model performance, verified zero data-leak guarantees for privacy-conscious enterprise users, and confirmed 16kHz mono audio standard across iOS and Android builds.',
      keyDecisions: [
        'Selected Whisper tiny as default model for on-device real-time transcription.',
        'Enforced strict local device cache for meeting notes and transcripts.',
        'Scheduled cross-platform testing across iOS and Android native audio drivers.',
      ],
      actionItems: [
        { id: 'act-1-1', task: 'Run Whisper benchmark on physical devices', assignee: 'Alex Chen', done: true },
        { id: 'act-1-2', task: 'Optimize mono WAV buffer allocation for low memory devices', assignee: 'Sarah Connor', done: false },
        { id: 'act-1-3', task: 'Set up note export pipeline for markdown and JSON formats', assignee: 'Sukhjeet', done: false },
      ],
    },
    notes: '### Key Discussion Points\n- Evaluated transcription latency between Tiny (39M parameters) and Base (74M parameters).\n- Confirmed that local processing eliminates recurring third-party API costs.\n- Recommended automated keyword extraction for instant search indexing.',
    tags: ['Architecture', 'Whisper', 'On-Device'],
  },
  {
    id: 'rec-sample-2',
    meetingId: undefined,
    meetingTitle: 'Product Design & Mobile Audio Waveform Review',
    uri: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
    durationSeconds: 940,
    fileSizeBytes: 30080000,
    createdAt: new Date(Date.now() - 86400000).toISOString(), // Yesterday
    audioFormat: 'wav_16khz_mono',
    status: 'completed',
    transcript: 'The team reviewed the new floating recording visualizer and calendar schedule grid. User testing indicated that having an explicit Notes tab with instant keyword search is critical for users who record multiple meetings per day. We agreed to implement a clean card layout with expandable summaries and interactive action-item checklists.',
    summary: {
      executiveSummary: 'Design critique of recording deck and meeting dashboard. Approved dedicated Notes tab with real-time search, interactive action items, and embedded audio player.',
      keyDecisions: [
        'Add dedicated Notes tab in bottom navigation for immediate access to past recordings.',
        'Include interactive checklists so users can tick off action items directly from notes.',
        'Support markdown formatting and summary copying.',
      ],
      actionItems: [
        { id: 'act-2-1', task: 'Design clean search bar with real-time filter chips', assignee: 'Design Team', done: true },
        { id: 'act-2-2', task: 'Add quick copy button for executive summaries', assignee: 'Frontend', done: true },
        { id: 'act-2-3', task: 'Implement full-text search across transcript and key decisions', assignee: 'Sukhjeet', done: true },
      ],
    },
    notes: '### Feedback Summary\n- Users love the one-tap recording button from any screen.\n- Highlight search matches so users can find decisions in seconds.\n- Provide clean empty states with direct call-to-action.',
    tags: ['Design', 'UI/UX', 'Notes'],
  },
  {
    id: 'rec-sample-3',
    meetingId: undefined,
    meetingTitle: 'Sprint 14 Retrospective & Cloud Calendar Sync',
    uri: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
    durationSeconds: 1420,
    fileSizeBytes: 45440000,
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(), // 3 days ago
    audioFormat: 'wav_16khz_mono',
    status: 'completed',
    transcript: 'Sprint 14 concluded with all primary calendar sync objectives met. Google OAuth 2.0 now functions smoothly across desktop web and mobile apps via Expo AuthSession proxy. Calendar events sync cleanly onto the day grid, and meetings can be linked to audio recordings with one click.',
    summary: {
      executiveSummary: 'Sprint retro covering OAuth 2.0 resolution, Google Calendar REST API integration, and meeting-to-recording association. Team velocity increased by 20%.',
      keyDecisions: [
        'Adopted direct token flow (implicit grant) to bypass client secret mismatches.',
        'Established unified Expo proxy redirect handling for physical mobile devices.',
        'Prioritized note search and playback as top user requested features.',
      ],
      actionItems: [
        { id: 'act-3-1', task: 'Verify Google Calendar sync on Android and iOS', assignee: 'QA Team', done: true },
        { id: 'act-3-2', task: 'Prepare release notes for Sprint 14 demo', assignee: 'Product', done: true },
        { id: 'act-3-3', task: 'Deploy updated build to internal testing track', assignee: 'DevOps', done: false },
      ],
    },
    notes: '### Retrospective Highlights\n- **What went well:** OAuth flow on web and mobile is seamless.\n- **What could improve:** Needed dedicated tab for browsing previous meeting notes.\n- **Action:** Deliver clean Notes tab with search in current milestone.',
    tags: ['Sprint', 'Retro', 'Google'],
  },
];

const INITIAL_DOWNLOADED_MODELS: Record<string, DownloadedModelRecord> = {
  'ggml-tiny.en.bin': {
    modelId: 'ggml-tiny.en.bin',
    modelType: 'whisper_stt',
    fileName: 'ggml-tiny.en.bin',
    localUri: 'file:///models/ggml-tiny.en.bin',
    fileSizeBytes: 77704715,
    downloadedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    status: 'ready',
    progressPercent: 100,
    downloadedBytes: 77704715,
    totalBytes: 77704715,
  },
  'gemma-2-2b-it.gguf': {
    modelId: 'gemma-2-2b-it.gguf',
    modelType: 'slm_reasoning',
    fileName: 'gemma-2-2b-it-Q4_K_M.gguf',
    localUri: 'file:///models/gemma-2-2b-it-Q4_K_M.gguf',
    fileSizeBytes: 1713000000,
    downloadedAt: new Date().toISOString(),
    status: 'ready',
    progressPercent: 100,
    downloadedBytes: 1713000000,
    totalBytes: 1713000000,
  },
};

const INITIAL_SETTINGS: UserSettings = {
  userName: 'User',
  userEmail: 'user@example.com',
  engineMode: 'local',
  whisperModel: 'ggml-tiny.en.bin',
  whisperModelDownloaded: true,
  activeSlmModel: 'gemma-2-2b-it.gguf',
  slmModelDownloaded: true,
  autoTranscribe: true,
  audioQuality: 'high',
};

interface ActiveRecordingState {
  isRecording: boolean;
  isPaused: boolean;
  elapsedSeconds: number;
  meetingId?: string;
  meetingTitle: string;
  audioUri: string | null;
  meterLevel: number; // 0 to 1 for visualizer
}

interface MeetingStoreState {
  meetings: Meeting[];
  recordings: Recording[];
  connectedAccounts: ConnectedAccount[];
  settings: UserSettings;
  activeRecording: ActiveRecordingState;

  // Model management state
  downloadedModels: Record<string, DownloadedModelRecord>;
  downloadProgress: Record<string, number>;
  activeDownloadingModelId: string | null;

  // Model actions
  setDownloadedModelRecord: (record: DownloadedModelRecord) => void;
  removeDownloadedModelRecord: (modelId: string) => void;
  setModelDownloadProgress: (modelId: string, percent: number) => void;
  setActiveDownloadingModelId: (modelId: string | null) => void;

  // Meeting actions
  addMeeting: (meeting: Omit<Meeting, 'id' | 'createdAt' | 'recordingIds' | 'status'>) => Meeting;
  updateMeeting: (id: string, updates: Partial<Meeting>) => void;
  deleteMeeting: (id: string) => void;
  getMeetingById: (id: string) => Meeting | undefined;

  // Account integration actions (dummy/simulated)
  connectAccount: (provider: AccountProvider, email: string, name?: string) => void;
  disconnectAccount: (provider: AccountProvider) => void;
  syncAccount: (provider: AccountProvider) => void;

  // Recording actions
  startRecordingSession: (meetingId?: string, meetingTitle?: string) => void;
  pauseRecordingSession: () => void;
  resumeRecordingSession: () => void;
  updateActiveElapsed: (seconds: number) => void;
  updateActiveMeter: (level: number) => void;
  stopAndSaveRecordingSession: (
    audioUri: string,
    options?: {
      transcript?: string;
      summary?: MeetingSummary;
      notes?: string;
      tags?: string[];
    }
  ) => Recording;
  discardRecordingSession: () => void;
  updateRecordingNote: (recordingId: string, notes: string) => void;
  toggleActionItem: (recordingId: string, actionItemId: string) => void;
  deleteRecording: (recordingId: string) => void;

  // Settings & Data Management
  updateSettings: (updates: Partial<UserSettings>) => void;
  clearAllRecordings: () => void;
  eraseAllData: () => void;
}

export const useMeetingStore = create<MeetingStoreState>((set, get) => ({
  meetings: INITIAL_MEETINGS,
  recordings: INITIAL_RECORDINGS,
  connectedAccounts: INITIAL_ACCOUNTS,
  settings: INITIAL_SETTINGS,
  downloadedModels: INITIAL_DOWNLOADED_MODELS,
  downloadProgress: {},
  activeDownloadingModelId: null,

  setDownloadedModelRecord: (record) => {
    set((state) => ({
      downloadedModels: { ...state.downloadedModels, [record.modelId]: record },
      settings: {
        ...state.settings,
        whisperModelDownloaded:
          record.status === 'ready' && record.modelId === state.settings.whisperModel
            ? true
            : state.settings.whisperModelDownloaded,
      },
    }));
  },

  removeDownloadedModelRecord: (modelId) => {
    set((state) => {
      const next = { ...state.downloadedModels };
      delete next[modelId];
      return {
        downloadedModels: next,
        settings: {
          ...state.settings,
          whisperModelDownloaded:
            state.settings.whisperModel === modelId ? false : state.settings.whisperModelDownloaded,
        },
      };
    });
  },

  setModelDownloadProgress: (modelId, percent) => {
    set((state) => ({
      downloadProgress: { ...state.downloadProgress, [modelId]: percent },
    }));
  },

  setActiveDownloadingModelId: (modelId) => {
    set({ activeDownloadingModelId: modelId });
  },
  activeRecording: {
    isRecording: false,
    isPaused: false,
    elapsedSeconds: 0,
    meetingId: undefined,
    meetingTitle: 'Ad-hoc Voice Note',
    audioUri: null,
    meterLevel: 0,
  },

  addMeeting: (meetingData) => {
    const newMeeting: Meeting = {
      ...meetingData,
      id: `m-manual-${Date.now()}`,
      status: 'upcoming',
      recordingIds: [],
      createdAt: new Date().toISOString(),
    };

    set((state) => ({
      meetings: [newMeeting, ...state.meetings],
    }));

    return newMeeting;
  },

  updateMeeting: (id, updates) => {
    set((state) => ({
      meetings: state.meetings.map((m) => (m.id === id ? { ...m, ...updates } : m)),
    }));
  },

  deleteMeeting: (id) => {
    set((state) => ({
      meetings: state.meetings.filter((m) => m.id !== id),
    }));
  },

  getMeetingById: (id) => {
    return get().meetings.find((m) => m.id === id);
  },

  connectAccount: (provider, email, name) => {
    set((state) => ({
      connectedAccounts: state.connectedAccounts.map((acc) => {
        if (acc.provider === provider) {
          return {
            ...acc,
            email: email || acc.email,
            name: name || acc.name,
            isConnected: true,
            lastSyncedAt: 'Just now',
            syncCount: (acc.syncCount || 0) + 1,
          };
        }
        return acc;
      }),
    }));
  },

  disconnectAccount: (provider) => {
    set((state) => ({
      connectedAccounts: state.connectedAccounts.map((acc) =>
        acc.provider === provider
          ? { ...acc, isConnected: false, lastSyncedAt: null, syncCount: 0 }
          : acc
      ),
    }));
  },

  syncAccount: (provider) => {
    set((state) => ({
      connectedAccounts: state.connectedAccounts.map((acc) =>
        acc.provider === provider
          ? { ...acc, lastSyncedAt: 'Just now', syncCount: acc.syncCount + 1 }
          : acc
      ),
    }));
  },

  startRecordingSession: (meetingId, meetingTitle) => {
    const targetTitle = meetingTitle || (meetingId ? get().getMeetingById(meetingId)?.title : 'Quick Note Session') || 'Quick Voice Note';

    if (meetingId) {
      get().updateMeeting(meetingId, { status: 'in_progress' });
    }

    set({
      activeRecording: {
        isRecording: true,
        isPaused: false,
        elapsedSeconds: 0,
        meetingId,
        meetingTitle: targetTitle,
        audioUri: null,
        meterLevel: 0.2,
      },
    });
  },

  pauseRecordingSession: () => {
    set((state) => ({
      activeRecording: { ...state.activeRecording, isPaused: true, meterLevel: 0 },
    }));
  },

  resumeRecordingSession: () => {
    set((state) => ({
      activeRecording: { ...state.activeRecording, isPaused: false, meterLevel: 0.3 },
    }));
  },

  updateActiveElapsed: (seconds) => {
    set((state) => ({
      activeRecording: { ...state.activeRecording, elapsedSeconds: seconds },
    }));
  },

  updateActiveMeter: (level) => {
    set((state) => ({
      activeRecording: { ...state.activeRecording, meterLevel: level },
    }));
  },

  stopAndSaveRecordingSession: (audioUri, options) => {
    const active = get().activeRecording;
    const duration = active.elapsedSeconds || 1;
    // 16kHz 16-bit Mono PCM is 32,000 bytes per second
    const estimatedSizeBytes = duration * 32000;

    const newRecording: Recording = {
      id: `rec-${Date.now()}`,
      meetingId: active.meetingId,
      meetingTitle: active.meetingTitle,
      uri: audioUri,
      durationSeconds: duration,
      fileSizeBytes: estimatedSizeBytes,
      createdAt: new Date().toISOString(),
      audioFormat: 'wav_16khz_mono',
      status: 'completed',
      transcript:
        options?.transcript ||
        `Recorded session for "${active.meetingTitle}". All audio captured locally on device at 16kHz mono. Ready for on-device Whisper transcription.`,
      summary: options?.summary || {
        executiveSummary: `Discussion summary for "${active.meetingTitle}". Captured audio on-device (${Math.round(duration)}s) ready for local Whisper model analysis.`,
        keyDecisions: [
          'Recorded audio session saved to local device sandbox.',
          'Zero cloud data upload guarantee applied.',
        ],
        actionItems: [
          { id: `act-${Date.now()}-1`, task: 'Review key points and update notes', assignee: 'Me', done: false },
          { id: `act-${Date.now()}-2`, task: 'Share action items with meeting participants', assignee: 'Me', done: false },
        ],
      },
      notes:
        options?.notes ||
        `### Meeting Notes\n- **Session:** ${active.meetingTitle}\n- **Duration:** ${Math.round(duration)}s\n- **Format:** 16kHz Mono WAV\n- Notes synthesized locally on device.`,
      tags: options?.tags || ['Voice Note', 'Recent'],
    };

    if (active.meetingId) {
      const meeting = get().getMeetingById(active.meetingId);
      if (meeting) {
        get().updateMeeting(active.meetingId, {
          status: 'completed',
          recordingIds: [...meeting.recordingIds, newRecording.id],
        });
      }
    }

    set((state) => ({
      recordings: [newRecording, ...state.recordings],
      activeRecording: {
        isRecording: false,
        isPaused: false,
        elapsedSeconds: 0,
        meetingId: undefined,
        meetingTitle: 'Ad-hoc Voice Note',
        audioUri: null,
        meterLevel: 0,
      },
    }));

    return newRecording;
  },

  updateRecordingNote: (recordingId: string, notes: string) => {
    set((state) => ({
      recordings: state.recordings.map((rec) =>
        rec.id === recordingId ? { ...rec, notes } : rec
      ),
    }));
  },

  toggleActionItem: (recordingId: string, actionItemId: string) => {
    set((state) => ({
      recordings: state.recordings.map((rec) => {
        if (rec.id !== recordingId || !rec.summary) return rec;
        return {
          ...rec,
          summary: {
            ...rec.summary,
            actionItems: rec.summary.actionItems.map((item) =>
              item.id === actionItemId ? { ...item, done: !item.done } : item
            ),
          },
        };
      }),
    }));
  },

  deleteRecording: (recordingId: string) => {
    set((state) => ({
      recordings: state.recordings.filter((rec) => rec.id !== recordingId),
      meetings: state.meetings.map((m) => ({
        ...m,
        recordingIds: m.recordingIds.filter((id) => id !== recordingId),
      })),
    }));
  },

  discardRecordingSession: () => {
    const active = get().activeRecording;
    if (active.meetingId) {
      get().updateMeeting(active.meetingId, { status: 'upcoming' });
    }
    set({
      activeRecording: {
        isRecording: false,
        isPaused: false,
        elapsedSeconds: 0,
        meetingId: undefined,
        meetingTitle: 'Ad-hoc Voice Note',
        audioUri: null,
        meterLevel: 0,
      },
    });
  },

  updateSettings: (updates) => {
    set((state) => ({
      settings: { ...state.settings, ...updates },
    }));
  },

  clearAllRecordings: () => {
    set((state) => ({
      recordings: [],
      meetings: state.meetings.map((m) => ({ ...m, recordingIds: [] })),
    }));
  },

  eraseAllData: () => {
    set({
      meetings: [],
      recordings: [],
      connectedAccounts: INITIAL_ACCOUNTS,
      settings: INITIAL_SETTINGS,
      activeRecording: {
        isRecording: false,
        isPaused: false,
        elapsedSeconds: 0,
        meetingId: undefined,
        meetingTitle: 'Ad-hoc Voice Note',
        audioUri: null,
        meterLevel: 0,
      },
    });
  },
}));
