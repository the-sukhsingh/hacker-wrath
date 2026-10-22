import React, { useState } from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Platform,
} from 'react-native';
import { Text, View } from '@/components/Themed';
import { Ionicons } from '@expo/vector-icons';
import { TopicMatchResult } from '@/services/realtimeTopicRetrievalService';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

interface LiveTopicRecallPanelProps {
  topicMatches: TopicMatchResult[];
  isRecording: boolean;
  onInsertContextSnippet?: (text: string) => void;
}

export function LiveTopicRecallPanel({
  topicMatches,
  isRecording,
  onInsertContextSnippet,
}: LiveTopicRecallPanelProps) {
  const theme = useColorScheme();
  const colors = Colors[theme];

  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [selectedTopic, setSelectedTopic] = useState<TopicMatchResult | null>(null);
  const [insertedNotice, setInsertedNotice] = useState<string | null>(null);

  if (topicMatches.length === 0) {
    if (!isRecording) return null;

    // Minimal ambient listening badge when recording but no topic matches yet
    return (
      <View style={[styles.ambientEmptyCard, { backgroundColor: colors.surfaceContainerLow, borderColor: colors.outlineVariant }]}>
        <View style={styles.ambientRow}>
          <View style={[styles.pulsingDot, { backgroundColor: colors.primary }]} />
          <Ionicons name="sparkles" size={13} color={colors.primary} />
          <Text style={[styles.ambientText, { color: colors.onSurfaceVariant }]}>
            Topic Recall listening for related past conversations...
          </Text>
        </View>
      </View>
    );
  }

  const handleInsertContext = (topic: TopicMatchResult) => {
    const citation = `\n> [Related from ${topic.title} (${topic.relativeDate})]: "${topic.matchedSnippet}"\n`;
    onInsertContextSnippet?.(citation);
    setInsertedNotice(`Snippet cited from "${topic.title}"`);
    setTimeout(() => {
      setInsertedNotice(null);
      setSelectedTopic(null);
    }, 1200);
  };

  const getSnippetIcon = (type: string) => {
    switch (type) {
      case 'decision':
        return 'checkbox-outline';
      case 'action':
        return 'flash-outline';
      case 'summary':
        return 'bulb-outline';
      default:
        return 'chatbubble-ellipses-outline';
    }
  };

  const getSnippetTypeLabel = (type: string) => {
    switch (type) {
      case 'decision':
        return 'Key Decision';
      case 'action':
        return 'Action Item';
      case 'summary':
        return 'Executive Summary';
      default:
        return 'Past Transcript';
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.surfaceContainerLow, borderColor: colors.outlineVariant }]}>
      {/* Header Bar */}
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => setIsExpanded(!isExpanded)}
        style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <View style={[styles.sparkleIconBox, { backgroundColor: colors.primaryContainer }]}>
            <Ionicons name="sparkles" size={14} color={colors.primary} />
          </View>
          <View>
            <View style={styles.titleWithBadge}>
              <Text style={[styles.headerTitle, { color: colors.onSurface }]}>RELATED TOPICS</Text>
              <View style={[styles.countPill, { backgroundColor: colors.secondaryContainer }]}>
                <Text style={[styles.countPillText, { color: colors.onSecondaryContainer }]}>
                  {topicMatches.length} {topicMatches.length === 1 ? 'found' : 'found'}
                </Text>
              </View>
            </View>
            <Text style={[styles.headerSub, { color: colors.onSurfaceVariant }]}>
              Real-time context from past meetings
            </Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          <Ionicons
            name={isExpanded ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={colors.onSurfaceVariant}
          />
        </View>
      </TouchableOpacity>

      {/* Expandable Topic Cards */}
      {isExpanded && (
        <View style={styles.cardsContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.cardsScroll}>
            {topicMatches.map((topic) => (
              <TouchableOpacity
                key={topic.id}
                activeOpacity={0.82}
                onPress={() => setSelectedTopic(topic)}
                style={[
                  styles.topicCard,
                  {
                    backgroundColor: colors.surfaceContainerHigh,
                    borderColor: colors.outlineVariant,
                  },
                ]}>
                {/* Card Top: Relevance & Date */}
                <View style={styles.cardTopRow}>
                  <View style={[styles.matchScoreBadge, { backgroundColor: colors.primaryContainer }]}>
                    <Text style={[styles.matchScoreText, { color: colors.primary }]}>
                      {topic.relevanceScore}% match
                    </Text>
                  </View>
                  <Text style={[styles.dateText, { color: colors.onSurfaceVariant }]}>
                    {topic.relativeDate}
                  </Text>
                </View>

                {/* Card Title */}
                <Text numberOfLines={1} style={[styles.topicTitle, { color: colors.onSurface }]}>
                  {topic.title}
                </Text>

                {/* Type & Snippet */}
                <View style={[styles.snippetContainer, { backgroundColor: colors.surfaceContainerLowest }]}>
                  <View style={styles.snippetTypeRow}>
                    <Ionicons name={getSnippetIcon(topic.snippetType) as any} size={11} color={colors.primary} />
                    <Text style={[styles.snippetTypeLabel, { color: colors.primary }]}>
                      {getSnippetTypeLabel(topic.snippetType)}
                    </Text>
                  </View>
                  <Text numberOfLines={2} style={[styles.snippetText, { color: colors.onSurfaceVariant }]}>
                    {`"${topic.matchedSnippet}"`}
                  </Text>
                </View>

                {/* Matched Keywords Tags */}
                <View style={styles.tagsRow}>
                  {topic.matchedKeywords.map((kw, i) => (
                    <View key={i} style={[styles.keywordPill, { backgroundColor: colors.secondaryContainer }]}>
                      <Text style={[styles.keywordText, { color: colors.onSecondaryContainer }]}>
                        #{kw}
                      </Text>
                    </View>
                  ))}
                  <View style={{ flex: 1 }} />
                  <Ionicons name="arrow-forward-circle-outline" size={16} color={colors.primary} />
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Topic Detail Modal */}
      <Modal
        visible={selectedTopic !== null}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setSelectedTopic(null)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surfaceContainer, borderColor: colors.outlineVariant }]}>
            {/* Sheet Handle */}
            <View style={[styles.sheetHandle, { backgroundColor: colors.outlineVariant }]} />

            {selectedTopic && (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.sheetScroll}>
                <View style={styles.modalHeader}>
                  <View style={[styles.matchScoreBadge, { backgroundColor: colors.primaryContainer }]}>
                    <Ionicons name="sparkles" size={13} color={colors.primary} />
                    <Text style={[styles.matchScoreText, { color: colors.primary }]}>
                      {selectedTopic.relevanceScore}% Semantic Match
                    </Text>
                  </View>
                  <Text style={[styles.modalDate, { color: colors.onSurfaceVariant }]}>
                    {selectedTopic.relativeDate}
                  </Text>
                </View>

                <Text style={[styles.modalTitle, { color: colors.onSurface }]}>
                  {selectedTopic.title}
                </Text>

                {/* Matched Snippet Highlight */}
                <View style={[styles.modalHighlightBox, { backgroundColor: colors.surfaceContainerLow, borderColor: colors.primary }]}>
                  <View style={styles.modalHighlightHeader}>
                    <Ionicons name={getSnippetIcon(selectedTopic.snippetType) as any} size={15} color={colors.primary} />
                    <Text style={[styles.modalHighlightTitle, { color: colors.primary }]}>
                      Matched {getSnippetTypeLabel(selectedTopic.snippetType)}
                    </Text>
                  </View>
                  <Text style={[styles.modalHighlightBody, { color: colors.onSurface }]}>
                    {`"${selectedTopic.matchedSnippet}"`}
                  </Text>
                </View>

                {/* Executive Summary Section */}
                {selectedTopic.executiveSummary && (
                  <View style={styles.modalSection}>
                    <Text style={[styles.sectionTitle, { color: colors.onSurfaceVariant }]}>EXECUTIVE SUMMARY</Text>
                    <Text style={[styles.sectionBody, { color: colors.onSurface }]}>
                      {selectedTopic.executiveSummary}
                    </Text>
                  </View>
                )}

                {/* Key Decisions */}
                {selectedTopic.keyDecisions && selectedTopic.keyDecisions.length > 0 && (
                  <View style={styles.modalSection}>
                    <Text style={[styles.sectionTitle, { color: colors.onSurfaceVariant }]}>KEY DECISIONS</Text>
                    {selectedTopic.keyDecisions.map((dec, i) => (
                      <View key={i} style={styles.bulletRow}>
                        <Ionicons name="checkmark-circle" size={15} color="#22C55E" style={{ marginTop: 2 }} />
                        <Text style={[styles.bulletText, { color: colors.onSurface }]}>{dec}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Action Items */}
                {selectedTopic.actionItems && selectedTopic.actionItems.length > 0 && (
                  <View style={styles.modalSection}>
                    <Text style={[styles.sectionTitle, { color: colors.onSurfaceVariant }]}>ACTION ITEMS</Text>
                    {selectedTopic.actionItems.map((act, i) => (
                      <View key={i} style={styles.bulletRow}>
                        <Ionicons name="arrow-forward-outline" size={13} color={colors.primary} style={{ marginTop: 3 }} />
                        <Text style={[styles.bulletText, { color: colors.onSurface }]}>{act}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Citation Notice */}
                {insertedNotice && (
                  <View style={[styles.noticeBadge, { backgroundColor: colors.secondaryContainer }]}>
                    <Ionicons name="checkmark" size={14} color={colors.onSecondaryContainer} />
                    <Text style={[styles.noticeText, { color: colors.onSecondaryContainer }]}>
                      {insertedNotice}
                    </Text>
                  </View>
                )}

                {/* Modal Buttons */}
                <View style={styles.modalBtnRow}>
                  {onInsertContextSnippet && (
                    <TouchableOpacity
                      onPress={() => handleInsertContext(selectedTopic)}
                      style={[styles.citeBtn, { backgroundColor: colors.primaryContainer }]}>
                      <Ionicons name="bookmark-outline" size={16} color={colors.primary} />
                      <Text style={[styles.citeBtnText, { color: colors.primary }]}>Cite in Notes</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    onPress={() => setSelectedTopic(null)}
                    style={[styles.closeModalBtn, { backgroundColor: colors.surfaceContainerHigh }]}>
                    <Text style={[styles.closeModalBtnText, { color: colors.onSurface }]}>Close</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    borderRadius: 20,
    borderWidth: 1,
    padding: 12,
    marginBottom: 14,
  },
  ambientEmptyCard: {
    width: '100%',
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  ambientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'transparent',
  },
  pulsingDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  ambientText: {
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'transparent',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'transparent',
  },
  sparkleIconBox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleWithBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'transparent',
  },
  headerTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  countPill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
  },
  countPillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  headerSub: {
    fontSize: 11,
    marginTop: 1,
  },
  headerRight: {
    padding: 4,
    backgroundColor: 'transparent',
  },
  cardsContainer: {
    marginTop: 10,
    backgroundColor: 'transparent',
  },
  cardsScroll: {
    gap: 10,
    paddingVertical: 2,
  },
  topicCard: {
    width: 250,
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    gap: 8,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  matchScoreBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  matchScoreText: {
    fontSize: 11,
    fontWeight: '700',
  },
  dateText: {
    fontSize: 11,
    fontWeight: '500',
  },
  topicTitle: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  snippetContainer: {
    borderRadius: 10,
    padding: 8,
    gap: 4,
  },
  snippetTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'transparent',
  },
  snippetTypeLabel: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  snippetText: {
    fontSize: 12,
    lineHeight: 16,
    fontStyle: 'italic',
  },
  tagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'transparent',
    marginTop: 2,
  },
  keywordPill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  keywordText: {
    fontSize: 10,
    fontWeight: '600',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    width: '100%',
    maxHeight: '82%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    padding: 20,
    paddingTop: 10,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  sheetScroll: {
    gap: 16,
    paddingBottom: Platform.OS === 'ios' ? 36 : 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  modalDate: {
    fontSize: 12,
    fontWeight: '500',
  },
  modalTitle: {
    fontSize: 19,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  modalHighlightBox: {
    borderRadius: 16,
    borderLeftWidth: 4,
    padding: 14,
    gap: 6,
  },
  modalHighlightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'transparent',
  },
  modalHighlightTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  modalHighlightBody: {
    fontSize: 14,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  modalSection: {
    backgroundColor: 'transparent',
    gap: 6,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  sectionBody: {
    fontSize: 13,
    lineHeight: 19,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: 'transparent',
    marginVertical: 2,
  },
  bulletText: {
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
  },
  noticeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 10,
    borderRadius: 12,
  },
  noticeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
    backgroundColor: 'transparent',
  },
  citeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 20,
  },
  citeBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  closeModalBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 20,
  },
  closeModalBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
