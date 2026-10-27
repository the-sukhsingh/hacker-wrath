import React, { useState } from 'react';
import {
  StyleSheet,
  Modal,
  TouchableOpacity,
  Share,
  Clipboard,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Text, View } from './Themed';
import { Ionicons } from '@expo/vector-icons';
import { Meeting } from '@/types/meeting';
import Colors from '@/constants/Colors';
import { useColorScheme } from './useColorScheme';
import { QRCodeView } from './ui/QRCodeView';
import { useVoiceRoomStore } from '@/store/voiceRoomStore';

interface MeetingInviteModalProps {
  visible: boolean;
  meeting: Meeting | null;
  onClose: () => void;
  onLaunchVoiceRoom?: (roomCode: string) => void;
}

export function MeetingInviteModal({
  visible,
  meeting,
  onClose,
  onLaunchVoiceRoom,
}: MeetingInviteModalProps) {
  const router = useRouter();
  const theme = useColorScheme();
  const colors = Colors[theme];
  const [copied, setCopied] = useState(false);
  const { createRoom } = useVoiceRoomStore();

  if (!meeting) return null;

  const roomCode = meeting.id.replace('meet-', '').slice(0, 6).toUpperCase();
  const meetingUrl = meeting.meetingUrl || `https://meetanotes.io/room/${roomCode}`;

  const handleCopyLink = () => {
    Clipboard.setString(meetingUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleShare = async () => {
    try {
      await Share.share({
        title: meeting.title,
        message: `Join voice meeting "${meeting.title}" on MeetaNotes (Code: ${roomCode}): ${meetingUrl}`,
        url: meetingUrl,
      });
      onClose();
    } catch {
      // Ignored
    }
  };

  const handleStartVoiceRoom = () => {
    onClose();
    const room = createRoom(meeting.title, {
      linkedMeetingId: meeting.id,
      topic: meeting.agenda || 'Scheduled Discussion',
    });
    if (onLaunchVoiceRoom) {
      onLaunchVoiceRoom(room.code);
    } else {
      router.push({
        pathname: '/meeting/room',
        params: { id: room.id, code: room.code },
      });
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheetCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View>
              <Text style={[styles.headerTitle, { color: colors.text }]}>Invite for Voice Meeting</Text>
              <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
                Scan with any phone camera or share link
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Olive Green Card with Title and Scannable QR Code */}
          <View style={[styles.qrCard, { backgroundColor: colors.olive }]}>
            <View style={styles.qrCardLeft}>
              <View style={styles.roomCodePill}>
                <Ionicons name="radio" size={12} color="#FFFFFF" style={{ marginRight: 4 }} />
                <Text style={styles.roomCodeText}>CODE: {roomCode}</Text>
              </View>
              <Text style={styles.qrCardTitle} numberOfLines={2}>
                {meeting.title}
              </Text>
              <Text style={styles.qrCardSubtitle}>
                {meeting.date} • {meeting.startTime}
              </Text>
            </View>

            {/* Real Scannable QR Code */}
            <View style={styles.qrCodeWrapper}>
              <QRCodeView
                value={meetingUrl}
                size={84}
                color="#111827"
                backgroundColor="#FFFFFF"
                showCenterLogo={true}
                logoLetter="M"
                logoBgColor={colors.coral}
              />
            </View>
          </View>

          {/* Copyable Link Input Row */}
          <View style={[styles.linkInputRow, { backgroundColor: colors.surfaceContainer, borderColor: colors.border }]}>
            <Ionicons name="link-outline" size={16} color={colors.textSecondary} style={{ marginRight: 8 }} />
            <Text style={[styles.linkInputText, { color: colors.text }]} numberOfLines={1}>
              {meetingUrl}
            </Text>
            <TouchableOpacity
              onPress={handleCopyLink}
              style={[styles.copyBtn, { backgroundColor: copied ? colors.secondaryContainer : colors.surface }]}>
              <Ionicons
                name={copied ? 'checkmark' : 'copy-outline'}
                size={16}
                color={copied ? colors.onSecondaryContainer : colors.primary}
              />
            </TouchableOpacity>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              onPress={handleStartVoiceRoom}
              style={[styles.startRoomBtn, { backgroundColor: colors.primary }]}>
              <Ionicons name="mic" size={17} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.startRoomBtnText}>Launch Voice Room</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleShare}
              style={[styles.secondaryShareBtn, { borderColor: colors.border, backgroundColor: colors.surface }]}>
              <Ionicons name="share-social-outline" size={16} color={colors.text} style={{ marginRight: 6 }} />
              <Text style={[styles.secondaryShareBtnText, { color: colors.text }]}>Share Link & Code</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  sheetCard: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    elevation: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    backgroundColor: 'transparent',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: '400',
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrCard: {
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  qrCardLeft: {
    flex: 1,
    paddingRight: 12,
    backgroundColor: 'transparent',
  },
  roomCodePill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    marginBottom: 8,
  },
  roomCodeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  qrCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    lineHeight: 20,
    marginBottom: 4,
  },
  qrCardSubtitle: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
  },
  qrCodeWrapper: {
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    padding: 4,
  },
  linkInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginBottom: 16,
  },
  linkInputText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    marginRight: 8,
  },
  copyBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  actionRow: {
    backgroundColor: 'transparent',
    gap: 10,
    marginBottom: Platform.OS === 'ios' ? 14 : 6,
  },
  startRoomBtn: {
    flexDirection: 'row',
    borderRadius: 22,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#E06D53',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  startRoomBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  secondaryShareBtn: {
    flexDirection: 'row',
    borderRadius: 22,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  secondaryShareBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
