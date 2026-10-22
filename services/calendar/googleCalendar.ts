import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import { Meeting, PlatformType } from '@/types/meeting';
import {
  CALENDAR_CONFIG,
  getActiveGoogleClientId,
  isGoogleConfigured,
  getCalendarRedirectUri,
} from '@/constants/CalendarConfig';

WebBrowser.maybeCompleteAuthSession();

export interface CalendarAuthResult {
  success: boolean;
  isSandbox: boolean;
  email: string;
  name: string;
  accessToken?: string;
  refreshToken?: string;
  expiresIn?: number;
  picture?: string;
  error?: string;
}

/**
 * Format Date to 12-hour local time string (e.g. "02:30 PM")
 */
function formatLocalTime(date: Date): string {
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
 * Helper to extract OAuth access token from auth session result
 */
function extractOAuthToken(result: { params?: Record<string, string>; url?: string }): string | undefined {
  if (result.params?.access_token) {
    return result.params.access_token;
  }
  if (!result.url) return undefined;

  const urlStr = result.url;

  // 1. Check hash fragment (#access_token=...)
  const hashIdx = urlStr.indexOf('#');
  if (hashIdx !== -1) {
    const hashParams = new URLSearchParams(urlStr.substring(hashIdx + 1));
    const token = hashParams.get('access_token');
    if (token) return token;
  }

  // 2. Check query string (?access_token=...)
  const queryIdx = urlStr.indexOf('?');
  if (queryIdx !== -1) {
    const queryStr = hashIdx !== -1 ? urlStr.substring(queryIdx + 1, hashIdx) : urlStr.substring(queryIdx + 1);
    const queryParams = new URLSearchParams(queryStr);
    const token = queryParams.get('access_token');
    if (token) return token;
  }

  return undefined;
}

/**
 * Helper to extract OAuth error message if authentication failed
 */
function extractOAuthError(result: { params?: Record<string, string>; url?: string }): string | undefined {
  if (result.params?.error_description || result.params?.error) {
    return result.params.error_description || result.params.error;
  }
  if (!result.url) return undefined;

  const urlStr = result.url;
  const hashIdx = urlStr.indexOf('#');
  const queryIdx = urlStr.indexOf('?');
  const part = hashIdx !== -1 ? urlStr.substring(hashIdx + 1) : queryIdx !== -1 ? urlStr.substring(queryIdx + 1) : '';
  if (part) {
    const params = new URLSearchParams(part);
    return params.get('error_description') || params.get('error') || undefined;
  }
  return undefined;
}

/**
 * Format Date to YYYY-MM-DD in local timezone (avoids UTC offset shifts)
 */
function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Launches real Google OAuth 2.0 authorization flow using web client ID.
 */
export async function authenticateGoogleCalendar(
  emailHint?: string
): Promise<CalendarAuthResult> {
  const clientId = getActiveGoogleClientId();

  if (!isGoogleConfigured() || !clientId) {
    return {
      success: false,
      isSandbox: false,
      email: '',
      name: '',
      error: 'Google Client ID not found. Please check your EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB environment variable.',
    };
  }

  try {
    const redirectUri = getCalendarRedirectUri();
    console.log('[Google Calendar] Starting OAuth with:', {
      clientId,
      redirectUri,
      platform: Platform.OS,
      emailHint: emailHint || 'none',
    });

    const discovery = {
      authorizationEndpoint: CALENDAR_CONFIG.google.endpoints.auth,
      tokenEndpoint: CALENDAR_CONFIG.google.endpoints.token,
    };

    const clientSecret = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_SECRET_WEB || '';
    // Direct token (implicit flow) returns the access token directly to the client app
    // and eliminates the invalid_client client_secret token exchange error
    const responseType = AuthSession.ResponseType.Token;

    const extraParams: Record<string, string> = {
      prompt: 'select_account',
    };

    // If user provided a specific email to authorize, use login_hint so Google targets it directly
    if (emailHint && emailHint.trim()) {
      extraParams.login_hint = emailHint.trim();
    }

    const request = new AuthSession.AuthRequest({
      clientId,
      scopes: CALENDAR_CONFIG.google.scopes,
      redirectUri,
      responseType,
      usePKCE: false,
      prompt: AuthSession.Prompt.SelectAccount,
      extraParams,
    });

    let result: { type: string; url?: string; params?: Record<string, string> };

    if (Platform.OS === 'web') {
      result = (await request.promptAsync(discovery)) as any;
    } else {
      // Mobile flow: use the authorized Expo AuthSession proxy (https://auth.expo.io/@thesukhjitbajwa/hacker-wrath)
      // and redirect back to the app via native return URL (exp://... in Expo Go or hackerwrath:// in builds)
      const googleAuthUrl = await request.makeAuthUrlAsync(discovery);
      const nativeReturnUrl = AuthSession.makeRedirectUri({ scheme: 'hackerwrath' });

      const proxyStartUrl = `https://auth.expo.io/@thesukhjitbajwa/hacker-wrath/start?${new URLSearchParams({
        authUrl: googleAuthUrl,
        returnUrl: nativeReturnUrl,
      }).toString()}`;

      console.log('[Google Calendar] Launching mobile auth via Expo proxy:', {
        googleAuthUrl,
        proxyStartUrl,
        nativeReturnUrl,
      });

      result = (await WebBrowser.openAuthSessionAsync(proxyStartUrl, nativeReturnUrl)) as any;
    }

    console.log('[Google Calendar] Auth prompt result type:', result.type);

    if (result.type === 'success') {
      let accessToken = extractOAuthToken(result);

      // If Google returned an authorization code, exchange it for an access token
      if (!accessToken && result.params?.code) {
        console.log('[Google Calendar] Exchanging authorization code for token...');
        const tokenParams: Record<string, string> = {
          code: result.params.code,
          client_id: clientId,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
        };
        if (clientSecret) {
          tokenParams.client_secret = clientSecret;
        }
        if (request.codeVerifier) {
          tokenParams.code_verifier = request.codeVerifier;
        }

        const tokenRes = await fetch(CALENDAR_CONFIG.google.endpoints.token, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams(tokenParams).toString(),
        });

        const tokenData = await tokenRes.json();
        if (tokenRes.ok && tokenData.access_token) {
          accessToken = tokenData.access_token;
          console.log('[Google Calendar] Token exchange succeeded!');
        } else {
          console.error('[Google Calendar] Token exchange failed:', tokenData);
          return {
            success: false,
            isSandbox: false,
            email: '',
            name: '',
            error:
              tokenData.error_description ||
              tokenData.error ||
              'Google authorization code exchange failed.',
          };
        }
      }

      if (!accessToken) {
        const errorDesc = extractOAuthError(result) || 'No access token returned by Google.';
        return {
          success: false,
          isSandbox: false,
          email: '',
          name: '',
          error: errorDesc,
        };
      }

      // Query Google UserInfo API for user's real email & name
      let userEmail = 'Google Account';
      let userName = 'Google User';

      try {
        const userInfoRes = await fetch(CALENDAR_CONFIG.google.endpoints.userInfo, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });
        if (userInfoRes.ok) {
          const profile = await userInfoRes.json();
          userEmail = profile.email || userEmail;
          userName = profile.name || userName;
        }
      } catch (err) {
        console.warn('[Google Calendar] UserInfo fetch warning:', err);
      }

      return {
        success: true,
        isSandbox: false,
        email: userEmail,
        name: userName,
        accessToken,
      };
    } else if (result.type === 'cancel' || result.type === 'dismiss') {
      return {
        success: false,
        isSandbox: false,
        email: '',
        name: '',
        error: 'Google Sign-in was cancelled.',
      };
    } else {
      return {
        success: false,
        isSandbox: false,
        email: '',
        name: '',
        error: (result as any).error?.message || 'Google authentication failed.',
      };
    }
  } catch (error: any) {
    console.error('[Google Calendar] Auth Exception:', error);
    return {
      success: false,
      isSandbox: false,
      email: '',
      name: '',
      error: error?.message || 'Failed to authenticate with Google.',
    };
  }
}

/**
 * Authenticates directly with a provided Google Access Token.
 * Allows instant integration without mobile custom URI scheme restrictions.
 */
export async function authenticateGoogleCalendarWithToken(
  token: string
): Promise<CalendarAuthResult> {
  if (!token || !token.trim()) {
    return {
      success: false,
      isSandbox: false,
      email: '',
      name: '',
      error: 'Please enter a valid Google Access Token.',
    };
  }

  const cleanToken = token.trim();

  try {
    const userRes = await fetch(CALENDAR_CONFIG.google.endpoints.userInfo, {
      headers: {
        Authorization: `Bearer ${cleanToken}`,
      },
    });

    if (!userRes.ok) {
      const errText = await userRes.text();
      return {
        success: false,
        isSandbox: false,
        email: '',
        name: '',
        error: `Google rejected token (${userRes.status}): ${errText.slice(0, 100)}`,
      };
    }

    const userData = await userRes.json();
    return {
      success: true,
      isSandbox: false,
      accessToken: cleanToken,
      email: userData.email || 'user@gmail.com',
      name: userData.name || userData.email || 'Google User',
      picture: userData.picture,
    };
  } catch (err: any) {
    return {
      success: false,
      isSandbox: false,
      email: '',
      name: '',
      error: err?.message || 'Failed to authenticate with token.',
    };
  }
}

/**
 * Fetches real events from Google Calendar REST API v3.
 * Returns only real events from the user's primary calendar (never dummy data).
 */
export async function fetchGoogleCalendarEvents(
  accessToken?: string,
  userEmail: string = ''
): Promise<Meeting[]> {
  if (!accessToken) {
    return [];
  }

  try {
    const now = new Date();
    // Query starting from beginning of today in local time
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const timeMin = encodeURIComponent(startOfToday.toISOString());
    // Query forward 60 days
    const future = new Date(startOfToday.getTime() + 60 * 24 * 60 * 60 * 1000);
    const timeMax = encodeURIComponent(future.toISOString());

    const url = `${CALENDAR_CONFIG.google.endpoints.calendarEvents}?timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime&maxResults=100`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
    });

    if (response.ok) {
      const data = await response.json();
      const items = data.items || [];
      console.log(`[Google Calendar] Retrieved ${items.length} real events.`);

      return items.map((item: any): Meeting => {
        let dateStr: string;
        let startTimeStr: string;
        let endTimeStr: string;
        let diffMinutes = 30;

        if (item.start?.dateTime) {
          const startDt = new Date(item.start.dateTime);
          const endDt = item.end?.dateTime
            ? new Date(item.end.dateTime)
            : new Date(startDt.getTime() + 30 * 60 * 1000);
          dateStr = formatLocalDate(startDt);
          startTimeStr = formatLocalTime(startDt);
          endTimeStr = formatLocalTime(endDt);
          diffMinutes = Math.max(15, Math.round((endDt.getTime() - startDt.getTime()) / (1000 * 60)));
        } else if (item.start?.date) {
          // All-day event
          dateStr = item.start.date;
          startTimeStr = 'All Day';
          endTimeStr = 'All Day';
          diffMinutes = 0;
        } else {
          dateStr = formatLocalDate(new Date());
          startTimeStr = '12:00 PM';
          endTimeStr = '12:30 PM';
        }

        const hangoutLink = item.hangoutLink || item.conferenceData?.entryPoints?.[0]?.uri || '';
        const combinedInfo = `${hangoutLink} ${item.location || ''} ${item.summary || ''}`.toLowerCase();
        let platform: PlatformType = 'other';
        if (combinedInfo.includes('meet.google.com')) platform = 'google_meet';
        else if (combinedInfo.includes('zoom.us')) platform = 'zoom';
        else if (combinedInfo.includes('teams.microsoft.com') || combinedInfo.includes('teams.live.com')) platform = 'teams';
        else if (item.location) platform = 'in_person';

        const attendeesList: string[] = [];
        if (Array.isArray(item.attendees)) {
          item.attendees.forEach((att: any) => {
            if (att.displayName) attendeesList.push(att.displayName);
            else if (att.email) attendeesList.push(att.email);
          });
        }

        return {
          id: `gcal-${item.id}`,
          title: item.summary || 'Google Calendar Event',
          date: dateStr,
          startTime: startTimeStr,
          endTime: endTimeStr,
          durationMinutes: diffMinutes,
          platform,
          meetingUrl: hangoutLink || item.htmlLink || '',
          attendees: attendeesList.length > 0 ? attendeesList : [userEmail || 'You'],
          agenda: item.description || item.location || 'Imported from Google Calendar',
          source: 'google_calendar',
          status: 'upcoming',
          recordingIds: [],
          createdAt: new Date().toISOString(),
        };
      });
    } else {
      const errText = await response.text();
      console.error('[Google Calendar] API responded with error status:', response.status, errText);
      return [];
    }
  } catch (apiError) {
    console.error('[Google Calendar] Error fetching events:', apiError);
    return [];
  }
}
