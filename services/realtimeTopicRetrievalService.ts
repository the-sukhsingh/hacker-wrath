import { Recording, Meeting } from '@/types/meeting';

export type SnippetType = 'decision' | 'action' | 'summary' | 'transcript' | 'tag';

export interface TopicMatchResult {
  id: string;
  recordingId: string;
  title: string;
  date: string;
  relativeDate: string;
  matchedSnippet: string;
  snippetType: SnippetType;
  relevanceScore: number; // 0 to 100
  matchedKeywords: string[];
  tags: string[];
  executiveSummary?: string;
  keyDecisions?: string[];
  actionItems?: string[];
}

interface IndexedChunk {
  id: string;
  recordingId: string;
  title: string;
  date: string;
  tags: string[];
  snippet: string;
  snippetType: SnippetType;
  tokens: string[];
  tokenCounts: Map<string, number>;
  executiveSummary?: string;
  keyDecisions?: string[];
  actionItems?: string[];
}

// Common English stopwords to ignore in search
const STOP_WORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', 'aren\'t', 'as', 'at',
  'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by',
  'can', 'can\'t', 'cannot', 'could', 'couldn\'t', 'did', 'didn\'t', 'do', 'does', 'doesn\'t', 'doing', 'don\'t', 'down', 'during',
  'each', 'few', 'for', 'from', 'further', 'had', 'hadn\'t', 'has', 'hasn\'t', 'have', 'haven\'t', 'having', 'he', 'he\'d', 'he\'ll', 'he\'s', 'her', 'here', 'here\'s', 'hers', 'herself', 'him', 'himself', 'his', 'how', 'how\'s',
  'i', 'i\'d', 'i\'ll', 'i\'m', 'i\'ve', 'if', 'in', 'into', 'is', 'isn\'t', 'it', 'it\'s', 'its', 'itself',
  'let\'s', 'me', 'more', 'most', 'mustn\'t', 'my', 'myself',
  'no', 'nor', 'not', 'of', 'off', 'on', 'once', 'only', 'or', 'other', 'ought', 'our', 'ours', 'ourselves', 'out', 'over', 'own',
  'same', 'shan\'t', 'she', 'she\'d', 'she\'ll', 'she\'s', 'should', 'shouldn\'t', 'so', 'some', 'such',
  'than', 'that', 'that\'s', 'the', 'their', 'theirs', 'them', 'themselves', 'then', 'there', 'there\'s', 'these', 'they', 'they\'d', 'they\'ll', 'they\'re', 'they\'ve', 'this', 'those', 'through', 'to', 'too',
  'under', 'until', 'up', 'very', 'was', 'wasn\'t', 'we', 'we\'d', 'we\'ll', 'we\'re', 'we\'ve', 'were', 'weren\'t', 'what', 'what\'s', 'when', 'when\'s', 'where', 'where\'s', 'which', 'while', 'who', 'who\'s', 'whom', 'why', 'why\'s', 'with', 'won\'t', 'would', 'wouldn\'t',
  'you', 'you\'d', 'you\'ll', 'you\'re', 'you\'ve', 'your', 'yours', 'yourself', 'yourselves',
  // Speech filler words
  'um', 'uh', 'like', 'yeah', 'okay', 'well', 'actually', 'basically', 'right', 'know', 'mean', 'sort', 'kind', 'just', 'hey', 'hello',
]);

/**
 * Tokenizes text into lowercase normalized alphanumeric tokens, discarding stop words
 */
function tokenize(text: string): string[] {
  if (!text) return [];
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-_]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 2 && !STOP_WORDS.has(word));
}

function computeTF(tokens: string[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const t of tokens) {
    map.set(t, (map.get(t) || 0) + 1);
  }
  return map;
}

class RealtimeTopicRetrievalService {
  private chunks: IndexedChunk[] = [];
  private docFrequencies: Map<string, number> = new Map();
  private totalChunks: number = 0;
  private avgChunkLength: number = 0;
  private isIndexed: boolean = false;

  // Real-time debounce and active listeners
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private lastQuery: string = '';
  private listeners: Set<(results: TopicMatchResult[]) => void> = new Set();
  private lastResults: TopicMatchResult[] = [];

  /**
   * Builds an inverted search index across all past recordings, summaries, decisions, and action items
   */
  public indexCorpus(recordings: Recording[], pastMeetings: Meeting[] = []): void {
    const newChunks: IndexedChunk[] = [];

    // 1. Index past recordings
    recordings.forEach((rec) => {
      const recDate = rec.createdAt ? new Date(rec.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Past';
      const commonData = {
        recordingId: rec.id,
        title: rec.meetingTitle || 'Voice Note',
        date: rec.createdAt,
        tags: rec.tags || [],
        executiveSummary: rec.summary?.executiveSummary,
        keyDecisions: rec.summary?.keyDecisions,
        actionItems: rec.summary?.actionItems?.map((a) => a.task),
      };

      // Chunk: Executive Summary
      if (rec.summary?.executiveSummary) {
        const tokens = tokenize(`${rec.meetingTitle} ${rec.tags?.join(' ') || ''} ${rec.summary.executiveSummary}`);
        newChunks.push({
          id: `${rec.id}-summary`,
          snippet: rec.summary.executiveSummary,
          snippetType: 'summary',
          tokens,
          tokenCounts: computeTF(tokens),
          ...commonData,
        });
      }

      // Chunks: Key Decisions
      if (rec.summary?.keyDecisions && rec.summary.keyDecisions.length > 0) {
        rec.summary.keyDecisions.forEach((decision, idx) => {
          const tokens = tokenize(`${rec.meetingTitle} ${rec.tags?.join(' ') || ''} ${decision}`);
          newChunks.push({
            id: `${rec.id}-dec-${idx}`,
            snippet: decision,
            snippetType: 'decision',
            tokens,
            tokenCounts: computeTF(tokens),
            ...commonData,
          });
        });
      }

      // Chunks: Action Items
      if (rec.summary?.actionItems && rec.summary.actionItems.length > 0) {
        rec.summary.actionItems.forEach((action, idx) => {
          const tokens = tokenize(`${rec.meetingTitle} ${action.assignee || ''} ${action.task}`);
          newChunks.push({
            id: `${rec.id}-act-${idx}`,
            snippet: `${action.task}${action.assignee ? ` (${action.assignee})` : ''}`,
            snippetType: 'action',
            tokens,
            tokenCounts: computeTF(tokens),
            ...commonData,
          });
        });
      }

      // Chunk: User Note Body or Transcript Highlights
      if (rec.notes && rec.notes.trim()) {
        const tokens = tokenize(`${rec.meetingTitle} ${rec.notes}`);
        newChunks.push({
          id: `${rec.id}-notes`,
          snippet: rec.notes.length > 180 ? rec.notes.slice(0, 180).trim() + '...' : rec.notes,
          snippetType: 'transcript',
          tokens,
          tokenCounts: computeTF(tokens),
          ...commonData,
        });
      } else if (rec.transcript && rec.transcript.trim()) {
        const tokens = tokenize(`${rec.meetingTitle} ${rec.transcript}`);
        newChunks.push({
          id: `${rec.id}-transcript`,
          snippet: rec.transcript.length > 180 ? rec.transcript.slice(0, 180).trim() + '...' : rec.transcript,
          snippetType: 'transcript',
          tokens,
          tokenCounts: computeTF(tokens),
          ...commonData,
        });
      }
    });

    // 2. Index past meetings (if any have agenda/notes)
    pastMeetings.forEach((m) => {
      if (m.agenda || m.notes) {
        const text = `${m.title} ${m.agenda || ''} ${m.notes || ''}`;
        const tokens = tokenize(text);
        newChunks.push({
          id: `m-${m.id}`,
          recordingId: `meeting-${m.id}`,
          title: m.title,
          date: m.date,
          tags: ['Meeting', m.platform],
          snippet: m.agenda || m.notes || m.title,
          snippetType: 'summary',
          tokens,
          tokenCounts: computeTF(tokens),
        });
      }
    });

    // 3. Compute document frequencies
    const docFreq = new Map<string, number>();
    let totalLen = 0;

    newChunks.forEach((chunk) => {
      totalLen += chunk.tokens.length;
      const seen = new Set<string>();
      chunk.tokens.forEach((t) => {
        if (!seen.has(t)) {
          seen.add(t);
          docFreq.set(t, (docFreq.get(t) || 0) + 1);
        }
      });
    });

    this.chunks = newChunks;
    this.docFrequencies = docFreq;
    this.totalChunks = newChunks.length;
    this.avgChunkLength = this.totalChunks > 0 ? totalLen / this.totalChunks : 1;
    this.isIndexed = true;
  }

  /**
   * Search relevant topics based on spoken transcript window
   * Uses BM25 + phrase matching + tag affinity
   */
  public searchTopics(speechText: string, maxResults: number = 4): TopicMatchResult[] {
    if (!this.isIndexed || this.chunks.length === 0 || !speechText || speechText.trim().length < 3) {
      return [];
    }

    // Extract query tokens. For real-time speech, prioritize the latest spoken window (last ~30 words)
    // while also considering the overall transcript context.
    const rawTokens = speechText.trim().split(/\s+/);
    const recentWindowText = rawTokens.length > 25 ? rawTokens.slice(-25).join(' ') : speechText;
    const recentTokens = tokenize(recentWindowText);
    const overallTokens = tokenize(speechText);

    if (recentTokens.length === 0 && overallTokens.length === 0) {
      return [];
    }

    // Weight recent tokens twice as high as distant tokens
    const queryWeights = new Map<string, number>();
    overallTokens.forEach((t) => queryWeights.set(t, (queryWeights.get(t) || 0) + 1));
    recentTokens.forEach((t) => queryWeights.set(t, (queryWeights.get(t) || 0) + 2.5));

    const scoredResults: { chunk: IndexedChunk; score: number; matchedWords: string[] }[] = [];

    // BM25 parameters
    const k1 = 1.4;
    const b = 0.75;
    const N = this.totalChunks;

    const lowerSpeech = speechText.toLowerCase();

    for (const chunk of this.chunks) {
      let bm25Score = 0;
      const matchedWords: string[] = [];

      queryWeights.forEach((weight, qTerm) => {
        const tf = chunk.tokenCounts.get(qTerm) || 0;
        if (tf > 0) {
          matchedWords.push(qTerm);
          const df = this.docFrequencies.get(qTerm) || 1;
          // BM25 IDF
          const idf = Math.log(1 + (N - df + 0.5) / (df + 0.5));
          const num = tf * (k1 + 1);
          const denom = tf + k1 * (1 - b + (b * chunk.tokens.length) / this.avgChunkLength);
          bm25Score += (num / denom) * idf * weight;
        }
      });

      // Bonus for Tag matches
      let tagBonus = 0;
      if (chunk.tags && chunk.tags.length > 0) {
        chunk.tags.forEach((tag) => {
          const lTag = tag.toLowerCase();
          if (lowerSpeech.includes(lTag)) {
            tagBonus += 5.0;
            if (!matchedWords.includes(lTag)) matchedWords.push(lTag);
          }
        });
      }

      // Bonus for Title word matches
      let titleBonus = 0;
      const titleTokens = tokenize(chunk.title);
      titleTokens.forEach((t) => {
        if (queryWeights.has(t)) {
          titleBonus += 3.5;
        }
      });

      // Direct phrase substring bonus
      let phraseBonus = 0;
      if (recentTokens.length >= 2) {
        const biGram1 = recentTokens.slice(-2).join(' ');
        if (chunk.snippet.toLowerCase().includes(biGram1)) {
          phraseBonus += 6.0;
        }
      }

      const totalScore = bm25Score + tagBonus + titleBonus + phraseBonus;

      // Only include matches that hit at least one key term or tag
      if (totalScore > 2.5 && matchedWords.length > 0) {
        scoredResults.push({ chunk, score: totalScore, matchedWords });
      }
    }

    if (scoredResults.length === 0) {
      return [];
    }

    // Sort descending by score
    scoredResults.sort((a, b) => b.score - a.score);

    // Normalize score to percentage (0 - 100%)
    const maxScore = Math.max(...scoredResults.map((r) => r.score));

    // Deduplicate so we don't output 4 chunks from the exact same recording if other recordings exist
    const seenRecordings = new Set<string>();
    const topResults: TopicMatchResult[] = [];

    for (const item of scoredResults) {
      if (topResults.length >= maxResults) break;

      // Allow at most 2 chunks from the same recording
      const recCount = topResults.filter((r) => r.recordingId === item.chunk.recordingId).length;
      if (recCount >= 2) continue;

      const normalizedScore = Math.min(99, Math.round(55 + (item.score / (maxScore + 1)) * 44));

      topResults.push({
        id: item.chunk.id,
        recordingId: item.chunk.recordingId,
        title: item.chunk.title,
        date: item.chunk.date,
        relativeDate: this.formatRelativeDate(item.chunk.date),
        matchedSnippet: item.chunk.snippet,
        snippetType: item.chunk.snippetType,
        relevanceScore: normalizedScore,
        matchedKeywords: Array.from(new Set(item.matchedWords)).slice(0, 4),
        tags: item.chunk.tags,
        executiveSummary: item.chunk.executiveSummary,
        keyDecisions: item.chunk.keyDecisions,
        actionItems: item.chunk.actionItems,
      });
    }

    return topResults;
  }

  /**
   * Feed incoming real-time speech transcript from microphone
   * Automatically debounces search and notifies listeners
   */
  public feedRealtimeSpeech(transcript: string, debounceMs: number = 320): void {
    const trimmed = transcript.trim();
    if (trimmed === this.lastQuery) return;
    this.lastQuery = trimmed;

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      const results = this.searchTopics(trimmed);
      this.lastResults = results;
      this.notifyListeners(results);
    }, debounceMs);
  }

  public subscribe(listener: (results: TopicMatchResult[]) => void): () => void {
    this.listeners.add(listener);
    // Immediately emit last results
    if (this.lastResults.length > 0) {
      listener(this.lastResults);
    }
    return () => {
      this.listeners.delete(listener);
    };
  }

  public clear(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    this.lastQuery = '';
    this.lastResults = [];
    this.notifyListeners([]);
  }

  private notifyListeners(results: TopicMatchResult[]): void {
    this.listeners.forEach((fn) => {
      try {
        fn(results);
      } catch (e) {
        console.warn('Topic listener error:', e);
      }
    });
  }

  private formatRelativeDate(isoDate: string): string {
    try {
      const d = new Date(isoDate);
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      if (diffDays === 0) return 'Today';
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays}d ago`;
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
      return 'Past';
    }
  }
}

export const realtimeTopicRetrievalService = new RealtimeTopicRetrievalService();
