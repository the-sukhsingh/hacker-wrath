import React, { useState } from 'react';
import {
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Share,
  Platform,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text, View } from '@/components/Themed';
import { useMeetingStore } from '@/store/meetingStore';
import { RecordingPlayer } from '@/components/RecordingPlayer';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

export default function NoteDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const theme = useColorScheme();
  const colors = Colors[theme];
  const insets = useSafeAreaInsets();

  const {
    recordings,
    updateRecordingNote,
    toggleActionItem,
    deleteRecording,
  } = useMeetingStore();

  const recording = recordings.find((r) => r.id === id);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [editingModalOpen, setEditingModalOpen] = useState(false);
  const [noteInputText, setNoteInputText] = useState(recording?.notes || '');

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage(null);
    }, 2800);
  };

  if (!recording) {
    return (
      <View style={[styles.screen, styles.centerScreen, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <Ionicons name="document-text-outline" size={48} color={colors.textMuted} />
        <Text style={[styles.notFoundTitle, { color: colors.text }]}>Note not found</Text>
        <Text style={[styles.notFoundSubtitle, { color: colors.textSecondary }]}>
          This recording or note may have been deleted.
        </Text>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.backActionBtn, { backgroundColor: colors.primary }]}>
          <Ionicons name="arrow-back" size={16} color={colors.primaryText} style={{ marginRight: 6 }} />
          <Text style={[styles.backActionBtnText, { color: colors.primaryText }]}>Back to Notes</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const actionItems = recording.summary?.actionItems || [];
  const completedCount = actionItems.filter((a) => a.done).length;

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins === 0) return `${secs}s`;
    return `${mins}m ${secs > 0 ? `${secs}s` : ''}`;
  };

  const formatDateLabel = (isoDate: string) => {
    try {
      const date = new Date(isoDate);
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'Recent';
    }
  };

  const handleShare = async () => {
    const summaryText = recording.summary?.executiveSummary
      ? `\n\nExecutive Summary:\n${recording.summary.executiveSummary}`
      : '';
    const decisionsText =
      recording.summary?.keyDecisions && recording.summary.keyDecisions.length > 0
        ? `\n\nKey Decisions:\n${recording.summary.keyDecisions.map((d) => `• ${d}`).join('\n')}`
        : '';
    const actionItemsText =
      actionItems.length > 0
        ? `\n\nAction Items:\n${actionItems
            .map((a) => `[${a.done ? 'x' : ' '}] ${a.task}${a.assignee ? ` (${a.assignee})` : ''}`)
            .join('\n')}`
        : '';
    const userNotesText = recording.notes ? `\n\nNotes:\n${recording.notes}` : '';

    const content = `Meeting Notes: ${recording.meetingTitle}${summaryText}${decisionsText}${actionItemsText}${userNotesText}`;

    try {
      await Share.share({
        message: content,
        title: recording.meetingTitle,
      });
    } catch {
      showToast('Note text copied to clipboard');
    }
  };

  const handleDelete = () => {
    const doDelete = () => {
      deleteRecording(recording.id);
      router.back();
    };

    if (Platform.OS === 'web') {
      if (window.confirm(`Delete notes for "${recording.meetingTitle}"?`)) {
        doDelete();
      }
    } else {
      Alert.alert(
        'Delete Recording Note',
        `Are you sure you want to delete notes for "${recording.meetingTitle}"?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: doDelete },
        ]
      );
    }
  };

  const handleSaveNotes = () => {
    updateRecordingNote(recording.id, noteInputText);
    setEditingModalOpen(false);
    showToast('Notes updated successfully');
  };

  const handleCopyTranscript = async () => {
    if (!recording.transcript) return;
    try {
      await Share.share({
        message: recording.transcript,
        title: `Transcript: ${recording.meetingTitle}`,
      });
    } catch {
      showToast('Transcript copied to clipboard');
    }
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background, paddingTop: Math.max(insets.top, 12) }]}>
      {/* Toast */}
      {toastMessage && (
        <View style={[styles.toastContainer, { backgroundColor: colors.tint }]}>
          <Ionicons name="checkmark-circle" size={16} color={colors.primaryText} />
          <Text style={[styles.toastText, { color: colors.primaryText }]}>{toastMessage}</Text>
        </View>
      )}

      {/* Top Navigation Bar */}
      <View style={[styles.navBar, { backgroundColor: colors.surfaceContainer }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.navBtn, { backgroundColor: colors.surfaceContainerHigh }]}
          accessibilityLabel="Back">
          <Ionicons name="chevron-back" size={20} color={colors.onSurface} />
        </TouchableOpacity>

        <View style={styles.navTitleContainer}>
          <Text numberOfLines={1} style={[styles.navTitle, { color: colors.onSurface }]}>
            {recording.meetingTitle}
          </Text>
        </View>

        <View style={styles.navActionsRow}>
          <TouchableOpacity
            onPress={handleShare}
            style={[styles.navBtn, { backgroundColor: colors.surfaceContainerHigh }]}
            accessibilityLabel="Share note">
            <Ionicons name="share-outline" size={18} color={colors.onSurface} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              setNoteInputText(recording.notes || '');
              setEditingModalOpen(true);
            }}
            style={[styles.navBtn, { backgroundColor: colors.surfaceContainerHigh }]}
            accessibilityLabel="Edit note">
            <Ionicons name="create-outline" size={18} color={colors.onSurface} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleDelete}
            style={[styles.navBtn, { backgroundColor: colors.surfaceContainerHigh }]}
            accessibilityLabel="Delete note">
            <Ionicons name="trash-outline" size={17} color={colors.error} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 60 }]}
        showsVerticalScrollIndicator={false}>
        {/* Hero Title Section */}
        <View style={styles.heroSection}>
          <Text style={[styles.heroTitle, { color: colors.text }]}>{recording.meetingTitle}</Text>

          <View style={styles.heroMetaRow}>
            <View style={styles.metaItem}>
              <Ionicons name="calendar-outline" size={13} color={colors.textSecondary} />
              <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                {formatDateLabel(recording.createdAt)}
              </Text>
            </View>

            <View style={[styles.metaDot, { backgroundColor: colors.cardBorder }]} />

            <View style={[styles.durationBadge, { backgroundColor: colors.surface }]}>
              <Ionicons name="time-outline" size={12} color={colors.textSecondary} />
              <Text style={[styles.durationBadgeText, { color: colors.textSecondary }]}>
                {formatDuration(recording.durationSeconds)}
              </Text>
            </View>

            <View style={[styles.metaDot, { backgroundColor: colors.cardBorder }]} />

            <Text style={[styles.metaText, { color: colors.textMuted }]}>16kHz PCM WAV</Text>
          </View>

          {/* Tags */}
          {recording.tags && recording.tags.length > 0 && (
            <View style={styles.tagsRow}>
              {recording.tags.map((tag) => (
                <View key={tag} style={[styles.tagPill, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
                  <Text style={[styles.tagPillText, { color: colors.textSecondary }]}>#{tag}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Embedded Audio Player */}
        {recording.uri ? (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={styles.cardHeaderSmall}>
              <Ionicons name="volume-medium" size={16} color={colors.tint} />
              <Text style={[styles.cardHeaderTitle, { color: colors.text }]}>Audio Recording</Text>
            </View>
            <RecordingPlayer uri={recording.uri} durationSeconds={recording.durationSeconds} />
          </View>
        ) : null}

        {/* AI Executive Summary */}
        {recording.summary?.executiveSummary && (
          <View style={[styles.card, { backgroundColor: colors.surfaceContainerLow, borderColor: colors.outlineVariant }]}>
            <View style={styles.cardHeaderSmall}>
              <Ionicons name="sparkles" size={16} color={colors.tertiary} />
              <Text style={[styles.cardHeaderTitle, { color: colors.tertiary }]}>Executive Summary</Text>
            </View>
            <Text style={[styles.summaryText, { color: colors.onSurface }]}>
              {recording.summary.executiveSummary}
            </Text>
          </View>
        )}

        {/* Interactive Action Items Checklist */}
        {actionItems.length > 0 && (
          <View style={[styles.card, { backgroundColor: colors.surfaceContainerLow, borderColor: colors.outlineVariant }]}>
            <View style={styles.cardHeaderBetween}>
              <View style={styles.cardHeaderSmall}>
                <Ionicons name="checkbox-outline" size={16} color={colors.onSurface} />
                <Text style={[styles.cardHeaderTitle, { color: colors.onSurface }]}>Action Items</Text>
              </View>
              <View style={[styles.countBadge, { backgroundColor: colors.secondaryContainer }]}>
                <Text style={[styles.countBadgeText, { color: colors.onSecondaryContainer }]}>
                  {completedCount}/{actionItems.length} Done
                </Text>
              </View>
            </View>

            <View style={styles.actionItemsList}>
              {actionItems.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  onPress={() => toggleActionItem(recording.id, item.id)}
                  style={[
                    styles.actionItemRow,
                    { borderColor: colors.cardBorder },
                    item.done && { opacity: 0.65 },
                  ]}>
                  <Ionicons
                    name={item.done ? 'checkbox' : 'square-outline'}
                    size={20}
                    color={item.done ? colors.accent : colors.textSecondary}
                  />
                  <View style={styles.actionItemBody}>
                    <Text
                      style={[
                        styles.actionItemTask,
                        { color: colors.text },
                        item.done && styles.actionItemDone,
                      ]}>
                      {item.task}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                      {item.assignee && (
                        <View style={[styles.assigneeBadge, { backgroundColor: colors.surface }]}>
                          <Ionicons name="person-outline" size={10} color={colors.textSecondary} />
                          <Text style={[styles.assigneeText, { color: colors.textSecondary }]}>
                            {item.assignee}
                          </Text>
                        </View>
                      )}
                      {item.priority && (
                        <View style={[styles.assigneeBadge, { backgroundColor: item.priority === 'high' ? '#FEE2E2' : colors.surface }]}>
                          <Text style={[styles.assigneeText, { color: item.priority === 'high' ? '#DC2626' : colors.textSecondary, fontWeight: '700' }]}>
                            {item.priority.toUpperCase()}
                          </Text>
                        </View>
                      )}
                      {item.category && (
                        <View style={[styles.assigneeBadge, { backgroundColor: colors.surface }]}>
                          <Text style={[styles.assigneeText, { color: colors.textMuted }]}>
                            {item.category}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Key Decisions */}
        {recording.summary?.keyDecisions && recording.summary.keyDecisions.length > 0 && (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={styles.cardHeaderSmall}>
              <Ionicons name="git-branch-outline" size={16} color={colors.text} />
              <Text style={[styles.cardHeaderTitle, { color: colors.text }]}>
                Key Decisions ({recording.summary.keyDecisions.length})
              </Text>
            </View>
            <View style={styles.decisionsList}>
              {recording.summary.keyDecisions.map((decision, idx) => (
                <View key={idx} style={styles.decisionItem}>
                  <Ionicons name="checkmark-circle" size={16} color={colors.accent} style={{ marginTop: 2 }} />
                  <Text style={[styles.decisionText, { color: colors.text }]}>{decision}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Personal Notes */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={styles.cardHeaderBetween}>
            <View style={styles.cardHeaderSmall}>
              <Ionicons name="create-outline" size={16} color={colors.text} />
              <Text style={[styles.cardHeaderTitle, { color: colors.text }]}>Personal Notes</Text>
            </View>
            <TouchableOpacity
              onPress={() => {
                setNoteInputText(recording.notes || '');
                setEditingModalOpen(true);
              }}
              style={styles.editActionLink}>
              <Ionicons name="pencil" size={12} color={colors.accent} />
              <Text style={[styles.editActionLinkText, { color: colors.accent }]}>Edit</Text>
            </TouchableOpacity>
          </View>

          {recording.notes ? (
            <View style={[styles.notesBox, { backgroundColor: colors.surface }]}>
              <Text style={[styles.notesText, { color: colors.text }]}>{recording.notes}</Text>
            </View>
          ) : (
            <TouchableOpacity
              onPress={() => {
                setNoteInputText('');
                setEditingModalOpen(true);
              }}
              style={[styles.addNotesPlaceholder, { borderColor: colors.cardBorder }]}>
              <Ionicons name="add-circle-outline" size={18} color={colors.textMuted} />
              <Text style={[styles.addNotesPlaceholderText, { color: colors.textMuted }]}>
                Tap to add your thoughts and highlights
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Full Transcript */}
        {recording.transcript && (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={styles.cardHeaderBetween}>
              <View style={styles.cardHeaderSmall}>
                <Ionicons name="receipt-outline" size={16} color={colors.text} />
                <Text style={[styles.cardHeaderTitle, { color: colors.text }]}>Transcript</Text>
              </View>
              <TouchableOpacity onPress={handleCopyTranscript} style={styles.copyTranscriptBtn}>
                <Ionicons name="copy-outline" size={13} color={colors.textSecondary} />
                <Text style={[styles.copyTranscriptText, { color: colors.textSecondary }]}>
                  {recording.transcript.split(/\s+/).length} words
                </Text>
              </TouchableOpacity>
            </View>
            <View style={[styles.transcriptBox, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
              <Text style={[styles.transcriptText, { color: colors.text }]}>{recording.transcript}</Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Edit Notes Modal */}
      <Modal
        visible={editingModalOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setEditingModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <Ionicons name="create-outline" size={20} color={colors.accent} />
                <Text style={[styles.modalTitle, { color: colors.text }]}>Edit Notes</Text>
              </View>
              <TouchableOpacity onPress={() => setEditingModalOpen(false)}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
              {recording.meetingTitle}
            </Text>

            <TextInput
              style={[
                styles.modalTextInput,
                {
                  color: colors.text,
                  backgroundColor: colors.surface,
                  borderColor: colors.cardBorder,
                },
              ]}
              multiline
              numberOfLines={8}
              value={noteInputText}
              onChangeText={setNoteInputText}
              placeholder="Type your personal notes, takeaways, or meeting highlights..."
              placeholderTextColor={colors.textMuted}
              textAlignVertical="top"
            />

            <View style={styles.modalButtonsRow}>
              <TouchableOpacity
                onPress={() => setEditingModalOpen(false)}
                style={[styles.modalCancelBtn, { borderColor: colors.cardBorder }]}>
                <Text style={[styles.modalCancelBtnText, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleSaveNotes}
                style={[styles.modalSaveBtn, { backgroundColor: colors.primary }]}>
                <Text style={[styles.modalSaveBtnText, { color: colors.primaryText }]}>Save Notes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  centerScreen: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  notFoundTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 12,
  },
  notFoundSubtitle: {
    fontSize: 13,
    marginTop: 4,
    marginBottom: 20,
    textAlign: 'center',
  },
  backActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
  },
  backActionBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  toastContainer: {
    position: 'absolute',
    top: 50,
    alignSelf: 'center',
    zIndex: 999,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
    gap: 8,
  },
  toastText: {
    fontSize: 13,
    fontWeight: '600',
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTitleContainer: {
    flex: 1,
  },
  navTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  navActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  scrollContent: {
    padding: 16,
    gap: 16,
  },
  heroSection: {
    gap: 8,
    paddingBottom: 4,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
    lineHeight: 28,
  },
  heroMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
  },
  durationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 4,
  },
  durationBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  tagPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  tagPillText: {
    fontSize: 11,
    fontWeight: '500',
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  cardHeaderSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  cardHeaderBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardHeaderTitle: {
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  countBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  summaryText: {
    fontSize: 14,
    lineHeight: 22,
  },
  actionItemsList: {
    gap: 8,
  },
  actionItemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 4,
  },
  actionItemBody: {
    flex: 1,
    gap: 4,
  },
  actionItemTask: {
    fontSize: 14,
    lineHeight: 20,
  },
  actionItemDone: {
    textDecorationLine: 'line-through',
  },
  assigneeBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 4,
  },
  assigneeText: {
    fontSize: 10,
    fontWeight: '500',
  },
  decisionsList: {
    gap: 8,
  },
  decisionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  decisionText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
  },
  editActionLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  editActionLinkText: {
    fontSize: 12,
    fontWeight: '600',
  },
  notesBox: {
    padding: 12,
    borderRadius: 10,
  },
  notesText: {
    fontSize: 13,
    lineHeight: 20,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  addNotesPlaceholder: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 10,
    gap: 8,
  },
  addNotesPlaceholderText: {
    fontSize: 13,
  },
  copyTranscriptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  copyTranscriptText: {
    fontSize: 11,
  },
  transcriptBox: {
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
  },
  transcriptText: {
    fontSize: 13,
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 480,
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  modalSubtitle: {
    fontSize: 12,
    marginBottom: 16,
  },
  modalTextInput: {
    minHeight: 140,
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16,
  },
  modalButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  modalCancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
  },
  modalCancelBtnText: {
    fontSize: 13,
    fontWeight: '500',
  },
  modalSaveBtn: {
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 8,
  },
  modalSaveBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
