import React, { useState } from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text, View } from '@/components/Themed';
import { useMeetingStore } from '@/store/meetingStore';
import {
  AVAILABLE_WHISPER_MODELS,
  AVAILABLE_SLM_MODELS,
  pullAndSaveModel,
  deleteModel,
  cancelModelPull,
  setActiveWhisperModelId,
  setActiveSLMModelId,
} from '@/services/modelManagerService';
import { slmSummarizerService } from '@/services/slmSummarizerService';
import { ModelId, WhisperModelDefinition } from '@/types/model';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

export interface ModelManagerCardProps {
  embedded?: boolean;
}

export function ModelManagerCard({ embedded = false }: ModelManagerCardProps) {
  const theme = useColorScheme();
  const colors = Colors[theme];

  const {
    settings,
    updateSettings,
    downloadedModels,
    downloadProgress,
    activeDownloadingModelId,
    setDownloadedModelRecord,
    removeDownloadedModelRecord,
    setModelDownloadProgress,
    setActiveDownloadingModelId,
  } = useMeetingStore();

  const [activeTab, setActiveTab] = useState<'whisper' | 'slm'>('slm'); // default to SLM as user requested
  const [customUrlOpen, setCustomUrlOpen] = useState(false);
  const [customUrl, setCustomUrl] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const activeWhisperModelId = settings.whisperModel;
  const activeSlmModelId = settings.activeSlmModel || 'gemma-2-2b-it.gguf';

  const modelsToDisplay = activeTab === 'whisper' ? AVAILABLE_WHISPER_MODELS : AVAILABLE_SLM_MODELS;

  const handlePullModel = async (model: WhisperModelDefinition, urlOverride?: string) => {
    setErrorMessage(null);
    setActiveDownloadingModelId(model.id);
    setModelDownloadProgress(model.id, 0);

    try {
      const record = await pullAndSaveModel(model.id, {
        customUrl: urlOverride || (customUrl.trim() ? customUrl.trim() : undefined),
        onProgress: (prog) => {
          setModelDownloadProgress(prog.modelId, prog.progressPercent);
        },
      });

      setDownloadedModelRecord(record);

      if (model.type === 'slm_reasoning') {
        updateSettings({ activeSlmModel: model.id, slmModelDownloaded: true });
        await setActiveSLMModelId(model.id);
        slmSummarizerService.setActiveModel(model.id);
      } else {
        updateSettings({ whisperModel: model.id as any, whisperModelDownloaded: true });
        await setActiveWhisperModelId(model.id);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to download model';
      setErrorMessage(msg);
    } finally {
      setActiveDownloadingModelId(null);
    }
  };

  const handleCancelPull = (modelId: ModelId) => {
    cancelModelPull(modelId);
    setActiveDownloadingModelId(null);
    setModelDownloadProgress(modelId, 0);
  };

  const handleDeleteModel = async (modelId: ModelId, modelName: string, isSLM: boolean) => {
    const doDelete = async () => {
      try {
        await deleteModel(modelId);
        removeDownloadedModelRecord(modelId);

        if (isSLM) {
          if (settings.activeSlmModel === modelId) {
            const remaining = AVAILABLE_SLM_MODELS.find(
              (m) => m.id !== modelId && downloadedModels[m.id]?.status === 'ready'
            );
            if (remaining) {
              updateSettings({ activeSlmModel: remaining.id, slmModelDownloaded: true });
              await setActiveSLMModelId(remaining.id);
              slmSummarizerService.setActiveModel(remaining.id);
            } else {
              updateSettings({ slmModelDownloaded: false });
            }
          }
        } else {
          if (settings.whisperModel === modelId) {
            const remaining = AVAILABLE_WHISPER_MODELS.find(
              (m) => m.id !== modelId && downloadedModels[m.id]?.status === 'ready'
            );
            if (remaining) {
              updateSettings({ whisperModel: remaining.id as any, whisperModelDownloaded: true });
              await setActiveWhisperModelId(remaining.id);
            } else {
              updateSettings({ whisperModelDownloaded: false });
            }
          }
        }
      } catch (err) {
        console.warn('Error deleting model:', err);
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm(`Delete ${modelName} from device storage?`)) {
        await doDelete();
      }
    } else {
      Alert.alert(
        'Delete Model',
        `Are you sure you want to remove ${modelName} from device storage?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: doDelete },
        ]
      );
    }
  };

  const handleSelectActive = async (model: WhisperModelDefinition) => {
    if (model.type === 'slm_reasoning') {
      updateSettings({ activeSlmModel: model.id, slmModelDownloaded: true });
      await setActiveSLMModelId(model.id);
      slmSummarizerService.setActiveModel(model.id);
    } else {
      updateSettings({ whisperModel: model.id as any, whisperModelDownloaded: true });
      await setActiveWhisperModelId(model.id);
    }
  };

  return (
    <View
      style={[
        embedded ? styles.embeddedContainer : styles.card,
        !embedded && { backgroundColor: colors.card, borderColor: colors.cardBorder },
      ]}>
      {/* Header (only when not embedded in settings list) */}
      {!embedded && (
        <View style={styles.headerRow}>
          <View style={styles.headerTitleContainer}>
            <View style={styles.badgeRow}>
              <Ionicons name="hardware-chip-outline" size={16} color={colors.accent} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>On-Device AI Models</Text>
            </View>
            <Text style={[styles.sectionDesc, { color: colors.textSecondary }]}>
              Quantized Whisper STT & Google Gemma SLM for offline task extraction
            </Text>
          </View>
        </View>
      )}

      {/* Mode Segment Tabs */}
      <View style={[styles.tabBar, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
        <TouchableOpacity
          onPress={() => setActiveTab('slm')}
          style={[
            styles.tabBtn,
            activeTab === 'slm' && [styles.activeTabBtn, { backgroundColor: colors.card }],
          ]}>
          <Ionicons
            name="sparkles"
            size={14}
            color={activeTab === 'slm' ? colors.tint : colors.textSecondary}
          />
          <Text
            style={[
              styles.tabText,
              { color: activeTab === 'slm' ? colors.text : colors.textSecondary, fontWeight: activeTab === 'slm' ? '700' : '500' },
            ]}>
            SLM Task Models (Gemma)
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTab('whisper')}
          style={[
            styles.tabBtn,
            activeTab === 'whisper' && [styles.activeTabBtn, { backgroundColor: colors.card }],
          ]}>
          <Ionicons
            name="mic"
            size={14}
            color={activeTab === 'whisper' ? colors.tint : colors.textSecondary}
          />
          <Text
            style={[
              styles.tabText,
              { color: activeTab === 'whisper' ? colors.text : colors.textSecondary, fontWeight: activeTab === 'whisper' ? '700' : '500' },
            ]}>
            Whisper Speech STT
          </Text>
        </TouchableOpacity>
      </View>

      {/* Error alert */}
      {errorMessage && (
        <View style={[styles.errorBanner, { backgroundColor: colors.dangerLight, borderColor: colors.danger }]}>
          <Ionicons name="alert-circle" size={14} color={colors.danger} />
          <Text style={[styles.errorText, { color: colors.danger }]}>{errorMessage}</Text>
          <TouchableOpacity onPress={() => setErrorMessage(null)}>
            <Ionicons name="close" size={14} color={colors.danger} />
          </TouchableOpacity>
        </View>
      )}

      {/* Models List */}
      <View style={styles.modelsList}>
        {modelsToDisplay.map((model) => {
          const record = downloadedModels[model.id];
          const isDownloaded = record?.status === 'ready';
          const isDownloading = activeDownloadingModelId === model.id;
          const currentProgress = downloadProgress[model.id] ?? 0;
          const isSLM = model.type === 'slm_reasoning';
          const isActive = isSLM
            ? activeSlmModelId === model.id && isDownloaded
            : activeWhisperModelId === model.id && isDownloaded;

          return (
            <View
              key={model.id}
              style={[
                styles.modelItem,
                {
                  backgroundColor: isActive ? colors.surface : colors.card,
                  borderColor: isActive ? colors.accent : colors.cardBorder,
                },
              ]}>
              {/* Model Info Header */}
              <View style={styles.modelHeader}>
                <View style={styles.modelHeaderLeft}>
                  <View style={styles.nameRow}>
                    <Text style={[styles.modelName, { color: colors.text }]}>{model.name}</Text>
                    <View style={[styles.sizePill, { backgroundColor: colors.surface }]}>
                      <Text style={[styles.sizePillText, { color: colors.textSecondary }]}>
                        {model.formattedSize}
                      </Text>
                    </View>
                    {model.family === 'Gemma' && (
                      <View style={[styles.recommendedPill, { backgroundColor: '#EDE9FE' }]}>
                        <Ionicons name="star" size={10} color="#7C3AED" />
                        <Text style={[styles.recommendedPillText, { color: '#7C3AED' }]}>Recommended</Text>
                      </View>
                    )}
                    {isActive && (
                      <View style={[styles.activePill, { backgroundColor: colors.accent }]}>
                        <Ionicons name="checkmark" size={10} color="#FFFFFF" />
                        <Text style={styles.activePillText}>Active</Text>
                      </View>
                    )}
                  </View>

                  <Text style={[styles.modelDesc, { color: colors.textSecondary }]}>
                    {model.description}
                  </Text>

                  {/* Spec Specs Row */}
                  <View style={styles.specsRow}>
                    <Text style={[styles.specItem, { color: colors.textMuted }]}>
                      RAM: {model.ramUsage}
                    </Text>
                    <Text style={[styles.specDot, { color: colors.textMuted }]}>•</Text>
                    <Text style={[styles.specItem, { color: colors.textMuted }]}>
                      {model.speed}
                    </Text>
                    <Text style={[styles.specDot, { color: colors.textMuted }]}>•</Text>
                    <Text style={[styles.specItem, { color: colors.textMuted }]}>
                      {model.accuracy}
                    </Text>
                  </View>
                </View>

                {/* Action Buttons */}
                <View style={styles.modelActions}>
                  {isDownloading ? (
                    <TouchableOpacity
                      onPress={() => handleCancelPull(model.id)}
                      style={[styles.actionBtn, styles.cancelBtn, { borderColor: colors.danger }]}
                      accessibilityLabel="Cancel download">
                      <Ionicons name="close" size={14} color={colors.danger} />
                      <Text style={[styles.actionBtnText, { color: colors.danger }]}>Cancel</Text>
                    </TouchableOpacity>
                  ) : isDownloaded ? (
                    <View style={styles.downloadedActionsRow}>
                      {!isActive ? (
                        <TouchableOpacity
                          onPress={() => handleSelectActive(model)}
                          style={[styles.actionBtn, { backgroundColor: colors.primary }]}>
                          <Text style={[styles.actionBtnText, { color: colors.primaryText }]}>Use</Text>
                        </TouchableOpacity>
                      ) : (
                        <View style={styles.readyIndicator}>
                          <Ionicons name="checkmark-circle" size={18} color={colors.accent} />
                        </View>
                      )}

                      <TouchableOpacity
                        onPress={() => handleDeleteModel(model.id, model.name, isSLM)}
                        style={[styles.deleteBtn, { backgroundColor: colors.surface }]}
                        accessibilityLabel="Delete model">
                        <Ionicons name="trash-outline" size={14} color={colors.danger} />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity
                      onPress={() => handlePullModel(model)}
                      disabled={activeDownloadingModelId !== null}
                      style={[
                        styles.actionBtn,
                        {
                          backgroundColor:
                            activeDownloadingModelId !== null ? colors.surface : colors.primary,
                        },
                      ]}>
                      <Ionicons
                        name="cloud-download-outline"
                        size={14}
                        color={activeDownloadingModelId !== null ? colors.textMuted : colors.primaryText}
                      />
                      <Text
                        style={[
                          styles.actionBtnText,
                          {
                            color:
                              activeDownloadingModelId !== null ? colors.textMuted : colors.primaryText,
                          },
                        ]}>
                        Pull
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* Progress Bar (when downloading) */}
              {isDownloading && (
                <View style={styles.progressContainer}>
                  <View style={styles.progressTextRow}>
                    <View style={styles.progressLabelRow}>
                      <ActivityIndicator size="small" color={colors.accent} style={{ marginRight: 6 }} />
                      <Text style={[styles.progressText, { color: colors.textSecondary }]}>
                        Pulling weights from HuggingFace Hub...
                      </Text>
                    </View>
                    <Text style={[styles.progressPercent, { color: colors.accent }]}>
                      {currentProgress}%
                    </Text>
                  </View>

                  <View style={[styles.progressBarBg, { backgroundColor: colors.cardBorder }]}>
                    <View
                      style={[
                        styles.progressBarFill,
                        { width: `${currentProgress}%`, backgroundColor: colors.accent },
                      ]}
                    />
                  </View>
                </View>
              )}
            </View>
          );
        })}
      </View>

      {/* Custom Model Pull URL Toggle */}
      <View style={styles.customSection}>
        <TouchableOpacity
          onPress={() => setCustomUrlOpen(!customUrlOpen)}
          style={styles.customToggleRow}>
          <View style={styles.customToggleLeft}>
            <Ionicons name="link-outline" size={14} color={colors.textSecondary} />
            <Text style={[styles.customToggleText, { color: colors.textSecondary }]}>
              Pull from Custom Model URL / GGUF Mirror
            </Text>
          </View>
          <Ionicons
            name={customUrlOpen ? 'chevron-up' : 'chevron-down'}
            size={14}
            color={colors.textSecondary}
          />
        </TouchableOpacity>

        {customUrlOpen && (
          <View style={[styles.customInputContainer, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
            <Text style={[styles.customNotice, { color: colors.textMuted }]}>
              Enter a direct link to a GGUF (Gemma/Llama) or ggml .bin (Whisper) model:
            </Text>
            <TextInput
              value={customUrl}
              onChangeText={setCustomUrl}
              placeholder="https://huggingface.co/.../model.gguf"
              placeholderTextColor={colors.textMuted}
              style={[styles.customInput, { color: colors.text, borderColor: colors.cardBorder }]}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity
              onPress={() => {
                if (!customUrl.trim()) {
                  setErrorMessage('Please enter a valid URL.');
                  return;
                }
                const targetModel = activeTab === 'slm' ? AVAILABLE_SLM_MODELS[0] : AVAILABLE_WHISPER_MODELS[0];
                handlePullModel(targetModel, customUrl.trim());
              }}
              style={[styles.customPullBtn, { backgroundColor: colors.primary }]}>
              <Ionicons name="download-outline" size={14} color={colors.primaryText} />
              <Text style={[styles.customPullBtnText, { color: colors.primaryText }]}>
                Pull from URL
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  embeddedContainer: {
    paddingTop: 8,
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  headerTitleContainer: {
    flex: 1,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  sectionDesc: {
    fontSize: 12,
    lineHeight: 17,
  },
  tabBar: {
    flexDirection: 'row',
    borderRadius: 20,
    borderWidth: 1,
    padding: 4,
    marginBottom: 14,
    gap: 6,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    paddingHorizontal: 8,
    borderRadius: 16,
    gap: 6,
  },
  activeTabBtn: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  tabText: {
    fontSize: 12,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
    gap: 8,
  },
  errorText: {
    fontSize: 12,
    flex: 1,
  },
  modelsList: {
    gap: 12,
  },
  modelItem: {
    borderRadius: 12,
    borderWidth: 1.5,
    padding: 14,
  },
  modelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  modelHeaderLeft: {
    flex: 1,
    marginRight: 12,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 4,
  },
  modelName: {
    fontSize: 14,
    fontWeight: '700',
  },
  sizePill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  sizePillText: {
    fontSize: 11,
    fontWeight: '600',
  },
  recommendedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  recommendedPillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  activePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  activePillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modelDesc: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 8,
  },
  specsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  specItem: {
    fontSize: 11,
    fontWeight: '500',
  },
  specDot: {
    fontSize: 10,
  },
  modelActions: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  downloadedActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  cancelBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1,
  },
  deleteBtn: {
    padding: 7,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  readyIndicator: {
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressContainer: {
    marginTop: 12,
  },
  progressTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  progressLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressText: {
    fontSize: 11,
  },
  progressPercent: {
    fontSize: 11,
    fontWeight: '700',
  },
  progressBarBg: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  customSection: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E2E8F0',
  },
  customToggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  customToggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  customToggleText: {
    fontSize: 12,
    fontWeight: '600',
  },
  customInputContainer: {
    marginTop: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
  },
  customNotice: {
    fontSize: 11,
  },
  customInput: {
    height: 38,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    fontSize: 12,
  },
  customPullBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 8,
  },
  customPullBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
