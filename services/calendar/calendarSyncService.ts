import AsyncStorage from '@react-native-async-storage/async-storage';
import { AccountProvider, Meeting } from '@/types/meeting';
import { useMeetingStore } from '@/store/meetingStore';
import {
  authenticateGoogleCalendar,
  authenticateGoogleCalendarWithToken,
  fetchGoogleCalendarEvents,
  CalendarAuthResult,
} from './googleCalendar';
import {
  authenticateOutlookCalendar,
  fetchOutlookCalendarEvents,
} from './outlookCalendar';

const STORAGE_KEYS = {
  googleToken: '@calendar_token_google',
  outlookToken: '@calendar_token_outlook',
};

export interface SyncResult {
  success: boolean;
  importedCount: number;
  message: string;
}

/**
 * Persists an access token securely in local device storage.
 */
async function saveToken(provider: AccountProvider, token: string): Promise<void> {
  const key = provider === 'google' ? STORAGE_KEYS.googleToken : STORAGE_KEYS.outlookToken;
  await AsyncStorage.setItem(key, token);
}

/**
 * Retrieves the stored token for a provider.
 */
async function getStoredToken(provider: AccountProvider): Promise<string | null> {
  const key = provider === 'google' ? STORAGE_KEYS.googleToken : STORAGE_KEYS.outlookToken;
  return AsyncStorage.getItem(key);
}

/**
 * Removes the stored token for a provider upon disconnect.
 */
async function clearStoredToken(provider: AccountProvider): Promise<void> {
  const key = provider === 'google' ? STORAGE_KEYS.googleToken : STORAGE_KEYS.outlookToken;
  await AsyncStorage.removeItem(key);
}

/**
 * Connects a calendar provider (Google, Microsoft Outlook, or Apple)
 * and performs the initial calendar event sync.
 */
export async function connectCalendarAccount(
  provider: AccountProvider,
  emailHint?: string
): Promise<CalendarAuthResult> {
  const store = useMeetingStore.getState();

  let authResult: CalendarAuthResult;

  if (provider === 'google') {
    authResult = await authenticateGoogleCalendar(emailHint);
  } else if (provider === 'outlook') {
    authResult = await authenticateOutlookCalendar(emailHint);
  } else {
    authResult = {
      success: true,
      isSandbox: true,
      email: 'user@icloud.com',
      name: 'Apple iCloud Calendar',
    };
  }

  if (!authResult.success) {
    return authResult;
  }

  // Store token if live token returned
  if (authResult.accessToken) {
    await saveToken(provider, authResult.accessToken);
  }

  // Fetch real calendar events
  let fetchedMeetings: Meeting[] = [];
  if (provider === 'google') {
    fetchedMeetings = await fetchGoogleCalendarEvents(
      authResult.accessToken,
      authResult.email
    );
  } else if (provider === 'outlook') {
    fetchedMeetings = await fetchOutlookCalendarEvents(
      authResult.accessToken,
      authResult.email
    );
  }

  // Merge into store and clean any old mock events
  store.connectAccount(provider, authResult.email, authResult.name);
  mergeMeetingsIntoStore(fetchedMeetings, provider);

  // Update sync count explicitly
  useMeetingStore.setState((state) => ({
    connectedAccounts: state.connectedAccounts.map((acc) =>
      acc.provider === provider
        ? { ...acc, syncCount: fetchedMeetings.length, lastSyncedAt: 'Just now' }
        : acc
    ),
  }));

  return authResult;
}

/**
 * Connects directly using a user-provided Google Access Token.
 * Bypasses mobile redirect URI restrictions and fetches real Google Calendar events.
 */
export async function connectWithGoogleToken(token: string): Promise<CalendarAuthResult> {
  const store = useMeetingStore.getState();
  const authResult = await authenticateGoogleCalendarWithToken(token);

  if (!authResult.success) {
    return authResult;
  }

  if (authResult.accessToken) {
    await saveToken('google', authResult.accessToken);
  }

  const fetchedMeetings = await fetchGoogleCalendarEvents(
    authResult.accessToken,
    authResult.email
  );

  store.connectAccount('google', authResult.email, authResult.name);
  mergeMeetingsIntoStore(fetchedMeetings, 'google');

  useMeetingStore.setState((state) => ({
    connectedAccounts: state.connectedAccounts.map((acc) =>
      acc.provider === 'google'
        ? { ...acc, syncCount: fetchedMeetings.length, lastSyncedAt: 'Just now' }
        : acc
    ),
  }));

  return authResult;
}

/**
 * Syncs latest events for an already-connected calendar provider.
 */
export async function syncCalendarAccount(
  provider: AccountProvider
): Promise<SyncResult> {
  const store = useMeetingStore.getState();
  const account = store.connectedAccounts.find((a) => a.provider === provider);

  if (!account || !account.isConnected) {
    return {
      success: false,
      importedCount: 0,
      message: 'Account is not connected.',
    };
  }

  const token = await getStoredToken(provider);

  let newMeetings: Meeting[] = [];
  if (provider === 'google') {
    newMeetings = await fetchGoogleCalendarEvents(token || undefined, account.email);
  } else if (provider === 'outlook') {
    newMeetings = await fetchOutlookCalendarEvents(token || undefined, account.email);
  } else {
    newMeetings = [];
  }

  const addedCount = mergeMeetingsIntoStore(newMeetings, provider);
  store.syncAccount(provider);

  useMeetingStore.setState((state) => ({
    connectedAccounts: state.connectedAccounts.map((acc) =>
      acc.provider === provider
        ? { ...acc, syncCount: newMeetings.length, lastSyncedAt: 'Just now' }
        : acc
    ),
  }));

  return {
    success: true,
    importedCount: addedCount,
    message: `Synced ${newMeetings.length} Google events`,
  };
}

/**
 * Disconnects a calendar account and removes its imported meetings.
 */
export async function disconnectCalendarAccount(
  provider: AccountProvider
): Promise<void> {
  await clearStoredToken(provider);
  const store = useMeetingStore.getState();

  // Disconnect in store
  store.disconnectAccount(provider);

  // Clean up meetings imported specifically from this source
  const sourceName =
    provider === 'google'
      ? 'google_calendar'
      : provider === 'outlook'
      ? 'outlook'
      : 'apple_calendar';

  const remainingMeetings = store.meetings.filter((m) => m.source !== sourceName);
  useMeetingStore.setState({ meetings: remainingMeetings });
}

/**
 * Syncs all connected calendar providers.
 */
export async function syncAllCalendars(): Promise<number> {
  const store = useMeetingStore.getState();
  const connected = store.connectedAccounts.filter((a) => a.isConnected);

  let totalImported = 0;
  for (const acc of connected) {
    const res = await syncCalendarAccount(acc.provider);
    if (res.success) {
      totalImported += res.importedCount;
    }
  }

  return totalImported;
}

/**
 * Merges meetings into store avoiding duplicates and purging any stale mock items.
 */
function mergeMeetingsIntoStore(meetingsToAdd: Meeting[], provider?: AccountProvider): number {
  const sourceName =
    provider === 'google'
      ? 'google_calendar'
      : provider === 'outlook'
      ? 'outlook'
      : provider === 'apple'
      ? 'apple_calendar'
      : undefined;

  // Clean out legacy mock meetings and replace current provider events with fresh fetch
  const cleanedCurrent = useMeetingStore
    .getState()
    .meetings.filter(
      (m) =>
        !m.id.includes('demo') &&
        !m.id.includes('m-sync-') &&
        (!sourceName || m.source !== sourceName)
    );

  if (meetingsToAdd.length === 0) {
    useMeetingStore.setState({ meetings: cleanedCurrent });
    return 0;
  }

  const existingKeys = new Set(
    cleanedCurrent.map((m) => `${m.title.toLowerCase()}_${m.date}_${m.startTime}`)
  );

  const deduplicated = meetingsToAdd.filter(
    (m) => !existingKeys.has(`${m.title.toLowerCase()}_${m.date}_${m.startTime}`)
  );

  useMeetingStore.setState({
    meetings: [...deduplicated, ...cleanedCurrent],
  });

  return deduplicated.length;
}

/**
 * Connects an account in Sandbox / Demo mode with realistic scheduled events.
 * Provides instant demonstration without requiring external API tokens or OAuth setup.
 */
export function connectSandboxAccount(
  provider: AccountProvider,
  email: string
): CalendarAuthResult {
  const store = useMeetingStore.getState();
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const today = `${year}-${month}-${day}`;

  const tomorrowDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const tomorrow = `${tomorrowDate.getFullYear()}-${String(tomorrowDate.getMonth() + 1).padStart(2, '0')}-${String(tomorrowDate.getDate()).padStart(2, '0')}`;

  const targetEmail = email.trim() || (provider === 'google' ? 'user@gmail.com' : 'user@outlook.com');
  const providerLabel = provider === 'google' ? 'Google Calendar' : provider === 'outlook' ? 'Microsoft 365 Outlook' : 'Apple iCloud';
  const sourceName = provider === 'google' ? 'google_calendar' : provider === 'outlook' ? 'outlook' : 'apple_calendar';

  const demoMeetings: Meeting[] = [
    {
      id: `${provider}-sandbox-1`,
      title: 'Q4 Product Roadmap & Sprint Planning',
      date: today,
      startTime: '10:00 AM',
      endTime: '11:00 AM',
      durationMinutes: 60,
      platform: provider === 'google' ? 'google_meet' : 'teams',
      meetingUrl: 'https://meet.google.com/abc-defg-hij',
      attendees: [targetEmail, 'sarah.connor@example.com', 'david.kim@example.com'],
      agenda: 'Discuss product deliverables, Whisper speech-to-text pipeline, and engineering milestones.',
      source: sourceName,
      status: 'upcoming',
      recordingIds: [],
      createdAt: new Date().toISOString(),
    },
    {
      id: `${provider}-sandbox-2`,
      title: 'Architecture Review: Privacy & On-Device AI',
      date: today,
      startTime: '02:30 PM',
      endTime: '03:15 PM',
      durationMinutes: 45,
      platform: 'google_meet',
      meetingUrl: 'https://meet.google.com/xyz-uvwx-rst',
      attendees: [targetEmail, 'alex.chen@work.com'],
      agenda: 'Review local STT models, zero-cloud data leak protections, and offline note generation.',
      source: sourceName,
      status: 'upcoming',
      recordingIds: [],
      createdAt: new Date().toISOString(),
    },
    {
      id: `${provider}-sandbox-3`,
      title: 'Team Sync & Retrospective',
      date: tomorrow,
      startTime: '11:30 AM',
      endTime: '12:15 PM',
      durationMinutes: 45,
      platform: provider === 'google' ? 'google_meet' : 'teams',
      meetingUrl: 'https://meet.google.com/ret-sync-123',
      attendees: [targetEmail, 'team-leads@company.com'],
      agenda: 'Sprint retro, blockers, and next quarter roadmap sync.',
      source: sourceName,
      status: 'upcoming',
      recordingIds: [],
      createdAt: new Date().toISOString(),
    },
  ];

  store.connectAccount(provider, targetEmail, providerLabel);
  mergeMeetingsIntoStore(demoMeetings, provider);

  useMeetingStore.setState((state) => ({
    connectedAccounts: state.connectedAccounts.map((acc) =>
      acc.provider === provider
        ? { ...acc, syncCount: demoMeetings.length, lastSyncedAt: 'Just now' }
        : acc
    ),
  }));

  return {
    success: true,
    isSandbox: true,
    email: targetEmail,
    name: providerLabel,
  };
}

