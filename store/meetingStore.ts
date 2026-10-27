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

const formatLocalDate = (d: Date): string => {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const getRelativeDateStr = (daysOffset: number = 0): string => {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  return formatLocalDate(d);
};

const INITIAL_MEETINGS: Meeting[] = [];

const INITIAL_RECORDINGS: Recording[] = [];

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
  userName: 'Launa Vendrick',
  userEmail: 'launa.vendrick@meetanotes.ai',
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
  addRecording: (recording: Recording) => void;
  updateRecording: (recordingId: string, updates: Partial<Recording>) => void;
  updateRecordingNote: (recordingId: string, notes: string) => void;
  toggleActionItem: (recordingId: string, actionItemId: string) => void;
  deleteRecording: (recordingId: string) => void;

  // Quick Notes state (MeetaNotes UI Kit)
  quickNote: string;
  updateQuickNote: (note: string) => void;

  // Settings & Data Management
  updateSettings: (updates: Partial<UserSettings>) => void;
  loadDemoData: () => void;
  clearAllRecordings: () => void;
  eraseAllData: () => void;
}

export const useMeetingStore = create<MeetingStoreState>((set, get) => ({
  meetings: INITIAL_MEETINGS,
  recordings: INITIAL_RECORDINGS,
  connectedAccounts: INITIAL_ACCOUNTS,
  settings: INITIAL_SETTINGS,
  quickNote: 'Save a personal reminder about this person...',
  updateQuickNote: (note: string) => set({ quickNote: note }),
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

  addRecording: (recording: Recording) => {
    set((state) => ({
      recordings: [recording, ...state.recordings.filter((r) => r.id !== recording.id)],
    }));
  },

  updateRecording: (recordingId: string, updates: Partial<Recording>) => {
    set((state) => ({
      recordings: state.recordings.map((rec) =>
        rec.id === recordingId ? { ...rec, ...updates } : rec
      ),
    }));
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

  loadDemoData: () => {
    set({
      meetings: [
        {
          id: `meet-demo-${Date.now()}`,
          title: 'Project Kickoff & Roadmap',
          date: formatLocalDate(new Date()),
          startTime: '10:00 AM',
          endTime: '11:00 AM',
          durationMinutes: 60,
          platform: 'google_meet',
          meetingUrl: 'https://meetanotes.io/kickoff',
          attendees: ['Daniel Ross', 'Hannah Lee', 'Sarah Adams'],
          agenda: 'Align product scope, milestones, and deliverables.',
          source: 'manual',
          status: 'upcoming',
          recordingIds: [],
          createdAt: new Date().toISOString(),
        },
      ],
    });
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
