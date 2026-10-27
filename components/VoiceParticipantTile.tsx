import React, { useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSpring,
  Easing,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { VoiceRoomParticipant } from '@/types/voiceRoom';
import Colors from '@/constants/Colors';
import { useColorScheme } from './useColorScheme';

interface VoiceParticipantTileProps {
  participant: VoiceRoomParticipant;
  isCurrentUser: boolean;
  onPress?: () => void;
}

export function VoiceParticipantTile({
  participant,
  isCurrentUser,
  onPress,
}: VoiceParticipantTileProps) {
  const theme = useColorScheme();
  const colors = Colors[theme];

  const pulseScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(0);

  useEffect(() => {
    if (participant.isSpeaking && !participant.isMuted) {
      pulseScale.value = withRepeat(
        withTiming(1.35, { duration: 900, easing: Easing.out(Easing.ease) }),
        -1,
        false
      );
      pulseOpacity.value = withRepeat(
        withTiming(0, { duration: 900, easing: Easing.out(Easing.ease) }),
        -1,
        false
      );
    } else {
      pulseScale.value = withSpring(1);
      pulseOpacity.value = withTiming(0, { duration: 200 });
    }
  }, [participant.isSpeaking, participant.isMuted, pulseScale, pulseOpacity]);

  const animatedRippleStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: pulseScale.value }],
      opacity: pulseOpacity.value,
    };
  });

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={[
        styles.tileContainer,
        {
          backgroundColor: colors.surface,
          borderColor: participant.isSpeaking ? colors.coral : colors.border,
          borderWidth: participant.isSpeaking ? 2 : 1,
        },
      ]}>
      {/* Hand Raised Banner */}
      {participant.handRaised && (
        <View style={styles.handRaisedPill}>
          <Text style={styles.handRaisedEmoji}>✋</Text>
          <Text style={styles.handRaisedText}>Hand Raised</Text>
        </View>
      )}

      {/* Avatar with Animated Speaking Ring */}
      <View style={styles.avatarWrapper}>
        {/* Outer Ripple Wave */}
        <Animated.View
          style={[
            styles.rippleRing,
            animatedRippleStyle,
            {
              backgroundColor: colors.coralLight,
              borderColor: colors.coral,
            },
          ]}
        />

        {/* Core Avatar Circle */}
        <View style={[styles.avatarCircle, { backgroundColor: participant.avatarColor }]}>
          <Text style={styles.avatarInitials}>{participant.initials}</Text>
        </View>

        {/* Mic Status Badge */}
        <View
          style={[
            styles.micBadge,
            {
              backgroundColor: participant.isMuted ? '#EF4444' : colors.primary,
            },
          ]}>
          <Ionicons
            name={participant.isMuted ? 'mic-off' : 'mic'}
            size={11}
            color="#FFFFFF"
          />
        </View>
      </View>

      {/* Name & Role */}
      <View style={styles.infoColumn}>
        <Text style={[styles.participantName, { color: colors.text }]} numberOfLines={1}>
          {participant.name} {isCurrentUser ? '(You)' : ''}
        </Text>

        <View style={styles.roleRow}>
          {participant.role === 'host' ? (
            <View style={[styles.roleBadge, { backgroundColor: colors.coralLight }]}>
              <Text style={[styles.roleText, { color: colors.coral }]}>Host</Text>
            </View>
          ) : (
            <View style={[styles.roleBadge, { backgroundColor: colors.surfaceContainer }]}>
              <Text style={[styles.roleText, { color: colors.textSecondary }]}>
                {participant.role === 'speaker' ? 'Speaker' : 'Listener'}
              </Text>
            </View>
          )}

          {participant.isSpeaking && (
            <View style={styles.speakingIndicatorRow}>
              <View style={[styles.speakingBar, { height: 10, backgroundColor: colors.coral }]} />
              <View style={[styles.speakingBar, { height: 14, backgroundColor: colors.coral }]} />
              <View style={[styles.speakingBar, { height: 8, backgroundColor: colors.coral }]} />
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  tileContainer: {
    borderRadius: 20,
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    elevation: 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    minHeight: 145,
  },
  handRaisedPill: {
    position: 'absolute',
    top: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3D6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    zIndex: 5,
  },
  handRaisedEmoji: {
    fontSize: 11,
    marginRight: 4,
  },
  handRaisedText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#8C6C26',
  },
  avatarWrapper: {
    width: 68,
    height: 68,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginTop: 6,
    marginBottom: 8,
  },
  rippleRing: {
    position: 'absolute',
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 1.5,
  },
  avatarCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  avatarInitials: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  micBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    elevation: 4,
  },
  infoColumn: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  participantName: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: -0.2,
    marginBottom: 4,
    textAlign: 'center',
  },
  roleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  roleBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  roleText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
  speakingIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 14,
    gap: 2,
  },
  speakingBar: {
    width: 2.5,
    borderRadius: 1.5,
  },
});
