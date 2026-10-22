import * as AuthSession from 'expo-auth-session';
import { Platform } from 'react-native';

/**
 * Calendar OAuth & API Configuration
 *
 * To connect live Google and Microsoft calendars, set these values
 * in your .env or .env.local file. If not set, the app will run
 * in full Sandbox mode with simulated live calendar syncing.
 */

export interface CalendarConfigType {
  google: {
    clientIdWeb: string;
    clientIdIos: string;
    clientIdAndroid: string;
    scopes: string[];
    endpoints: {
      auth: string;
      token: string;
      userInfo: string;
      calendarEvents: string;
    };
  };
  microsoft: {
    clientId: string;
    tenantId: string;
    scopes: string[];
    endpoints: {
      auth: string;
      token: string;
      userInfo: string;
      calendarView: string;
    };
  };
}

export const CALENDAR_CONFIG: CalendarConfigType = {
  google: {
    clientIdWeb: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB || '',
    clientIdIos: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS || '',
    clientIdAndroid: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID || '',
    scopes: [
      'openid',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/calendar.readonly',
    ],
    endpoints: {
      auth: 'https://accounts.google.com/o/oauth2/v2/auth',
      token: 'https://oauth2.googleapis.com/token',
      userInfo: 'https://www.googleapis.com/oauth2/v2/userinfo',
      calendarEvents: 'https://www.googleapis.com/calendar/v3/calendars/primary/events',
    },
  },
  microsoft: {
    clientId: process.env.EXPO_PUBLIC_MICROSOFT_CLIENT_ID || '',
    tenantId: process.env.EXPO_PUBLIC_MICROSOFT_TENANT_ID || 'common',
    scopes: [
      'openid',
      'profile',
      'email',
      'offline_access',
      'User.Read',
      'Calendars.Read',
    ],
    endpoints: {
      auth: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
      token: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
      userInfo: 'https://graph.microsoft.com/v1.0/me',
      calendarView: 'https://graph.microsoft.com/v1.0/me/calendarView',
    },
  },
};

function isValidId(id?: string): boolean {
  return Boolean(id && id.trim() && !id.includes('your_google_') && !id.includes('your_microsoft_'));
}

/**
 * Returns the active Google Client ID depending on the running platform.
 * Falls back to Web Client ID if platform-specific native ID is not set.
 */
export function getActiveGoogleClientId(): string {
  if (Platform.OS === 'ios' && isValidId(CALENDAR_CONFIG.google.clientIdIos)) {
    return CALENDAR_CONFIG.google.clientIdIos;
  }
  // For browser-based OAuth endpoints (accounts.google.com), web client ID is required.
  if (isValidId(CALENDAR_CONFIG.google.clientIdWeb)) {
    return CALENDAR_CONFIG.google.clientIdWeb;
  }
  if (Platform.OS === 'android' && isValidId(CALENDAR_CONFIG.google.clientIdAndroid)) {
    return CALENDAR_CONFIG.google.clientIdAndroid;
  }
  return '';
}

/**
 * Determines whether real Google API credentials are provided.
 */
export function isGoogleConfigured(): boolean {
  return isValidId(getActiveGoogleClientId());
}

/**
 * Determines whether real Microsoft API credentials are provided.
 */
export function isMicrosoftConfigured(): boolean {
  return isValidId(CALENDAR_CONFIG.microsoft.clientId);
}

/**
 * Generates the unified OAuth redirect URI for this app.
 * On web: defaults to the current browser origin (e.g. http://localhost:8081).
 * On mobile/native: uses custom scheme or Expo Auth proxy.
 */
export function getCalendarRedirectUri(): string {
  if (process.env.EXPO_PUBLIC_GOOGLE_REDIRECT_URI) {
    return process.env.EXPO_PUBLIC_GOOGLE_REDIRECT_URI;
  }

  // On Web: use http://localhost:8081 (registered as URI 2 & 3 in Google Console)
  if (Platform.OS === 'web') {
    return typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin
      : 'http://localhost:8081';
  }

  // On Mobile: use Expo AuthSession proxy registered as URI 1 in Google Console
  return 'https://auth.expo.io/@thesukhjitbajwa/hacker-wrath';
}
