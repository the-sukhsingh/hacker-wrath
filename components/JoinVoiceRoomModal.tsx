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

interface JoinVoiceRoomModalProps {
  visible: boolean;
  onClose: () => void;
  onRoomJoined?: (roomId: string, roomCode: string) => void;
}

export function JoinVoiceRoomModal({
  visible,
  onClose,
  onRoomJoined,
}: JoinVoiceRoomModalProps) {
  const router = useRouter();
  const theme = useColorScheme();
  const colors = Colors[theme];
  const { joinRoom } = useVoiceRoomStore();

  const [inputCode, setInputCode] = useState('');
  const [userName, setUserName] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const handleJoin = () => {
    const raw = inputCode.trim();
    if (!raw) {
      setErrorMessage('Please enter a room code or link');
      return;
    }

    setErrorMessage('');

    // Extract code if a full URL was pasted
    let cleanCode = raw;
    if (raw.includes('/room/')) {
      cleanCode = raw.split('/room/')[1].split('?')[0].split('/')[0];
    } else if (raw.includes('meetanotes.io/')) {
      cleanCode = raw.split('meetanotes.io/')[1].split('?')[0];
    }

    const room = joinRoom(cleanCode, userName.trim() || undefined);
    if (!room) {
      setErrorMessage('Room not found. Check the code and try again.');
      return;
    }

    setInputCode('');
    setErrorMessage('');
    onClose();

    if (onRoomJoined) {
      onRoomJoined(room.id, room.code);
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
              <View style={[styles.iconBadge, { backgroundColor: colors.secondaryContainer }]}>
                <Ionicons name="enter-outline" size={18} color={colors.onSecondaryContainer} />
              </View>
              <View>
                <Text style={[styles.titleText, { color: colors.text }]}>Join Voice Room</Text>
                <Text style={[styles.subtitleText, { color: colors.textSecondary }]}>
                  Enter the 6-character room code or link
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Form Fields */}
          <View style={styles.formContainer}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>ROOM CODE OR URL</Text>
            <TextInput
              value={inputCode}
              onChangeText={(text) => {
                setInputCode(text);
                if (errorMessage) setErrorMessage('');
              }}
              placeholder="e.g. MN-4829 or https://meetanotes.io/..."
              placeholderTextColor={colors.textMuted}
              autoCapitalize="characters"
              autoCorrect={false}
              style={[
                styles.textInput,
                {
                  backgroundColor: colors.surfaceContainer,
                  borderColor: errorMessage ? '#EF4444' : colors.border,
                  color: colors.text,
                },
              ]}
            />

            {errorMessage ? (
              <Text style={styles.errorText}>{errorMessage}</Text>
            ) : null}

            <Text style={[styles.inputLabel, { color: colors.textSecondary, marginTop: 14 }]}>
              YOUR NAME (OPTIONAL)
            </Text>
            <TextInput
              value={userName}
              onChangeText={setUserName}
              placeholder="e.g. Daniel Ross"
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
          </View>

          {/* Action Row */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              onPress={handleJoin}
              style={[styles.joinBtn, { backgroundColor: colors.primary }]}>
              <Ionicons name="log-in-outline" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.joinBtnText}>Join Voice Call</Text>
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
    fontWeight: '600',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 6,
  },
  actionRow: {
    backgroundColor: 'transparent',
    marginBottom: Platform.OS === 'ios' ? 14 : 6,
  },
  joinBtn: {
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
  joinBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
});
