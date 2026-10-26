import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Share,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Text, View } from '@/components/Themed';
import { useMeetingStore } from '@/store/meetingStore';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

type FilterCategory = 'all' | 'actions' | 'audio';

interface SampleFolder {
  id: string;
  name: string;
  size: string;
  color: string;
  iconColor: string;
}

interface RecentFile {
  id: string;
  name: string;
  size: string;
  type: 'mp4' | 'pdf' | 'wav';
  date: string;
}

const SAMPLE_FOLDERS: SampleFolder[] = [
  { id: 'f-1', name: 'Project Beta', size: '13.5 mb', color: '#EBF0E6', iconColor: '#4D5C3B' },
  { id: 'f-2', name: 'Team Collab', size: '12.2 mb', color: '#FDF4F2', iconColor: '#E06D53' },
  { id: 'f-3', name: 'Sprint Review', size: '9.4 mb', color: '#FEF3D6', iconColor: '#F5C242' },
  { id: 'f-4', name: 'Archived Notes', size: '28.1 mb', color: '#EDE9FE', iconColor: '#7C3AED' },
];

const RECENT_FILES: RecentFile[] = [
  { id: 'file-1', name: 'Project Portfolio v2', size: '3.5 mb', type: 'mp4', date: 'Today' },
  { id: 'file-2', name: 'Progress Report 2025', size: '2.1 mb', type: 'pdf', date: 'Yesterday' },
  { id: 'file-3', name: 'Strategy Planning Session', size: '4.8 mb', type: 'wav', date: 'Oct 24' },
];

export default function NotesScreen() {
  const router = useRouter();
  const theme = useColorScheme();
  const colors = Colors[theme];
  const insets = useSafeAreaInsets();

  const { recordings, settings } = useMeetingStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<FilterCategory>('all');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);

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

  const handleShareFile = async (fileName: string) => {
    try {
      await Share.share({
        title: fileName,
        message: `Sharing ${fileName} from MeetaNotes`,
      });
    } catch {
      // Ignored
    }
  };

  const userInitials = (settings.userName || 'Launa Vendrick')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  return (
    <View style={[styles.screen, { backgroundColor: colors.background, paddingTop: Math.max(insets.top, 14) }]}>
      {/* 1. TOP HEADER (Avatar, Title, Search & Record) */}
      <View style={styles.topHeader}>
        {/* User Avatar */}
        <TouchableOpacity
          onPress={() => router.push('/settings')}
          style={[styles.avatarCircle, { backgroundColor: colors.amber }]}>
          <Text style={styles.avatarInitials}>{userInitials}</Text>
        </TouchableOpacity>

        <View style={styles.headerRightActions}>
          <TouchableOpacity
            onPress={() => router.push('/record')}
            style={[styles.recordFab, { backgroundColor: colors.coral }]}>
            <Ionicons name="mic" size={15} color="#FFFFFF" style={{ marginRight: 4 }} />
            <Text style={styles.recordFabText}>Record</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Screen Title */}
      <View style={styles.titleSection}>
        <Text style={[styles.screenTitle, { color: colors.text }]}>My Notes</Text>
      </View>

      {/* 2. SEARCH BAR */}
      <View style={styles.searchWrapper}>
        <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="search" size={17} color={colors.textSecondary} style={styles.searchIcon} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search notes, action items, tags..."
            placeholderTextColor={colors.textMuted}
            style={[styles.searchInput, { color: colors.text }]}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filter Chips */}
      <View style={styles.chipsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
          <TouchableOpacity
            onPress={() => setSelectedFilter('all')}
            style={[
              styles.filterChip,
              {
                backgroundColor: selectedFilter === 'all' ? colors.coral : colors.surface,
                borderColor: selectedFilter === 'all' ? colors.coral : colors.border,
              },
            ]}>
            <Text
              style={[
                styles.filterChipText,
                { color: selectedFilter === 'all' ? '#FFFFFF' : colors.textSecondary },
              ]}>
              All Notes
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setSelectedFilter('actions')}
            style={[
              styles.filterChip,
              {
                backgroundColor: selectedFilter === 'actions' ? colors.coral : colors.surface,
                borderColor: selectedFilter === 'actions' ? colors.coral : colors.border,
              },
            ]}>
            <Text
              style={[
                styles.filterChipText,
                { color: selectedFilter === 'actions' ? '#FFFFFF' : colors.textSecondary },
              ]}>
              With Action Items
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setSelectedFilter('audio')}
            style={[
              styles.filterChip,
              {
                backgroundColor: selectedFilter === 'audio' ? colors.coral : colors.surface,
                borderColor: selectedFilter === 'audio' ? colors.coral : colors.border,
              },
            ]}>
            <Text
              style={[
                styles.filterChipText,
                { color: selectedFilter === 'audio' ? '#FFFFFF' : colors.textSecondary },
              ]}>
              With Audio
            </Text>
          </TouchableOpacity>

          {allTags.map((tag) => {
            const isSelected = selectedTag === tag;
            return (
              <TouchableOpacity
                key={tag}
                onPress={() => setSelectedTag(isSelected ? null : tag)}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: isSelected ? colors.olive : colors.surface,
                    borderColor: isSelected ? colors.olive : colors.border,
                  },
                ]}>
                <Text
                  style={[
                    styles.filterChipText,
                    { color: isSelected ? '#FFFFFF' : colors.textSecondary },
                  ]}>
                  #{tag}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom + 90, 100) }]}
        showsVerticalScrollIndicator={false}>
        
        {/* 3. FEATURED FOLDERS CAROUSEL (From UI Kit Image 1 & 4) */}
        {!searchQuery && (
          <>
            <View style={styles.carouselContainer}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.carouselScroll}>
                {/* Olive Green Folder Card */}
                <View style={[styles.folderCardLarge, { backgroundColor: colors.olive }]}>
                  <View style={styles.folderCardTop}>
                    <Ionicons name="folder" size={24} color="#EBF0E6" />
                    <TouchableOpacity hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Ionicons name="ellipsis-horizontal" size={16} color="#EBF0E6" />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.folderCardTitle}>Team Meeting Notes & Updates</Text>
                  <Text style={styles.folderCardSubtitle}>Tasks On Time • Meeting Goals</Text>
                  <Text style={styles.folderCardDate}>20 Oct 2025</Text>
                </View>

                {/* Dark Slate Folder Card */}
                <View style={[styles.folderCardLarge, { backgroundColor: '#2C3038' }]}>
                  <View style={styles.folderCardTop}>
                    <Ionicons name="folder" size={24} color="#F3F4F6" />
                    <TouchableOpacity hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Ionicons name="ellipsis-horizontal" size={16} color="#F3F4F6" />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.folderCardTitle}>Project Meeting Summary</Text>
                  <Text style={styles.folderCardSubtitle}>Tasks On Time • Meeting Goals</Text>
                  <Text style={styles.folderCardDate}>20 Oct 2025</Text>
                </View>
              </ScrollView>
            </View>

            {/* 4. MY FOLDERS SECTION */}
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>My Folders</Text>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.subFoldersScroll}>
              {SAMPLE_FOLDERS.map((folder) => {
                const isActive = activeFolderId === folder.id;
                return (
                  <TouchableOpacity
                    key={folder.id}
                    onPress={() => setActiveFolderId(isActive ? null : folder.id)}
                    style={[
                      styles.subFolderCard,
                      {
                        backgroundColor: colors.surface,
                        borderColor: isActive ? colors.coral : colors.border,
                      },
                    ]}>
                    <View style={[styles.subFolderIconWell, { backgroundColor: folder.color }]}>
                      <Ionicons name="folder" size={18} color={folder.iconColor} />
                    </View>
                    <Text style={[styles.subFolderName, { color: colors.text }]} numberOfLines={1}>
                      {folder.name}
                    </Text>
                    <Text style={[styles.subFolderSize, { color: colors.textSecondary }]}>
                      {folder.size}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* 5. RECENT FILES SECTION */}
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Files</Text>
            </View>

            <View style={styles.recentFilesList}>
              {RECENT_FILES.map((file) => (
                <View
                  key={file.id}
                  style={[styles.recentFileCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <View style={[styles.fileTypeBadge, { backgroundColor: file.type === 'mp4' ? colors.coralLight : colors.surfaceContainer }]}>
                    <Text style={[styles.fileTypeText, { color: file.type === 'mp4' ? colors.coral : colors.text }]}>
                      {file.type.toUpperCase()}
                    </Text>
                  </View>

                  <View style={styles.recentFileDetails}>
                    <Text style={[styles.recentFileName, { color: colors.text }]} numberOfLines={1}>
                      {file.name}
                    </Text>
                    <Text style={[styles.recentFileMeta, { color: colors.textSecondary }]}>
                      {file.size} • {file.date}
                    </Text>
                  </View>

                  <TouchableOpacity onPress={() => handleShareFile(file.name)} style={styles.fileShareBtn}>
                    <Ionicons name="share-outline" size={16} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </>
        )}

        {/* 6. MEETING RECORDINGS & NOTES LIST */}
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Meeting Notes</Text>
          <Text style={[styles.countBadge, { color: colors.textSecondary }]}>
            {filteredRecordings.length} {filteredRecordings.length === 1 ? 'note' : 'notes'}
          </Text>
        </View>

        {filteredRecordings.length === 0 ? (
          <View style={[styles.emptyContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.emptyIconCircle, { backgroundColor: colors.surfaceContainer }]}>
              <Ionicons name="document-text-outline" size={32} color={colors.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No notes found</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              Try adjusting your search query or filters.
            </Text>
          </View>
        ) : (
          filteredRecordings.map((rec) => {
            const actionCount = rec.summary?.actionItems?.length || 0;
            const completedCount = rec.summary?.actionItems?.filter((a) => a.done).length || 0;

            return (
              <TouchableOpacity
                key={rec.id}
                onPress={() => router.push({ pathname: '/notes/[id]', params: { id: rec.id } })}
                style={[styles.noteCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                {/* Meta Row */}
                <View style={styles.cardMetaRow}>
                  <Text style={[styles.dateText, { color: colors.textSecondary }]}>
                    {formatDateLabel(rec.createdAt)}
                  </Text>

                  <View style={styles.cardBadgesRow}>
                    {rec.durationSeconds > 0 && (
                      <View style={[styles.audioPill, { backgroundColor: colors.surfaceContainer }]}>
                        <Ionicons name="volume-medium-outline" size={11} color={colors.textSecondary} />
                        <Text style={[styles.audioPillText, { color: colors.textSecondary }]}>
                          {formatDuration(rec.durationSeconds)}
                        </Text>
                      </View>
                    )}
                    {actionCount > 0 && (
                      <View style={[styles.actionPill, { backgroundColor: colors.oliveLight }]}>
                        <Ionicons name="checkbox-outline" size={11} color={colors.olive} />
                        <Text style={[styles.actionPillText, { color: colors.olive }]}>
                          {completedCount}/{actionCount} tasks
                        </Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* Title */}
                <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={2}>
                  {rec.meetingTitle}
                </Text>

                {/* Excerpt */}
                {rec.summary?.executiveSummary ? (
                  <Text style={[styles.cardExcerpt, { color: colors.textSecondary }]} numberOfLines={2}>
                    {rec.summary.executiveSummary}
                  </Text>
                ) : rec.transcript ? (
                  <Text style={[styles.cardExcerpt, { color: colors.textSecondary }]} numberOfLines={2}>
                    {rec.transcript}
                  </Text>
                ) : null}

                {/* Tags */}
                {rec.tags && rec.tags.length > 0 && (
                  <View style={styles.cardTagsRow}>
                    {rec.tags.map((t) => (
                      <View key={t} style={[styles.tagPill, { backgroundColor: colors.surfaceContainer }]}>
                        <Text style={[styles.tagPillText, { color: colors.textSecondary }]}>#{t}</Text>
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
    paddingTop: 8,
    paddingBottom: 4,
    backgroundColor: 'transparent',
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  avatarInitials: {
    fontSize: 15,
    fontWeight: '800',
    color: '#3D2E00',
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'transparent',
  },
  recordFab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  recordFabText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  titleSection: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 10,
    backgroundColor: 'transparent',
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  searchWrapper: {
    paddingHorizontal: 20,
    marginBottom: 10,
    backgroundColor: 'transparent',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 46,
    borderRadius: 23,
    paddingHorizontal: 14,
    borderWidth: 1,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
  },
  chipsContainer: {
    marginBottom: 12,
    backgroundColor: 'transparent',
  },
  chipsScroll: {
    paddingHorizontal: 20,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 18,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  carouselContainer: {
    marginHorizontal: -20,
    marginBottom: 16,
    backgroundColor: 'transparent',
  },
  carouselScroll: {
    paddingHorizontal: 20,
    gap: 12,
  },
  folderCardLarge: {
    width: 200,
    borderRadius: 22,
    padding: 18,
    minHeight: 140,
    justifyContent: 'space-between',
  },
  folderCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  folderCardTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
    marginTop: 10,
  },
  folderCardSubtitle: {
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: 11,
    marginTop: 2,
  },
  folderCardDate: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 8,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    marginBottom: 10,
    backgroundColor: 'transparent',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  countBadge: {
    fontSize: 12,
    fontWeight: '500',
  },
  subFoldersScroll: {
    gap: 10,
    paddingBottom: 6,
  },
  subFolderCard: {
    width: 110,
    borderRadius: 18,
    borderWidth: 1,
    padding: 12,
    alignItems: 'center',
  },
  subFolderIconWell: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  subFolderName: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 2,
  },
  subFolderSize: {
    fontSize: 10,
  },
  recentFilesList: {
    gap: 8,
    marginBottom: 10,
    backgroundColor: 'transparent',
  },
  recentFileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
  },
  fileTypeBadge: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  fileTypeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  recentFileDetails: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  recentFileName: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
  },
  recentFileMeta: {
    fontSize: 11,
  },
  fileShareBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noteCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
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
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  audioPillText: {
    fontSize: 10,
    fontWeight: '600',
  },
  actionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  actionPillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
    marginBottom: 6,
    lineHeight: 21,
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
  tagPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  tagPillText: {
    fontSize: 11,
    fontWeight: '500',
  },
  emptyContainer: {
    borderRadius: 20,
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
  },
});
