import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { Meeting } from '@/types/meeting';
import {
  CALENDAR_CONFIG,
  isMicrosoftConfigured,
  getCalendarRedirectUri,
} from '@/constants/CalendarConfig';
import { CalendarAuthResult } from './googleCalendar';

WebBrowser.maybeCompleteAuthSession();

/**
 * Format Date to 12-hour AM/PM string, e.g. "02:30 PM"
 */
function formatTime(date: Date): string {
  let hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const minutesStr = minutes < 10 ? `0${minutes}` : `${minutes}`;
  const hoursStr = hours < 10 ? `0${hours}` : `${hours}`;
  return `${hoursStr}:${minutesStr} ${ampm}`;
}

/**
 * Format Date to YYYY-MM-DD
 */
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Launches Microsoft Entra ID (Azure AD) OAuth authorization flow or falls back to demo mode.
 */
export async function authenticateOutlookCalendar(
  fallbackEmail: string = 'alex.chen@enterprise.com'
): Promise<CalendarAuthResult> {
  const clientId = CALENDAR_CONFIG.microsoft.clientId;

  // If Client ID is not provided in environment, provide instant sandbox mode
  if (!isMicrosoftConfigured()) {
    return {
      success: true,
      isSandbox: true,
      email: fallbackEmail.trim() || 'alex.chen@enterprise.com',
      name: 'Microsoft 365 Outlook',
    };
  }

  try {
    const redirectUri = getCalendarRedirectUri();
    const discovery = {
      authorizationEndpoint: CALENDAR_CONFIG.microsoft.endpoints.auth,
      tokenEndpoint: CALENDAR_CONFIG.microsoft.endpoints.token,
    };

    const extraParams: Record<string, string> = {
      prompt: 'select_account',
    };
    if (fallbackEmail && fallbackEmail.includes('@') && !fallbackEmail.includes('alex.chen')) {
      extraParams.login_hint = fallbackEmail.trim();
    }

    const request = new AuthSession.AuthRequest({
      clientId,
      scopes: CALENDAR_CONFIG.microsoft.scopes,
      redirectUri,
      responseType: AuthSession.ResponseType.Code,
      usePKCE: true,
      prompt: AuthSession.Prompt.SelectAccount,
      extraParams,
    });

    const result = await request.promptAsync(discovery);

    if (result.type === 'success' && result.params.code) {
      // Exchange authorization code for token
      const tokenResult = await AuthSession.exchangeCodeAsync(
        {
          clientId,
          code: result.params.code,
          redirectUri,
          extraParams: {
            code_verifier: request.codeVerifier || '',
          },
        },
        discovery
      );

      const accessToken = tokenResult.accessToken;

      // Query Microsoft Graph /me for user profile
      let userEmail = fallbackEmail;
      let userName = 'Microsoft User';

      try {
        const meRes = await fetch(CALENDAR_CONFIG.microsoft.endpoints.userInfo, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });
        if (meRes.ok) {
          const profile = await meRes.json();
          userEmail = profile.mail || profile.userPrincipalName || userEmail;
          userName = profile.displayName || userName;
        }
      } catch (graphErr) {
        console.warn('Could not fetch Microsoft user profile:', graphErr);
      }

      return {
        success: true,
        isSandbox: false,
        email: userEmail,
        name: userName,
        accessToken,
        refreshToken: tokenResult.refreshToken,
        expiresIn: tokenResult.expiresIn,
      };
    } else if (result.type === 'cancel' || result.type === 'dismiss') {
      return {
        success: false,
        isSandbox: false,
        email: '',
        name: '',
        error: 'Authentication was cancelled.',
      };
    } else {
      return {
        success: false,
        isSandbox: false,
        email: '',
        name: '',
        error: 'Microsoft authentication failed.',
      };
    }
  } catch (error: any) {
    console.error('Outlook Auth Error:', error);
    return {
      success: false,
      isSandbox: false,
      email: '',
      name: '',
      error: error?.message || 'Failed to authenticate with Microsoft Outlook.',
    };
  }
}

/**
 * Fetches events from Microsoft Graph CalendarView REST API or returns curated sandbox events.
 */
export async function fetchOutlookCalendarEvents(
  accessToken?: string,
  userEmail: string = 'alex.chen@enterprise.com'
): Promise<Meeting[]> {
  if (accessToken) {
    try {
      const now = new Date();
      const startDateTime = encodeURIComponent(now.toISOString());
      const future = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
      const endDateTime = encodeURIComponent(future.toISOString());

      const url = `${CALENDAR_CONFIG.microsoft.endpoints.calendarView}?startDateTime=${startDateTime}&endDateTime=${endDateTime}&$orderby=start/dateTime&$top=30`;

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Prefer: 'outlook.timezone="UTC"',
          Accept: 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        const items = data.value || [];

        return items.map((item: any): Meeting => {
          const startDt = new Date(item.start?.dateTime || new Date());
          const endDt = new Date(item.end?.dateTime || new Date(startDt.getTime() + 30 * 60 * 1000));

          const diffMinutes = Math.max(15, Math.round((endDt.getTime() - startDt.getTime()) / (1000 * 60)));
          const joinUrl = item.onlineMeeting?.joinUrl || item.webLink || '';
          const isTeams = Boolean(
            item.isOnlineMeeting ||
            (joinUrl && joinUrl.includes('teams.microsoft.com'))
          );

          const attendeesList: string[] = [];
          if (Array.isArray(item.attendees)) {
            item.attendees.forEach((att: any) => {
              if (att.emailAddress?.name) {
                attendeesList.push(att.emailAddress.name);
              } else if (att.emailAddress?.address) {
                attendeesList.push(att.emailAddress.address);
              }
            });
          }

          return {
            id: `outlook-${item.id}`,
            title: item.subject || 'Microsoft Outlook Meeting',
            date: formatDate(startDt),
            startTime: formatTime(startDt),
            endTime: formatTime(endDt),
            durationMinutes: diffMinutes,
            platform: isTeams ? 'teams' : 'other',
            meetingUrl: joinUrl,
            attendees: attendeesList.length > 0 ? attendeesList : [userEmail],
            agenda: item.bodyPreview || 'Imported from Microsoft 365 Outlook',
            source: 'outlook',
            status: 'upcoming',
            recordingIds: [],
            createdAt: new Date().toISOString(),
          };
        });
      }
    } catch (graphError) {
      console.warn('Error fetching live Microsoft Graph events:', graphError);
    }
  }

  return [];
}
