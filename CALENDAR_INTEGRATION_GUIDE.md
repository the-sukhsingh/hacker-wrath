# Calendar Integration Guide: Google Calendar & Microsoft Outlook

This guide explains how Google Calendar and Microsoft 365 Outlook calendar integrations work in this app, what credentials you will need to provide, and how they function right now.

---

## ⚡ Current State: Dual-Mode Architecture

The integration has been built with an **intelligent dual-mode system**:
1. **Live OAuth 2.0 Mode:** If client IDs are configured in `.env`, the app initiates the real OAuth2 handshake, retrieves personal and workspace calendar events from the Google Calendar REST API v3 and Microsoft Graph API v1.0, and synchronizes them directly onto your device.
2. **Instant Sandbox Mode:** If no credentials are provided yet, the app gracefully falls back to structured live sync. You can connect accounts, test syncing, test recording meetings, see them mapped onto the date picker and calendar views, without encountering crashes or blocker popups.

---

## 📋 What You Need to Provide Later

When you are ready to enable live synchronization with your real Google and Microsoft accounts, you will need the following credentials:

### 1. Google Calendar Integration

To enable live Google Workspace & Gmail calendar syncing:

1. **Google Cloud Project:**
   - Go to the [Google Cloud Console](https://console.cloud.google.com/).
   - Create a project (e.g. `HackerWrath Meeting Sync`).

2. **Enable Google Calendar API:**
   - Navigate to **APIs & Services > Library**.
   - Search for **Google Calendar API** and click **Enable**.

3. **Configure OAuth Consent Screen:**
   - Under **APIs & Services > OAuth consent screen**, select **External** (or **Internal** if using internal Google Workspace).
   - Enter your App Name and developer email.
   - Add the following scopes:
     - `https://www.googleapis.com/auth/calendar.readonly` (read meetings)
     - `https://www.googleapis.com/auth/userinfo.email` (account email)
     - `https://www.googleapis.com/auth/userinfo.profile` (account name)

4. **Create OAuth 2.0 Client IDs:**
   - Under **APIs & Services > Credentials > Create Credentials > OAuth client ID**:
   - **For Web & Expo Go Browser testing:**
     - Application type: **Web application**
     - Authorized redirect URIs:
       - `https://auth.expo.io/@<your-expo-username>/hacker-wrath`
       - `http://localhost:8081/auth`
   - **For Native Mobile Builds (Optional when generating standalone APK/IPA):**
     - Android: package name `com.anonymous.hackerwrath`
     - iOS: bundle identifier `com.anonymous.hackerwrath`

5. **Set in `.env`:**
   ```env
   EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB=your_google_web_client_id.apps.googleusercontent.com
   EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS=your_ios_client_id.apps.googleusercontent.com
   EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID=your_android_client_id.apps.googleusercontent.com
   ```

---

### 2. Microsoft 365 Outlook Integration

To enable live Microsoft Outlook and Microsoft Teams calendar syncing:

1. **Microsoft Entra ID (Azure App Registration):**
   - Go to the [Azure Portal App Registrations](https://portal.azure.com/#view/Microsoft_AAD_IAM/ActiveDirectoryMenuBlade/~/RegisteredApps).
   - Click **New registration**.
   - Name: `HackerWrath Calendar Sync`
   - Supported account types:
     - Select: **Accounts in any organizational directory (Any Microsoft Entra ID tenant - Multitenant) and personal Microsoft accounts (e.g. Skype, Xbox)**.

2. **Redirect URI:**
   - Platform: **Mobile and desktop applications** (or Single-page application for web).
   - Redirect URIs:
     - `hackerwrath://auth`
     - `https://auth.expo.io/@<your-expo-username>/hacker-wrath`

3. **API Permissions (Microsoft Graph):**
   - Click **API permissions > Add a permission > Microsoft Graph > Delegated permissions**.
   - Add:
     - `Calendars.Read` (Read user calendars and events)
     - `User.Read` (Sign in and read user profile)
     - `offline_access` (Maintain access via refresh token)
   - Click **Grant admin consent** (if using enterprise tenant) or save.

4. **Set in `.env`:**
   ```env
   EXPO_PUBLIC_MICROSOFT_CLIENT_ID=your_application_client_id_from_overview
   EXPO_PUBLIC_MICROSOFT_TENANT_ID=common
   ```

---

## 🏗️ Architecture & File Structure

| File | Purpose |
|---|---|
| [`constants/CalendarConfig.ts`](file:///e:/Projects/hacker-wrath/constants/CalendarConfig.ts) | OAuth endpoints, scopes, redirect URI resolver, and client ID detection helpers. |
| [`services/calendar/googleCalendar.ts`](file:///e:/Projects/hacker-wrath/services/calendar/googleCalendar.ts) | Google OAuth2 flow + Google Calendar REST API v3 event fetcher & meeting normalizer. |
| [`services/calendar/outlookCalendar.ts`](file:///e:/Projects/hacker-wrath/services/calendar/outlookCalendar.ts) | Microsoft Entra ID OAuth2 flow + Microsoft Graph API (`/v1.0/me/calendarView`) fetcher & Teams meeting normalizer. |
| [`services/calendar/calendarSyncService.ts`](file:///e:/Projects/hacker-wrath/services/calendar/calendarSyncService.ts) | Token persistence via AsyncStorage, deduplicated meeting store merge, sync all orchestrator. |
| [`components/ConnectAccountModal.tsx`](file:///e:/Projects/hacker-wrath/components/ConnectAccountModal.tsx) | Modal with live credential check, scope disclosures, provider tabs, and async auth execution. |
| [`components/AccountConnectCard.tsx`](file:///e:/Projects/hacker-wrath/components/AccountConnectCard.tsx) | Clean connection card showing sync status, meeting count, sync spinner, and disconnect. |
| [`app/(tabs)/meetings.tsx`](file:///e:/Projects/hacker-wrath/app/(tabs)/meetings.tsx) | Top calendar grid + bottom integrations list with "Sync All" button and feedback toasts. |
| [`app/(tabs)/index.tsx`](file:///e:/Projects/hacker-wrath/app/(tabs)/index.tsx) | Current week horizontal day strip linking meetings with direct quick-action to Calendar screen. |
