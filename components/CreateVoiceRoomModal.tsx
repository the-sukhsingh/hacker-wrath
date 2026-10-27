import React, { useState } from 'react';
import {
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Text, View } from './Themed';
import { Ionicons } from '@expo/vector-icons';
import { useVoiceRoomStore } from '@/store/voiceRoomStore';
import Colors from '@/constants/Colors';
import { useColorScheme } from './useColorScheme';

interface CreateVoiceRoomModalProps {
  visible: boolean;
  onClose: () => void;
  onRoomCreated?: (roomId: string, roomCode: string) => void;
}

export function CreateVoiceRoomModal({
  visible,
  onClose,
  onRoomCreated,
}: CreateVoiceRoomModalProps) {
  const router = useRouter();
  const theme = useColorScheme();
  const colors = Colors[theme];
  const { createRoom } = useVoiceRoomStore();

  const [title, setTitle] = useState('');
  const [topic, setTopic] = useState('');

  const handleCreate = () => {
    const roomTitle = title.trim() || 'Instant Voice Meeting';
    const room = createRoom(roomTitle, { topic: topic.trim() || undefined });
    setTitle('');
    setTopic('');
    onClose();

    if (onRoomCreated) {
      onRoomCreated(room.id, room.code);
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
            <View style={styles.headerLeft}>
              <View style={[styles.iconBadge, { backgroundColor: colors.coralLight }]}>
                <Ionicons name="mic" size={18} color={colors.coral} />
              </View>
              <View>
                <Text style={[styles.titleText, { color: colors.text }]}>Create Voice Room</Text>
                <Text style={[styles.subtitleText, { color: colors.textSecondary }]}>
                  High-fidelity audio room with live AI notes
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Form Fields */}
          <View style={styles.formContainer}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>ROOM TITLE</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. Design Architecture Review"
              placeholderTextColor={colors.textMuted}
              style={[
                styles.textInput,
                {
                  backgroundColor: colors.surfaceContainer,
                  borderColor: colors.border,
                  color: colors.text,
                },
              ]}
            />

            <Text style={[styles.inputLabel, { color: colors.textSecondary, marginTop: 14 }]}>
              DISCUSSION TOPIC / AGENDA (OPTIONAL)
            </Text>
            <TextInput
              value={topic}
              onChangeText={setTopic}
              placeholder="e.g. Sprint Priorities, WebRTC audio migration"
              placeholderTextColor={colors.textMuted}
              style={[
                styles.textInput,
                {
                  backgroundColor: colors.surfaceContainer,
                  borderColor: colors.border,
                  color: colors.text,
                },
              ]}
            />

            {/* Feature Highlights */}
            <View style={[styles.featureHighlightBox, { backgroundColor: colors.surfaceContainerLow }]}>
              <View style={styles.featureItem}>
                <Ionicons name="flash-outline" size={15} color={colors.coral} style={{ marginRight: 6 }} />
                <Text style={[styles.featureText, { color: colors.text }]}>Instant peer voice streaming</Text>
              </View>
              <View style={styles.featureItem}>
                <Ionicons name="sparkles-outline" size={15} color={colors.coral} style={{ marginRight: 6 }} />
                <Text style={[styles.featureText, { color: colors.text }]}>Live real-time transcription</Text>
              </View>
              <View style={styles.featureItem}>
                <Ionicons name="qr-code-outline" size={15} color={colors.coral} style={{ marginRight: 6 }} />
                <Text style={[styles.featureText, { color: colors.text }]}>Share via QR Code & direct link</Text>
              </View>
            </View>
          </View>

          {/* Action Row */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              onPress={handleCreate}
              style={[styles.createBtn, { backgroundColor: colors.primary }]}>
              <Ionicons name="radio" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.createBtnText}>Start Voice Room</Text>
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
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'transparent',
  },
  iconBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleText: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  subtitleText: {
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
  formContainer: {
    backgroundColor: 'transparent',
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  textInput: {
    height: 48,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 14,
    fontWeight: '500',
  },
  featureHighlightBox: {
    borderRadius: 16,
    padding: 14,
    marginTop: 16,
    gap: 8,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  featureText: {
    fontSize: 12,
    fontWeight: '500',
  },
  actionRow: {
    backgroundColor: 'transparent',
    marginBottom: Platform.OS === 'ios' ? 14 : 6,
  },
  createBtn: {
    flexDirection: 'row',
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
  createBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
});
