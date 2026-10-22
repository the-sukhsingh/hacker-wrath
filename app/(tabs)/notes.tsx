import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Text, View } from '@/components/Themed';
import { useMeetingStore } from '@/store/meetingStore';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

type FilterCategory = 'all' | 'actions' | 'audio';

export default function NotesScreen() {
  const router = useRouter();
  const theme = useColorScheme();
  const colors = Colors[theme];
  const insets = useSafeAreaInsets();

  const { recordings } = useMeetingStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<FilterCategory>('all');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    recordings.forEach((r) => {
      r.tags?.forEach((t) => tagSet.add(t));
    });
    return Array.from(tagSet);
  }, [recordings]);

  const filteredRecordings = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return recordings.filter((rec) => {
      if (selectedTag && (!rec.tags || !rec.tags.includes(selectedTag))) {
        return false;
      }

      if (selectedFilter === 'actions') {
        const hasActions = Boolean(rec.summary?.actionItems && rec.summary.actionItems.length > 0);
        if (!hasActions) return false;
      } else if (selectedFilter === 'audio') {
        if (!rec.uri) return false;
      }

      if (!query) return true;

      const titleMatch = rec.meetingTitle.toLowerCase().includes(query);
      const summaryMatch = rec.summary?.executiveSummary?.toLowerCase().includes(query);
      const decisionsMatch = rec.summary?.keyDecisions?.some((d) => d.toLowerCase().includes(query));
      const actionsMatch = rec.summary?.actionItems?.some((a) => a.task.toLowerCase().includes(query));
      const notesMatch = rec.notes?.toLowerCase().includes(query);
      const transcriptMatch = rec.transcript?.toLowerCase().includes(query);
      const tagsMatch = rec.tags?.some((t) => t.toLowerCase().includes(query));

      return Boolean(
        titleMatch ||
        summaryMatch ||
        decisionsMatch ||
        actionsMatch ||
        notesMatch ||
        transcriptMatch ||
        tagsMatch
      );
    });
  }, [recordings, searchQuery, selectedFilter, selectedTag]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins === 0) return `${secs}s`;
    return `${mins}m ${secs > 0 ? `${secs}s` : ''}`;
  };

  const formatDateLabel = (isoDate: string) => {
    try {
      const date = new Date(isoDate);
      const now = new Date();
      const diffHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

      if (diffHours < 24 && date.getDate() === now.getDate()) {
        const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        return `Today · ${timeStr}`;
      } else if (diffHours < 48 && date.getDate() === now.getDate() - 1) {
        return 'Yesterday';
      }
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
      return 'Recent';
    }
  };

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedFilter('all');
    setSelectedTag(null);
  };

  const isFiltering = searchQuery.trim().length > 0 || selectedFilter !== 'all' || selectedTag !== null;

  return (
    <View style={[styles.screen, { backgroundColor: colors.background, paddingTop: Math.max(insets.top, 14) }]}>
      {/* Top Header */}
      <View style={styles.topHeader}>
        <View style={styles.titleRow}>
          <Text style={[styles.headerTitle, { color: colors.onSurface }]}>Notes</Text>
          <View style={[styles.countChip, { backgroundColor: colors.secondaryContainer }]}>
            <Text style={[styles.countChipText, { color: colors.onSecondaryContainer }]}>
              {recordings.length}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={() => router.push('/record')}
          style={[styles.m3FabSmall, { backgroundColor: colors.primaryContainer }]}>
          <Ionicons name="mic" size={16} color={colors.onPrimaryContainer} />
          <Text style={[styles.m3FabSmallText, { color: colors.onPrimaryContainer }]}>Record</Text>
        </TouchableOpacity>
      </View>

      {/* M3 Search Bar */}
      <View style={styles.searchWrapper}>
        <View style={[styles.m3SearchBar, { backgroundColor: colors.surfaceContainerHigh }]}>
          <Ionicons name="search" size={18} color={colors.onSurfaceVariant} style={styles.searchIcon} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search notes, action items, tags..."
            placeholderTextColor={colors.onSurfaceVariant}
            style={[styles.searchInput, { color: colors.onSurface }]}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={18} color={colors.onSurfaceVariant} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* M3 Filter Chips Row */}
      <View style={styles.chipsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
          <TouchableOpacity
            onPress={() => setSelectedFilter('all')}
            style={[
              styles.m3FilterChip,
              {
                backgroundColor: selectedFilter === 'all' ? colors.secondaryContainer : colors.surfaceContainerLow,
                borderColor: selectedFilter === 'all' ? colors.primary : colors.outlineVariant,
              },
            ]}>
            {selectedFilter === 'all' && (
              <Ionicons name="checkmark" size={13} color={colors.onSecondaryContainer} style={{ marginRight: 4 }} />
            )}
            <Text
              style={[
                styles.m3FilterChipText,
                { color: selectedFilter === 'all' ? colors.onSecondaryContainer : colors.onSurfaceVariant },
              ]}>
              All Notes
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setSelectedFilter('actions')}
            style={[
              styles.m3FilterChip,
              {
                backgroundColor: selectedFilter === 'actions' ? colors.secondaryContainer : colors.surfaceContainerLow,
                borderColor: selectedFilter === 'actions' ? colors.primary : colors.outlineVariant,
              },
            ]}>
            {selectedFilter === 'actions' && (
              <Ionicons name="checkmark" size={13} color={colors.onSecondaryContainer} style={{ marginRight: 4 }} />
            )}
            <Text
              style={[
                styles.m3FilterChipText,
                { color: selectedFilter === 'actions' ? colors.onSecondaryContainer : colors.onSurfaceVariant },
              ]}>
              With Action Items
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setSelectedFilter('audio')}
            style={[
              styles.m3FilterChip,
              {
                backgroundColor: selectedFilter === 'audio' ? colors.secondaryContainer : colors.surfaceContainerLow,
                borderColor: selectedFilter === 'audio' ? colors.primary : colors.outlineVariant,
              },
            ]}>
            {selectedFilter === 'audio' && (
              <Ionicons name="checkmark" size={13} color={colors.onSecondaryContainer} style={{ marginRight: 4 }} />
            )}
            <Text
              style={[
                styles.m3FilterChipText,
                { color: selectedFilter === 'audio' ? colors.onSecondaryContainer : colors.onSurfaceVariant },
              ]}>
              With Audio
            </Text>
          </TouchableOpacity>

          {allTags.map((tag) => {
            const isTagSelected = selectedTag === tag;
            return (
              <TouchableOpacity
                key={tag}
                onPress={() => setSelectedTag(isTagSelected ? null : tag)}
                style={[
                  styles.m3FilterChip,
                  {
                    backgroundColor: isTagSelected ? colors.tertiaryContainer : colors.surfaceContainerLow,
                    borderColor: isTagSelected ? colors.tertiary : colors.outlineVariant,
                  },
                ]}>
                <Text
                  style={[
                    styles.m3FilterChipText,
                    { color: isTagSelected ? colors.onTertiaryContainer : colors.onSurfaceVariant },
                  ]}>
                  #{tag}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Notes List */}
      <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
        {filteredRecordings.length === 0 ? (
          <View style={[styles.emptyContainer, { backgroundColor: colors.surfaceContainerLow, borderColor: colors.outlineVariant }]}>
            <View style={[styles.emptyIconCircle, { backgroundColor: colors.surfaceContainerHigh }]}>
              <Ionicons name="document-text-outline" size={32} color={colors.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.onSurface }]}>No notes found</Text>
            <Text style={[styles.emptySubtitle, { color: colors.onSurfaceVariant }]}>
              {isFiltering ? 'Try adjusting your search query or filters.' : 'Record a meeting to generate structured notes.'}
            </Text>
            {isFiltering && (
              <TouchableOpacity
                onPress={resetFilters}
                style={[styles.m3TonalBtn, { backgroundColor: colors.secondaryContainer }]}>
                <Text style={[styles.m3TonalBtnText, { color: colors.onSecondaryContainer }]}>Reset Filters</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          filteredRecordings.map((rec) => {
            const actionCount = rec.summary?.actionItems?.length || 0;
            const completedCount = rec.summary?.actionItems?.filter((a) => a.done).length || 0;

            return (
              <TouchableOpacity
                key={rec.id}
                onPress={() => router.push({ pathname: '/notes/[id]', params: { id: rec.id } })}
                style={[
                  styles.m3NoteCard,
                  {
                    backgroundColor: colors.surfaceContainerLow,
                    borderColor: colors.outlineVariant,
                  },
                ]}>
                {/* Meta Row */}
                <View style={styles.cardMetaRow}>
                  <Text style={[styles.dateText, { color: colors.onSurfaceVariant }]}>
                    {formatDateLabel(rec.createdAt)}
                  </Text>

                  <View style={styles.cardBadgesRow}>
                    {rec.durationSeconds > 0 && (
                      <View style={[styles.audioPill, { backgroundColor: colors.surfaceContainerHigh }]}>
                        <Ionicons name="volume-medium-outline" size={11} color={colors.onSurfaceVariant} />
                        <Text style={[styles.audioPillText, { color: colors.onSurfaceVariant }]}>
                          {formatDuration(rec.durationSeconds)}
                        </Text>
                      </View>
                    )}
                    {actionCount > 0 && (
                      <View style={[styles.actionPill, { backgroundColor: colors.tertiaryContainer }]}>
                        <Ionicons name="checkbox-outline" size={11} color={colors.onTertiaryContainer} />
                        <Text style={[styles.actionPillText, { color: colors.onTertiaryContainer }]}>
                          {completedCount}/{actionCount} tasks
                        </Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* Title */}
                <Text style={[styles.cardTitle, { color: colors.onSurface }]} numberOfLines={2}>
                  {rec.meetingTitle}
                </Text>

                {/* Excerpt */}
                {rec.summary?.executiveSummary ? (
                  <Text style={[styles.cardExcerpt, { color: colors.onSurfaceVariant }]} numberOfLines={2}>
                    {rec.summary.executiveSummary}
                  </Text>
                ) : rec.transcript ? (
                  <Text style={[styles.cardExcerpt, { color: colors.onSurfaceVariant }]} numberOfLines={2}>
                    {rec.transcript}
                  </Text>
                ) : null}

                {/* Tags */}
                {rec.tags && rec.tags.length > 0 && (
                  <View style={styles.cardTagsRow}>
                    {rec.tags.map((t) => (
                      <View key={t} style={[styles.m3TagPill, { backgroundColor: colors.surfaceContainerHigh }]}>
                        <Text style={[styles.m3TagPillText, { color: colors.onSurfaceVariant }]}>#{t}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
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
    paddingBottom: 10,
    backgroundColor: 'transparent',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'transparent',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  countChip: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  countChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  m3FabSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  m3FabSmallText: {
    fontSize: 12,
    fontWeight: '700',
  },
  searchWrapper: {
    paddingHorizontal: 20,
    marginBottom: 10,
    backgroundColor: 'transparent',
  },
  m3SearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderRadius: 24,
    paddingHorizontal: 16,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
  },
  chipsContainer: {
    marginBottom: 10,
    backgroundColor: 'transparent',
  },
  chipsScroll: {
    paddingHorizontal: 20,
    gap: 8,
  },
  m3FilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  m3FilterChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 12,
  },
  m3NoteCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  cardMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    backgroundColor: 'transparent',
  },
  dateText: {
    fontSize: 11,
    fontWeight: '500',
  },
  cardBadgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'transparent',
  },
  audioPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  audioPillText: {
    fontSize: 10,
    fontWeight: '600',
  },
  actionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  actionPillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
    marginBottom: 6,
    lineHeight: 22,
  },
  cardExcerpt: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 10,
  },
  cardTagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    backgroundColor: 'transparent',
  },
  m3TagPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  m3TagPillText: {
    fontSize: 11,
    fontWeight: '500',
  },
  emptyContainer: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  emptyIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  m3TonalBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  m3TonalBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
