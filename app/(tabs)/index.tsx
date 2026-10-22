import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, View } from '@/components/Themed';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMeetingStore } from '@/store/meetingStore';
import { MeetingCard } from '@/components/MeetingCard';
import { ManualMeetingModal } from '@/components/ManualMeetingModal';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { Meeting } from '@/types/meeting';

interface WeekDay {
  dateString: string;
  dayName: string;
  dayNumber: number;
  isToday: boolean;
}

export default function DashboardScreen() {
  const router = useRouter();
  const theme = useColorScheme();
  const colors = Colors[theme];
  const insets = useSafeAreaInsets();

  const {
    meetings,
    activeRecording,
    addMeeting,
    startRecordingSession,
  } = useMeetingStore();

  const [manualModalOpen, setManualModalOpen] = useState(false);

  const formatLocalDate = (d: Date): string => {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const todayStr = useMemo(() => formatLocalDate(new Date()), []);
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  const currentWeekDays = useMemo<WeekDay[]>(() => {
    const now = new Date();
    const currentDay = now.getDay();
    const distanceToMonday = currentDay === 0 ? -6 : 1 - currentDay;

    const monday = new Date(now);
    monday.setDate(now.getDate() + distanceToMonday);

    const days: WeekDay[] = [];
    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
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

  const selectedDateMeetings = useMemo(() => {
    return meetings.filter((m) => m.date === selectedDate);
  }, [meetings, selectedDate]);

  const selectedDateLabel = useMemo(() => {
    const [year, month, day] = selectedDate.split('-').map(Number);
    const d = new Date(year, month - 1, day);
    if (selectedDate === todayStr) {
      return `Today, ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
    }
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  }, [selectedDate, todayStr]);

  const handleStartRecording = (meeting?: Meeting) => {
    if (meeting) {
      startRecordingSession(meeting.id, meeting.title);
    } else {
      startRecordingSession(undefined, 'Quick Note Session');
    }
    router.push('/record');
  };

  const currentMonthYear = useMemo(() => {
    return new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }, []);

  return (
    <View style={[styles.screen, { backgroundColor: colors.background, paddingTop: Math.max(insets.top, 16) }]}>
      {/* M3 Large Top App Bar */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.monthText, { color: colors.onSurfaceVariant }]}>{currentMonthYear}</Text>
          <Text style={[styles.headerTitle, { color: colors.onSurface }]}>Agenda</Text>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity
            onPress={() => setManualModalOpen(true)}
            style={[styles.m3IconBtn, { backgroundColor: colors.surfaceContainerHigh }]}>
            <Ionicons name="add" size={22} color={colors.onSurface} />
          </TouchableOpacity>
        </View>
      </View>

      {/* M3 Horizontal Week Strip */}
      <View style={styles.weekStrip}>
        {currentWeekDays.map((item) => {
          const isSelected = item.dateString === selectedDate;
          return (
            <TouchableOpacity
              key={item.dateString}
              onPress={() => setSelectedDate(item.dateString)}
              style={[
                styles.dayCard,
                {
                  backgroundColor: isSelected
                    ? colors.secondaryContainer
                    : colors.surfaceContainerLow,
                  borderColor: isSelected ? colors.primary : colors.outlineVariant,
                },
              ]}>
              <Text
                style={[
                  styles.dayName,
                  {
                    color: isSelected
                      ? colors.onSecondaryContainer
                      : colors.onSurfaceVariant,
                    fontWeight: isSelected ? '700' : '500',
                  },
                ]}>
                {item.dayName}
              </Text>
              <Text
                style={[
                  styles.dayNumber,
                  {
                    color: isSelected
                      ? colors.onSecondaryContainer
                      : colors.onSurface,
                    fontWeight: isSelected ? '800' : '600',
                  },
                ]}>
                {item.dayNumber}
              </Text>
              {item.isToday && (
                <View
                  style={[
                    styles.todayIndicatorDot,
                    { backgroundColor: isSelected ? colors.primary : colors.primary },
                  ]}
                />
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Meetings for Selected Date */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}>
        <View style={styles.dateSectionHeader}>
          <Text style={[styles.dateSectionTitle, { color: colors.onSurface }]}>
            {selectedDateLabel}
          </Text>
          <View style={[styles.countBadge, { backgroundColor: colors.surfaceContainerHigh }]}>
            <Text style={[styles.meetingCount, { color: colors.onSurfaceVariant }]}>
              {selectedDateMeetings.length} {selectedDateMeetings.length === 1 ? 'meeting' : 'meetings'}
            </Text>
          </View>
        </View>

        {selectedDateMeetings.length === 0 ? (
          <View style={[styles.emptyContainer, { backgroundColor: colors.surfaceContainerLow, borderColor: colors.outlineVariant }]}>
            <View style={[styles.emptyIconCircle, { backgroundColor: colors.surfaceContainerHigh }]}>
              <Ionicons name="calendar-outline" size={32} color={colors.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.onSurface }]}>No meetings scheduled</Text>
            <Text style={[styles.emptySubtitle, { color: colors.onSurfaceVariant }]}>
              Keep track of discussions, assignees, and real-time transcripts for this day.
            </Text>
            <View style={styles.emptyActionsRow}>
              <TouchableOpacity
                onPress={() => setManualModalOpen(true)}
                style={[styles.m3FilledBtn, { backgroundColor: colors.primary }]}>
                <Ionicons name="add" size={16} color={colors.onPrimary} style={{ marginRight: 4 }} />
                <Text style={[styles.m3FilledBtnText, { color: colors.onPrimary }]}>Add Meeting</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => router.push('/meetings')}
                style={[styles.m3TonalBtn, { backgroundColor: colors.secondaryContainer }]}>
                <Ionicons name="sync" size={14} color={colors.onSecondaryContainer} style={{ marginRight: 6 }} />
                <Text style={[styles.m3TonalBtnText, { color: colors.onSecondaryContainer }]}>Sync Calendar</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          selectedDateMeetings.map((meeting) => (
            <MeetingCard
              key={meeting.id}
              meeting={meeting}
              isCurrentlyRecording={
                activeRecording.isRecording && activeRecording.meetingId === meeting.id
              }
              onPress={() => router.push({ pathname: '/meeting/[id]', params: { id: meeting.id } })}
              onRecordPress={() => handleStartRecording(meeting)}
            />
          ))
        )}
      </ScrollView>

      {/* Manual Meeting Creation Modal */}
      <ManualMeetingModal
        visible={manualModalOpen}
        onClose={() => setManualModalOpen(false)}
        onSubmit={(newMeeting) => {
          addMeeting(newMeeting);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 14,
    backgroundColor: 'transparent',
  },
  monthText: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'transparent',
  },
  m3IconBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 14,
    backgroundColor: 'transparent',
    gap: 6,
  },
  dayCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  dayName: {
    fontSize: 11,
    marginBottom: 4,
  },
  dayNumber: {
    fontSize: 16,
  },
  todayIndicatorDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginTop: 4,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 30,
  },
  dateSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    backgroundColor: 'transparent',
  },
  dateSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  countBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  meetingCount: {
    fontSize: 11,
    fontWeight: '600',
  },
  emptyContainer: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  emptyIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 20,
  },
  emptyActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'transparent',
  },
  m3FilledBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 20,
  },
  m3FilledBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  m3TonalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 20,
  },
  m3TonalBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
