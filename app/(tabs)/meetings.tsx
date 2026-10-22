import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, View } from '@/components/Themed';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMeetingStore } from '@/store/meetingStore';
import { MeetingCard } from '@/components/MeetingCard';
import { AccountConnectCard } from '@/components/AccountConnectCard';
import { ManualMeetingModal } from '@/components/ManualMeetingModal';
import { SpecifyAccountModal } from '@/components/SpecifyAccountModal';
import { AccountProvider, Meeting } from '@/types/meeting';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import {
  connectCalendarAccount,
  syncCalendarAccount,
  disconnectCalendarAccount,
  syncAllCalendars,
} from '@/services/calendar/calendarSyncService';

export default function MeetingsScreen() {
  const router = useRouter();
  const theme = useColorScheme();
  const colors = Colors[theme];
  const insets = useSafeAreaInsets();

  const {
    meetings,
    connectedAccounts,
    activeRecording,
    addMeeting,
    startRecordingSession,
  } = useMeetingStore();

  const [syncingProvider, setSyncingProvider] = useState<AccountProvider | null>(null);
  const [connectingProvider, setConnectingProvider] = useState<AccountProvider | null>(null);
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [syncNotification, setSyncNotification] = useState<string | null>(null);
  const [manualModalOpen, setManualModalOpen] = useState(false);
  const [specifyModalOpen, setSpecifyModalOpen] = useState(false);
  const [specifyProvider, setSpecifyProvider] = useState<AccountProvider>('google');

  // Calendar month state
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const todayStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string>(todayStr);

  const monthYearLabel = useMemo(() => {
    return currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }, [currentDate]);

  // Generate calendar grid for the displayed month
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDayIndex = new Date(year, month, 1).getDay();
    const adjustedFirstDay = firstDayIndex === 0 ? 6 : firstDayIndex - 1;

    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const cells: { dayNumber: number | null; dateString: string | null }[] = [];

    for (let i = 0; i < adjustedFirstDay; i++) {
      cells.push({ dayNumber: null, dateString: null });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({ dayNumber: d, dateString });
    }

    return cells;
  }, [currentDate]);

  const datesWithMeetings = useMemo(() => {
    const set = new Set<string>();
    meetings.forEach((m) => set.add(m.date));
    return set;
  }, [meetings]);

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const showToast = (msg: string) => {
    setSyncNotification(msg);
    setTimeout(() => {
      setSyncNotification(null);
    }, 3500);
  };

  const handleSync = async (provider: AccountProvider) => {
    setSyncingProvider(provider);
    try {
      const res = await syncCalendarAccount(provider);
      showToast(res.message);
    } catch (err: any) {
      showToast(err?.message || 'Sync failed.');
    } finally {
      setSyncingProvider(null);
    }
  };

  const handleDisconnect = async (provider: AccountProvider) => {
    await disconnectCalendarAccount(provider);
    showToast('Account disconnected.');
  };

  const handleSyncAll = async () => {
    setIsSyncingAll(true);
    try {
      const count = await syncAllCalendars();
      showToast(`All calendars synced (${count} new events added)`);
    } catch {
      showToast('Failed to sync all calendars.');
    } finally {
      setIsSyncingAll(false);
    }
  };

  const handleConnectAccount = async (
    provider: AccountProvider,
    emailHint?: string,
    isExplicitOAuth: boolean = false
  ) => {
    if (
      !isExplicitOAuth &&
      provider === 'google' &&
      Platform.OS !== 'web' &&
      !process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID
    ) {
      setSpecifyProvider('google');
      setSpecifyModalOpen(true);
      return;
    }

    setConnectingProvider(provider);
    try {
      const res = await connectCalendarAccount(provider, emailHint);
      if (res.success) {
        setSpecifyModalOpen(false);
        showToast(
          res.isSandbox
            ? `Connected ${provider === 'google' ? 'Google' : 'Outlook'} in sandbox mode.`
            : `Connected live ${provider === 'google' ? 'Google' : 'Outlook'} account (${res.email})!`
        );
      } else if (res.error) {
        showToast(res.error);
      }
      return res;
    } catch (err: any) {
      const msg = err?.message || 'Connection failed.';
      showToast(msg);
      return { success: false, error: msg };
    } finally {
      setConnectingProvider(null);
    }
  };

  const handleStartRecord = (meeting: Meeting) => {
    startRecordingSession(meeting.id, meeting.title);
    router.push('/record');
  };

  const dateMeetings = useMemo(() => {
    return meetings.filter((m) => m.date === selectedCalendarDate);
  }, [meetings, selectedCalendarDate]);

  return (
    <View style={[styles.screen, { backgroundColor: colors.background, paddingTop: Math.max(insets.top, 14) }]}>
      {/* Top Header */}
      <View style={styles.topHeader}>
        <View>
          <Text style={[styles.screenTitle, { color: colors.onSurface }]}>Calendar</Text>
          <Text style={[styles.screenSub, { color: colors.onSurfaceVariant }]}>Schedule & cloud calendar sync</Text>
        </View>

        <TouchableOpacity
          onPress={() => setManualModalOpen(true)}
          style={[styles.m3FilledBtn, { backgroundColor: colors.primary }]}>
          <Ionicons name="add" size={16} color={colors.onPrimary} style={{ marginRight: 4 }} />
          <Text style={[styles.m3FilledBtnText, { color: colors.onPrimary }]}>New</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Calendar View Card */}
        <View style={[styles.m3CalendarCard, { backgroundColor: colors.surfaceContainerLow, borderColor: colors.outlineVariant }]}>
          {/* Month Navigation */}
          <View style={styles.monthNavRow}>
            <Text style={[styles.monthNavTitle, { color: colors.onSurface }]}>{monthYearLabel}</Text>
            <View style={styles.monthNavArrows}>
              <TouchableOpacity onPress={handlePrevMonth} style={[styles.navArrowBtn, { backgroundColor: colors.surfaceContainerHigh }]}>
                <Ionicons name="chevron-back" size={18} color={colors.onSurface} />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleNextMonth} style={[styles.navArrowBtn, { backgroundColor: colors.surfaceContainerHigh }]}>
                <Ionicons name="chevron-forward" size={18} color={colors.onSurface} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Weekday Labels */}
          <View style={styles.weekHeaderRow}>
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, idx) => (
              <Text key={idx} style={[styles.weekHeaderDay, { color: colors.onSurfaceVariant }]}>
                {day}
              </Text>
            ))}
          </View>

          {/* Calendar Day Grid */}
          <View style={styles.gridContainer}>
            {calendarDays.map((cell, idx) => {
              if (!cell.dayNumber || !cell.dateString) {
                return <View key={idx} style={styles.gridCellEmpty} />;
              }

              const isSelected = cell.dateString === selectedCalendarDate;
              const isToday = cell.dateString === todayStr;
              const hasMeeting = datesWithMeetings.has(cell.dateString);

              return (
                <TouchableOpacity
                  key={cell.dateString}
                  onPress={() => setSelectedCalendarDate(cell.dateString!)}
                  style={[
                    styles.gridCell,
                    isSelected && { backgroundColor: colors.primary, borderRadius: 16 },
                  ]}>
                  <Text
                    style={[
                      styles.cellText,
                      {
                        color: isSelected
                          ? colors.onPrimary
                          : isToday
                          ? colors.primary
                          : colors.onSurface,
                        fontWeight: isSelected || isToday ? '700' : '500',
                      },
                    ]}>
                    {cell.dayNumber}
                  </Text>
                  {hasMeeting && (
                    <View
                      style={[
                        styles.meetingDot,
                        { backgroundColor: isSelected ? colors.onPrimary : colors.tertiary },
                      ]}
                    />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Sync Toast Notification */}
        {syncNotification && (
          <View style={[styles.toastBanner, { backgroundColor: colors.secondaryContainer, borderColor: colors.primary }]}>
            <Ionicons name="information-circle" size={16} color={colors.onSecondaryContainer} />
            <Text style={[styles.toastText, { color: colors.onSecondaryContainer }]}>{syncNotification}</Text>
          </View>
        )}

        {/* Meetings for Selected Date */}
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>
            Meetings for {selectedCalendarDate === todayStr ? 'Today' : selectedCalendarDate}
          </Text>
          <View style={[styles.countPill, { backgroundColor: colors.surfaceContainerHigh }]}>
            <Text style={[styles.countPillText, { color: colors.onSurfaceVariant }]}>
              {dateMeetings.length}
            </Text>
          </View>
        </View>

        {dateMeetings.length === 0 ? (
          <View style={[styles.noMeetingsCard, { backgroundColor: colors.surfaceContainerLow, borderColor: colors.outlineVariant }]}>
            <Text style={[styles.noMeetingsText, { color: colors.onSurfaceVariant }]}>
              No events scheduled for this day
            </Text>
          </View>
        ) : (
          dateMeetings.map((meeting) => (
            <MeetingCard
              key={meeting.id}
              meeting={meeting}
              isCurrentlyRecording={activeRecording.isRecording && activeRecording.meetingId === meeting.id}
              onPress={() => router.push({ pathname: '/meeting/[id]', params: { id: meeting.id } })}
              onRecordPress={() => handleStartRecord(meeting)}
            />
          ))
        )}

        {/* Calendar Accounts & Integrations Section */}
        <View style={styles.accountsSection}>
          <View style={styles.sectionHeaderBetween}>
            <View>
              <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>Connected Calendars</Text>
              <Text style={[styles.sectionDesc, { color: colors.onSurfaceVariant }]}>
                Google Calendar & Microsoft 365 OAuth
              </Text>
            </View>

            <TouchableOpacity
              onPress={handleSyncAll}
              disabled={isSyncingAll}
              style={[styles.m3TonalBtn, { backgroundColor: colors.secondaryContainer }]}>
              <Ionicons name="sync" size={13} color={colors.onSecondaryContainer} style={{ marginRight: 4 }} />
              <Text style={[styles.m3TonalBtnText, { color: colors.onSecondaryContainer }]}>
                {isSyncingAll ? 'Syncing...' : 'Sync All'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={{ gap: 12, marginTop: 12 }}>
            {connectedAccounts.map((account) => (
              <AccountConnectCard
                key={account.id}
                account={account}
                isSyncing={syncingProvider === account.provider}
                isConnecting={connectingProvider === account.provider}
                onConnectPress={() => handleConnectAccount(account.provider)}
                onDisconnectPress={() => handleDisconnect(account.provider)}
                onSyncPress={() => handleSync(account.provider)}
                onSpecifyEmailPress={() => {
                  setSpecifyProvider(account.provider);
                  setSpecifyModalOpen(true);
                }}
              />
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Manual Meeting Creation Modal */}
      <ManualMeetingModal
        visible={manualModalOpen}
        onClose={() => setManualModalOpen(false)}
        onSubmit={(newMeeting) => {
          addMeeting(newMeeting);
          showToast('Meeting created successfully!');
        }}
      />

      {/* Specify Account Modal */}
      <SpecifyAccountModal
        visible={specifyModalOpen}
        provider={specifyProvider}
        isConnecting={connectingProvider === specifyProvider}
        onClose={() => setSpecifyModalOpen(false)}
        onConnect={(email: string) => handleConnectAccount(specifyProvider, email, true)}
      />
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
    paddingBottom: 12,
    backgroundColor: 'transparent',
  },
  screenTitle: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  screenSub: {
    fontSize: 12,
    marginTop: 2,
  },
  m3FilledBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  m3FilledBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  m3CalendarCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  monthNavRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: 'transparent',
  },
  monthNavTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  monthNavArrows: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'transparent',
  },
  navArrowBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    backgroundColor: 'transparent',
  },
  weekHeaderDay: {
    width: 38,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    backgroundColor: 'transparent',
  },
  gridCellEmpty: {
    width: 38,
    height: 38,
  },
  gridCell: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 2,
  },
  cellText: {
    fontSize: 13,
  },
  meetingDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    position: 'absolute',
    bottom: 4,
  },
  toastBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 14,
  },
  toastText: {
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: 'transparent',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  countPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  countPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  noMeetingsCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  noMeetingsText: {
    fontSize: 13,
  },
  accountsSection: {
    marginTop: 10,
    backgroundColor: 'transparent',
  },
  sectionHeaderBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    backgroundColor: 'transparent',
  },
  sectionDesc: {
    fontSize: 12,
    marginTop: 2,
  },
  m3TonalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  m3TonalBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
