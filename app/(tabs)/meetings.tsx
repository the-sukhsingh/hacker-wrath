import React, { useState, useMemo, useCallback } from 'react';
import {
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, View } from '@/components/Themed';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMeetingStore } from '@/store/meetingStore';
import { MeetingCard } from '@/components/MeetingCard';
import { MeetingInviteModal } from '@/components/MeetingInviteModal';
import { AccountConnectCard } from '@/components/AccountConnectCard';
import { ManualMeetingModal } from '@/components/ManualMeetingModal';
import { SpecifyAccountModal } from '@/components/SpecifyAccountModal';
import { CreateVoiceRoomModal } from '@/components/CreateVoiceRoomModal';
import { JoinVoiceRoomModal } from '@/components/JoinVoiceRoomModal';
import { AccountProvider, Meeting } from '@/types/meeting';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import {
  connectCalendarAccount,
  syncCalendarAccount,
  disconnectCalendarAccount,
  syncAllCalendars,
} from '@/services/calendar/calendarSyncService';

interface WeekDay {
  dateString: string;
  dayName: string;
  dayNumber: number;
  isToday: boolean;
}

export default function ScheduledMeetingsScreen() {
  const router = useRouter();
  const theme = useColorScheme();
  const colors = Colors[theme];
  const insets = useSafeAreaInsets();

  const {
    meetings,
    connectedAccounts,
    activeRecording,
    settings,
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
  const [inviteModalMeeting, setInviteModalMeeting] = useState<Meeting | null>(null);
  const [dateTimePickerOpen, setDateTimePickerOpen] = useState(false);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState('09:00 am');
  const [createRoomModalOpen, setCreateRoomModalOpen] = useState(false);
  const [joinRoomModalOpen, setJoinRoomModalOpen] = useState(false);

  const formatLocalDate = (d: Date): string => {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const todayStr = useMemo(() => formatLocalDate(new Date()), []);
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  // Month navigation state
  const [displayedMonthDate, setDisplayedMonthDate] = useState(() => new Date());

  // Week strip calculation (Sun through Sat)
  const currentWeekDays = useMemo<WeekDay[]>(() => {
    const now = new Date();
    const currentDay = now.getDay();
    const sunday = new Date(now);
    sunday.setDate(now.getDate() - currentDay);

    const days: WeekDay[] = [];
    const dayNames = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

    for (let i = 0; i < 7; i++) {
      const d = new Date(sunday);
      d.setDate(sunday.getDate() + i);
      const localStr = formatLocalDate(d);
      days.push({
        dateString: localStr,
        dayName: dayNames[i],
        dayNumber: d.getDate(),
        isToday: localStr === todayStr,
      });
    }

    return days;
  }, [todayStr]);

  // Calendar month days calculation for Date & Time Picker bottom sheet
  const monthCalendarDays = useMemo(() => {
    const year = displayedMonthDate.getFullYear();
    const month = displayedMonthDate.getMonth();

    const firstDayIndex = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const cells: { dayNumber: number | null; dateString: string | null }[] = [];

    for (let i = 0; i < firstDayIndex; i++) {
      cells.push({ dayNumber: null, dateString: null });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({ dayNumber: d, dateString });
    }

    return cells;
  }, [displayedMonthDate]);

  const monthYearLabel = useMemo(() => {
    return displayedMonthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }, [displayedMonthDate]);

  const selectedDateMeetings = useMemo(() => {
    return meetings.filter((m) => m.date === selectedDate);
  }, [meetings, selectedDate]);

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

  const handleStartRecord = useCallback((meeting: Meeting) => {
    startRecordingSession(meeting.id, meeting.title);
    router.push('/record');
  }, [startRecordingSession, router]);

  const userInitials = (settings.userName || 'Launa Vendrick')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  return (
    <View style={[styles.screen, { backgroundColor: colors.background, paddingTop: Math.max(insets.top, 14) }]}>
      {/* 1. TOP HEADER (Avatar, Search & Add Button) */}
      <View style={styles.topHeader}>
        {/* User Avatar */}
        <TouchableOpacity
          onPress={() => router.push('/settings')}
          style={[styles.avatarCircle, { backgroundColor: colors.amber }]}>
          <Text style={styles.avatarInitials}>{userInitials}</Text>
        </TouchableOpacity>

        <View style={styles.headerRightActions}>
          <TouchableOpacity
            onPress={() => setCreateRoomModalOpen(true)}
            style={[styles.voiceRoomHeaderBtn, { backgroundColor: colors.primary }]}>
            <Ionicons name="radio" size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
            <Text style={styles.voiceRoomHeaderBtnText}>Voice Room</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setJoinRoomModalOpen(true)}
            style={[styles.headerIconBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="enter-outline" size={18} color={colors.text} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setManualModalOpen(true)}
            style={[styles.headerIconBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="add" size={20} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Screen Title */}
      <View style={styles.titleSection}>
        <Text style={[styles.screenTitle, { color: colors.text }]}>Scheduled Meetings</Text>
      </View>

      {/* 2. HORIZONTAL WEEK CALENDAR STRIP (As shown in UI Kit Image 1 & 2) */}
      <View style={styles.weekStripWrapper}>
        <View style={styles.weekStripContainer}>
          {currentWeekDays.map((item) => {
            const isSelected = item.dateString === selectedDate;
            return (
              <TouchableOpacity
                key={item.dateString}
                onPress={() => setSelectedDate(item.dateString)}
                style={[
                  styles.weekDayPill,
                  isSelected && {
                    backgroundColor: colors.text,
                    borderRadius: 16,
                  },
                ]}>
                <Text
                  style={[
                    styles.weekDayName,
                    { color: isSelected ? colors.surface : colors.textSecondary },
                  ]}>
                  {item.dayName}
                </Text>
                <Text
                  style={[
                    styles.weekDayNumber,
                    {
                      color: isSelected ? colors.surface : colors.text,
                      fontWeight: isSelected ? '800' : '600',
                    },
                  ]}>
                  {item.dayNumber}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Date & Time Picker trigger button */}
        <TouchableOpacity
          onPress={() => setDateTimePickerOpen(true)}
          style={[styles.pickerTriggerBtn, { backgroundColor: colors.surfaceContainer, borderColor: colors.border }]}>
          <Ionicons name="calendar-outline" size={14} color={colors.primary} style={{ marginRight: 4 }} />
          <Text style={[styles.pickerTriggerText, { color: colors.text }]}>Select Date & Time</Text>
          <Ionicons name="chevron-down" size={12} color={colors.textSecondary} style={{ marginLeft: 4 }} />
        </TouchableOpacity>
      </View>

      {/* Toast Notification */}
      {syncNotification && (
        <View style={[styles.toastBanner, { backgroundColor: colors.secondaryContainer, borderColor: colors.primary }]}>
          <Ionicons name="information-circle" size={16} color={colors.onSecondaryContainer} />
          <Text style={[styles.toastText, { color: colors.onSecondaryContainer }]}>{syncNotification}</Text>
        </View>
      )}

      {/* 3. MEETING CARDS LIST */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom + 90, 100) }]}>
        {selectedDateMeetings.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.emptyIconCircle, { backgroundColor: colors.surfaceContainer }]}>
              <Ionicons name="calendar-outline" size={32} color={colors.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No meetings scheduled</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              Add an agenda, connect your Google Calendar, or tap + to schedule a session.
            </Text>
            <TouchableOpacity
              onPress={() => setManualModalOpen(true)}
              style={[styles.addFirstMeetingBtn, { backgroundColor: colors.primary }]}>
              <Ionicons name="add" size={16} color="#FFFFFF" style={{ marginRight: 4 }} />
              <Text style={styles.addFirstMeetingBtnText}>Schedule Meeting</Text>
            </TouchableOpacity>
          </View>
        ) : (
          selectedDateMeetings.map((meeting) => (
            <MeetingCard
              key={meeting.id}
              meeting={meeting}
              isCurrentlyRecording={activeRecording.isRecording && activeRecording.meetingId === meeting.id}
              onPress={() => router.push({ pathname: '/meeting/[id]', params: { id: meeting.id } })}
              onRecordPress={() => handleStartRecord(meeting)}
              onInvitePress={() => setInviteModalMeeting(meeting)}
            />
          ))
        )}

        {/* 4. CONNECTED CALENDAR ACCOUNTS SECTION */}
        <View style={styles.accountsSection}>
          <View style={styles.sectionHeaderBetween}>
            <View>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Connected Calendars</Text>
              <Text style={[styles.sectionDesc, { color: colors.textSecondary }]}>
                Sync Google Calendar & Microsoft 365
              </Text>
            </View>

            <TouchableOpacity
              onPress={handleSyncAll}
              disabled={isSyncingAll}
              style={[styles.syncAllBtn, { backgroundColor: colors.coralLight }]}>
              <Ionicons name="sync" size={13} color={colors.coral} style={{ marginRight: 4 }} />
              <Text style={[styles.syncAllBtnText, { color: colors.coral }]}>
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

      {/* Date & Time Picker Bottom Sheet (Matching UI Kit Image 1) */}
      <Modal
        visible={dateTimePickerOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setDateTimePickerOpen(false)}>
        <View style={styles.pickerOverlay}>
          <View style={[styles.pickerCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.pickerHeaderRow}>
              <Text style={[styles.pickerTitle, { color: colors.text }]}>Select Date & Time</Text>
              <TouchableOpacity onPress={() => setDateTimePickerOpen(false)}>
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Month Calendar Grid */}
            <View style={[styles.monthCard, { backgroundColor: colors.surfaceContainer, borderColor: colors.border }]}>
              <View style={styles.monthLabelRow}>
                <Text style={[styles.monthLabelText, { color: colors.text }]}>{monthYearLabel}</Text>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  <TouchableOpacity
                    onPress={() => setDisplayedMonthDate(new Date(displayedMonthDate.getFullYear(), displayedMonthDate.getMonth() - 1, 1))}
                    style={styles.navBtn}>
                    <Ionicons name="chevron-back" size={16} color={colors.text} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setDisplayedMonthDate(new Date(displayedMonthDate.getFullYear(), displayedMonthDate.getMonth() + 1, 1))}
                    style={styles.navBtn}>
                    <Ionicons name="chevron-forward" size={16} color={colors.text} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Day header row */}
              <View style={styles.calendarDayHeaderRow}>
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, idx) => (
                  <Text key={idx} style={[styles.calendarDayHeaderText, { color: colors.textSecondary }]}>
                    {d}
                  </Text>
                ))}
              </View>

              {/* Day numbers grid */}
              <View style={styles.calendarDayGrid}>
                {monthCalendarDays.map((cell, idx) => {
                  if (!cell.dayNumber || !cell.dateString) {
                    return <View key={idx} style={styles.emptyGridCell} />;
                  }

                  const isSelected = cell.dateString === selectedDate;
                  return (
                    <TouchableOpacity
                      key={cell.dateString}
                      onPress={() => setSelectedDate(cell.dateString!)}
                      style={[
                        styles.gridDayCell,
                        isSelected && {
                          backgroundColor: colors.coral,
                          borderRadius: 16,
                        },
                      ]}>
                      <Text
                        style={[
                          styles.gridDayText,
                          {
                            color: isSelected ? '#FFFFFF' : colors.text,
                            fontWeight: isSelected ? '700' : '500',
                          },
                        ]}>
                        {cell.dayNumber}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Time Zone Selector */}
            <Text style={[styles.pickerSubheading, { color: colors.textSecondary }]}>Select Time Zone</Text>
            <View style={[styles.timeZoneBox, { backgroundColor: colors.surfaceContainer, borderColor: colors.border }]}>
              <Ionicons name="globe-outline" size={16} color={colors.primary} style={{ marginRight: 8 }} />
              <Text style={[styles.timeZoneText, { color: colors.text }]}>Jakarta Time Zone (GMT +07)</Text>
              <Ionicons name="chevron-down" size={14} color={colors.textSecondary} style={{ marginLeft: 'auto' }} />
            </View>

            {/* Time Slots */}
            <Text style={[styles.pickerSubheading, { color: colors.textSecondary }]}>Select Time</Text>
            <View style={styles.timeSlotsRow}>
              {['08:00 am', '09:00 am', '10:00 am', '02:00 pm'].map((slot) => {
                const isSlotSelected = selectedTimeSlot === slot;
                return (
                  <TouchableOpacity
                    key={slot}
                    onPress={() => setSelectedTimeSlot(slot)}
                    style={[
                      styles.timeSlotPill,
                      {
                        backgroundColor: isSlotSelected ? colors.coral : colors.surfaceContainer,
                        borderColor: isSlotSelected ? colors.coral : colors.border,
                      },
                    ]}>
                    <Text
                      style={[
                        styles.timeSlotText,
                        {
                          color: isSlotSelected ? '#FFFFFF' : colors.text,
                          fontWeight: isSlotSelected ? '700' : '500',
                        },
                      ]}>
                      {slot}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Confirm button */}
            <TouchableOpacity
              onPress={() => setDateTimePickerOpen(false)}
              style={[styles.confirmPickerBtn, { backgroundColor: colors.primary }]}>
              <Text style={styles.confirmPickerBtnText}>Confirm Date & Time</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

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

      {/* Meeting Invite / QR Modal */}
      <MeetingInviteModal
        visible={inviteModalMeeting !== null}
        meeting={inviteModalMeeting}
        onClose={() => setInviteModalMeeting(null)}
      />

      {/* Create Voice Room Modal */}
      <CreateVoiceRoomModal
        visible={createRoomModalOpen}
        onClose={() => setCreateRoomModalOpen(false)}
      />

      {/* Join Voice Room Modal */}
      <JoinVoiceRoomModal
        visible={joinRoomModalOpen}
        onClose={() => setJoinRoomModalOpen(false)}
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
    paddingTop: 8,
    paddingBottom: 4,
    backgroundColor: 'transparent',
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  avatarInitials: {
    fontSize: 15,
    fontWeight: '800',
    color: '#3D2E00',
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'transparent',
  },
  voiceRoomHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 38,
    borderRadius: 19,
    shadowColor: '#E06D53',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  voiceRoomHeaderBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  headerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  titleSection: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 12,
    backgroundColor: 'transparent',
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  weekStripWrapper: {
    paddingHorizontal: 20,
    marginBottom: 16,
    backgroundColor: 'transparent',
  },
  weekStripContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'transparent',
    marginBottom: 10,
  },
  weekDayPill: {
    width: 42,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekDayName: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  weekDayNumber: {
    fontSize: 15,
  },
  pickerTriggerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  pickerTriggerText: {
    fontSize: 12,
    fontWeight: '600',
  },
  toastBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 20,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
  },
  toastText: {
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  emptyCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  emptyIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  addFirstMeetingBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
  },
  addFirstMeetingBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  accountsSection: {
    marginTop: 16,
    backgroundColor: 'transparent',
  },
  sectionHeaderBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    backgroundColor: 'transparent',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  sectionDesc: {
    fontSize: 12,
    marginTop: 2,
  },
  syncAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
  },
  syncAllBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  pickerCard: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    elevation: 16,
  },
  pickerHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: 'transparent',
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  monthCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    marginBottom: 16,
  },
  monthLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    backgroundColor: 'transparent',
  },
  monthLabelText: {
    fontSize: 15,
    fontWeight: '700',
  },
  navBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarDayHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    backgroundColor: 'transparent',
  },
  calendarDayHeaderText: {
    width: 36,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '600',
  },
  calendarDayGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    backgroundColor: 'transparent',
  },
  emptyGridCell: {
    width: 36,
    height: 36,
  },
  gridDayCell: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 2,
  },
  gridDayText: {
    fontSize: 13,
  },
  pickerSubheading: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  timeZoneBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
  },
  timeZoneText: {
    fontSize: 13,
    fontWeight: '500',
  },
  timeSlotsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 22,
    backgroundColor: 'transparent',
  },
  timeSlotPill: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeSlotText: {
    fontSize: 12,
  },
  confirmPickerBtn: {
    borderRadius: 24,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#E06D53',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  confirmPickerBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
});
