export type PlatformType = 'google_meet' | 'zoom' | 'teams' | 'in_person' | 'other';

export type MeetingSource = 'manual' | 'google_calendar' | 'outlook' | 'apple_calendar';

export type MeetingStatus = 'upcoming' | 'in_progress' | 'completed' | 'cancelled';

export interface Meeting {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  startTime: string; // e.g. "10:30 AM"
  endTime: string; // e.g. "11:15 AM"
  durationMinutes: number;
  platform: PlatformType;
  meetingUrl?: string;
  attendees: string[];
  agenda?: string;
  notes?: string;
  source: MeetingSource;
  status: MeetingStatus;
  recordingIds: string[];
  createdAt: string;
}

export interface ActionItem {
  id: string;
  task: string;
  assignee?: string;
  done: boolean;
  priority?: 'high' | 'medium' | 'low';
  dueDate?: string;
  category?: string;
}

export interface MeetingSummary {
  executiveSummary: string;
  keyDecisions: string[];
  actionItems: ActionItem[];
}

export interface Recording {
  id: string;
  meetingId?: string;
  meetingTitle: string;
  uri: string;
  durationSeconds: number;
  fileSizeBytes: number;
  createdAt: string;
  audioFormat: 'wav_16khz_mono';
  status: 'recorded' | 'transcribing' | 'completed';
  transcript?: string;
  summary?: MeetingSummary;
  notes?: string;
  tags?: string[];
}

export type AccountProvider = 'google' | 'outlook' | 'apple';

export interface ConnectedAccount {
  id: string;
  provider: AccountProvider;
  name: string;
  email: string;
  isConnected: boolean;
  lastSyncedAt: string | null;
  syncCount: number;
}

export interface UserSettings {
  userName: string;
  userEmail: string;
  engineMode: 'local' | 'cloud';
  whisperModel: 'ggml-tiny.en.bin' | 'ggml-base.en.bin' | 'ggml-small.en.bin';
  whisperModelDownloaded: boolean;
  activeSlmModel?: string;
  slmModelDownloaded?: boolean;
  cloudApiKey?: string;
  autoTranscribe: boolean;
  audioQuality: 'high' | 'standard';
}

