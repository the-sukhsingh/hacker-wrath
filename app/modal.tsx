import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { Platform, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Text, View } from '@/components/Themed';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

export default function InfoModalScreen() {
  const router = useRouter();
  const theme = useColorScheme();
  const colors = Colors[theme];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* M3 Handle Bar */}
        <View style={[styles.handleBar, { backgroundColor: colors.outlineVariant }]} />

        <View style={styles.header}>
          <View style={[styles.badge, { backgroundColor: colors.primaryContainer }]}>
            <Ionicons name="shield-checkmark" size={16} color={colors.primary} />
            <Text style={[styles.badgeText, { color: colors.primary }]}>Local-First Architecture</Text>
          </View>
          <Text style={[styles.title, { color: colors.text }]}>Privacy-Guaranteed AI</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            On-device Whisper STT & Google Gemma SLM Meeting Intelligence
          </Text>
        </View>

        {/* Audio Pipeline Card */}
        <View style={[styles.card, { backgroundColor: colors.surfaceContainerLow, borderColor: colors.cardBorder }]}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconBox, { backgroundColor: colors.secondaryContainer }]}>
              <Ionicons name="mic-outline" size={18} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>Audio & Transcription Pipeline</Text>
              <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>Real-time on-device speech processing</Text>
            </View>
          </View>
          <View style={styles.specsList}>
            <View style={styles.specRow}>
              <Text style={[styles.specLabel, { color: colors.textSecondary }]}>Sample Rate</Text>
              <Text style={[styles.specValue, { color: colors.text }]}>16,000 Hz (16 kHz mono)</Text>
            </View>
            <View style={styles.specRow}>
              <Text style={[styles.specLabel, { color: colors.textSecondary }]}>Format</Text>
              <Text style={[styles.specValue, { color: colors.text }]}>PCM 16-bit Linear WAV</Text>
            </View>
            <View style={styles.specRow}>
              <Text style={[styles.specLabel, { color: colors.textSecondary }]}>STT Engine</Text>
              <Text style={[styles.specValue, { color: colors.text }]}>OpenAI Whisper GGML (quantized)</Text>
            </View>
          </View>
        </View>

        {/* SLM Intelligence Card */}
        <View style={[styles.card, { backgroundColor: colors.surfaceContainerLow, borderColor: colors.cardBorder }]}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconBox, { backgroundColor: colors.tertiaryContainer }]}>
              <Ionicons name="sparkles-outline" size={18} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>SLM Meeting Summarizer</Text>
              <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>Action item & key decision extraction</Text>
            </View>
          </View>
          <View style={styles.specsList}>
            <View style={styles.specRow}>
              <Text style={[styles.specLabel, { color: colors.textSecondary }]}>Primary Model</Text>
              <Text style={[styles.specValue, { color: colors.text }]}>Google Gemma 2 (2B-IT GGUF)</Text>
            </View>
            <View style={styles.specRow}>
              <Text style={[styles.specLabel, { color: colors.textSecondary }]}>Lightweight</Text>
              <Text style={[styles.specValue, { color: colors.text }]}>SmolLM2-360M (Low RAM)</Text>
            </View>
            <View style={styles.specRow}>
              <Text style={[styles.specLabel, { color: colors.textSecondary }]}>Inference</Text>
              <Text style={[styles.specValue, { color: colors.text }]}>100% On-device / Zero Cloud</Text>
            </View>
          </View>
        </View>

        {/* Privacy Guarantees Card */}
        <View style={[styles.card, { backgroundColor: colors.surfaceContainerLow, borderColor: colors.cardBorder }]}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconBox, { backgroundColor: 'rgba(34,197,94,0.15)' }]}>
              <Ionicons name="lock-closed-outline" size={18} color="#22C55E" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>Privacy Guarantees</Text>
              <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>Your audio and notes never leave</Text>
            </View>
          </View>
          <View style={styles.bulletList}>
            <Text style={[styles.bodyText, { color: colors.textSecondary }]}>
              1. Zero voice audio or transcripts ever upload to the cloud.
            </Text>
            <Text style={[styles.bodyText, { color: colors.textSecondary }]}>
              2. Calendar integration is read-only and cached locally on SQLite.
            </Text>
            <Text style={[styles.bodyText, { color: colors.textSecondary }]}>
              3. Works entirely offline in airplane mode.
            </Text>
          </View>
        </View>

        {/* M3 Filled Button */}
        <TouchableOpacity
          onPress={() => router.back()}
          activeOpacity={0.8}
          style={[styles.closeBtn, { backgroundColor: colors.primary }]}>
          <Text style={[styles.closeBtnText, { color: colors.onPrimary || colors.primaryText }]}>Got it</Text>
        </TouchableOpacity>
      </ScrollView>

      <StatusBar style={Platform.OS === 'ios' ? 'light' : 'auto'} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingTop: 12,
    alignItems: 'center',
  },
  handleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    marginBottom: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
    backgroundColor: 'transparent',
    gap: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
    paddingHorizontal: 16,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 24,
    borderWidth: 1,
    padding: 18,
    marginBottom: 14,
    gap: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'transparent',
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  cardSubtitle: {
    fontSize: 12,
    marginTop: 1,
  },
  specsList: {
    backgroundColor: 'transparent',
    gap: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.06)',
    paddingTop: 10,
  },
  specRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  specLabel: {
    fontSize: 12,
  },
  specValue: {
    fontSize: 12,
    fontWeight: '600',
  },
  bulletList: {
    backgroundColor: 'transparent',
    gap: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.06)',
    paddingTop: 10,
  },
  bodyText: {
    fontSize: 13,
    lineHeight: 19,
  },
  closeBtn: {
    width: '100%',
    maxWidth: 420,
    paddingVertical: 14,
    borderRadius: 24,
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 20,
  },
  closeBtnText: {
    fontSize: 15,
    fontWeight: '700',
  },
});

