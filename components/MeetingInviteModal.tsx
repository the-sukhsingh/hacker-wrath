import React, { useState } from 'react';
import {
  StyleSheet,
  Modal,
  TouchableOpacity,
  Share,
  Clipboard,
  Platform,
} from 'react-native';
import { Text, View } from './Themed';
import { Ionicons } from '@expo/vector-icons';
import { Meeting } from '@/types/meeting';
import Colors from '@/constants/Colors';
import { useColorScheme } from './useColorScheme';

interface MeetingInviteModalProps {
  visible: boolean;
  meeting: Meeting | null;
  onClose: () => void;
}

export function MeetingInviteModal({ visible, meeting, onClose }: MeetingInviteModalProps) {
  const theme = useColorScheme();
  const colors = Colors[theme];
  const [copied, setCopied] = useState(false);

  if (!meeting) return null;

  const meetingUrl = meeting.meetingUrl || `https://meetanotes.io/${meeting.id.replace('meet-', '')}`;

  const handleCopyLink = () => {
    Clipboard.setString(meetingUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleShare = async () => {
    try {
      await Share.share({
        title: meeting.title,
        message: `Join meeting "${meeting.title}" on MeetaNotes: ${meetingUrl}`,
        url: meetingUrl,
      });
      onClose();
    } catch {
      // Ignored
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheetCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {/* Header */}
          <View style={styles.headerRow}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Invite for Meeting</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Olive Green Card with Title and Stylized QR Code (From UI Kit Image 2) */}
          <View style={[styles.qrCard, { backgroundColor: colors.olive }]}>
            <View style={styles.qrCardLeft}>
              <Text style={styles.qrCardTitle} numberOfLines={2}>
                {meeting.title}
              </Text>
              <Text style={styles.qrCardSubtitle}>
                {meeting.date} • {meeting.startTime}
              </Text>
            </View>

            {/* Stylized QR Code Box */}
            <View style={styles.qrCodeBox}>
              <View style={styles.qrGridPattern}>
                {/* 3 corner squares simulating standard QR markers */}
                <View style={[styles.qrCornerSquare, { top: 6, left: 6 }]} />
                <View style={[styles.qrCornerSquare, { top: 6, right: 6 }]} />
                <View style={[styles.qrCornerSquare, { bottom: 6, left: 6 }]} />
                {/* Center MeetaNotes 'M' logo badge */}
                <View style={[styles.qrCenterBadge, { backgroundColor: colors.coral }]}>
                  <Text style={styles.qrLogoLetter}>M</Text>
                </View>
                {/* Visual QR dots */}
                <View style={[styles.qrDot, { top: 16, left: 24 }]} />
                <View style={[styles.qrDot, { top: 28, left: 16 }]} />
                <View style={[styles.qrDot, { top: 40, right: 20 }]} />
                <View style={[styles.qrDot, { bottom: 16, right: 16 }]} />
              </View>
            </View>
          </View>

          {/* Copyable Link Input Row */}
          <View style={[styles.linkInputRow, { backgroundColor: colors.surfaceContainer, borderColor: colors.border }]}>
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
              onPress={handleShare}
              style={[styles.primaryContinueBtn, { backgroundColor: colors.primary }]}>
              <Text style={styles.primaryContinueBtnText}>Share Invitation</Text>
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
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: 'transparent',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
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
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  qrCardLeft: {
    flex: 1,
    paddingRight: 12,
    backgroundColor: 'transparent',
  },
  qrCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    lineHeight: 22,
    marginBottom: 6,
  },
  qrCardSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
  },
  qrCodeBox: {
    width: 80,
    height: 80,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    padding: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrGridPattern: {
    width: '100%',
    height: '100%',
    position: 'relative',
    backgroundColor: 'transparent',
  },
  qrCornerSquare: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderWidth: 3,
    borderColor: '#111827',
    borderRadius: 3,
  },
  qrCenterBadge: {
    position: 'absolute',
    top: 24,
    left: 24,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrLogoLetter: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
  },
  qrDot: {
    position: 'absolute',
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#111827',
  },
  linkInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 20,
  },
  linkInputText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    marginRight: 8,
  },
  copyBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  actionRow: {
    backgroundColor: 'transparent',
    marginBottom: Platform.OS === 'ios' ? 14 : 6,
  },
  primaryContinueBtn: {
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
  primaryContinueBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
});
