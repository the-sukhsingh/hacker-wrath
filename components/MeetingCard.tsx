import React from 'react';
import { StyleSheet, Pressable, TouchableOpacity } from 'react-native';
import { Text, View } from './Themed';
import { Ionicons } from '@expo/vector-icons';
import { Meeting, PlatformType } from '@/types/meeting';
import Colors from '@/constants/Colors';
import { useColorScheme } from './useColorScheme';

interface MeetingCardProps {
  meeting: Meeting;
  onPress?: () => void;
  onRecordPress?: () => void;
  isCurrentlyRecording?: boolean;
}

export function MeetingCard({
  meeting,
  onPress,
  onRecordPress,
  isCurrentlyRecording = false,
}: MeetingCardProps) {
  const theme = useColorScheme();
  const colors = Colors[theme];

  const getPlatformIcon = (platform: PlatformType): { name: any; color: string; label: string } => {
    switch (platform) {
      case 'google_meet':
        return { name: 'videocam', color: '#1A73E8', label: 'Google Meet' };
      case 'zoom':
        return { name: 'videocam-outline', color: '#1D4ED8', label: 'Zoom' };
      case 'teams':
        return { name: 'people', color: '#5B5FC7', label: 'Teams' };
      case 'in_person':
        return { name: 'location', color: '#D97706', label: 'In Person' };
      default:
        return { name: 'calendar', color: colors.onSurfaceVariant, label: 'Meeting' };
    }
  };

  const platformInfo = getPlatformIcon(meeting.platform);
  const hasRecording = meeting.recordingIds && meeting.recordingIds.length > 0;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.m3Card,
        {
          backgroundColor: isCurrentlyRecording ? colors.surfaceContainerHighest : colors.surfaceContainerLow,
          borderColor: isCurrentlyRecording ? colors.error : colors.outlineVariant,
          transform: [{ scale: pressed ? 0.985 : 1 }],
        },
      ]}>
      {/* Top Meta Bar */}
      <View style={styles.topBar}>
        <View style={styles.timeTag}>
          <Ionicons name="time-outline" size={13} color={colors.onSurfaceVariant} />
          <Text style={[styles.timeText, { color: colors.onSurfaceVariant }]}>
            {meeting.startTime} – {meeting.endTime} ({meeting.durationMinutes}m)
          </Text>
        </View>

        <View style={[styles.m3Chip, { backgroundColor: colors.surfaceContainerHigh }]}>
          <Ionicons name={platformInfo.name} size={11} color={platformInfo.color} style={{ marginRight: 4 }} />
          <Text style={[styles.platformText, { color: colors.onSurface }]}>
            {platformInfo.label}
          </Text>
        </View>
      </View>

      {/* Meeting Title */}
      <Text style={[styles.title, { color: colors.onSurface }]} numberOfLines={2}>
        {meeting.title}
      </Text>

      {/* Agenda Snippet if present */}
      {meeting.agenda ? (
        <Text style={[styles.agenda, { color: colors.onSurfaceVariant }]} numberOfLines={2}>
          {meeting.agenda}
        </Text>
      ) : null}

      {/* Attendees and Actions Bar */}
      <View style={styles.footerBar}>
        <View style={styles.attendeesContainer}>
          <Ionicons name="people-outline" size={13} color={colors.onSurfaceVariant} style={{ marginRight: 4 }} />
          <Text style={[styles.attendeesText, { color: colors.onSurfaceVariant }]} numberOfLines={1}>
            {meeting.attendees.length > 0
              ? `${meeting.attendees[0]}${meeting.attendees.length > 1 ? ` +${meeting.attendees.length - 1}` : ''}`
              : 'No attendees listed'}
          </Text>
        </View>

        {onRecordPress ? (
          <TouchableOpacity
            onPress={onRecordPress}
            style={[
              styles.m3Button,
              {
                backgroundColor: isCurrentlyRecording
                  ? colors.error
                  : hasRecording
                  ? colors.surfaceContainerHigh
                  : colors.primary,
              },
            ]}>
            <Ionicons
              name={isCurrentlyRecording ? 'radio' : hasRecording ? 'document-text-outline' : 'mic'}
              size={13}
              color={
                isCurrentlyRecording
                  ? colors.onError
                  : hasRecording
                  ? colors.onSurface
                  : colors.onPrimary
              }
              style={{ marginRight: 5 }}
            />
            <Text
              style={[
                styles.m3ButtonText,
                {
                  color: isCurrentlyRecording
                    ? colors.onError
                    : hasRecording
                    ? colors.onSurface
                    : colors.onPrimary,
                },
              ]}>
              {isCurrentlyRecording ? 'Live' : hasRecording ? 'View Note' : 'Record'}
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  m3Card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    backgroundColor: 'transparent',
  },
  timeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'transparent',
  },
  timeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  m3Chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  platformText: {
    fontSize: 11,
    fontWeight: '600',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.1,
    lineHeight: 22,
    marginBottom: 6,
  },
  agenda: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  footerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    backgroundColor: 'transparent',
  },
  attendeesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
    backgroundColor: 'transparent',
  },
  attendeesText: {
    fontSize: 12,
    fontWeight: '500',
  },
  m3Button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 20,
  },
  m3ButtonText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
