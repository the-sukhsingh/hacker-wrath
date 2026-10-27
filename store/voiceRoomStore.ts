import { create } from 'zustand';
import {
  VoiceRoom,
  VoiceRoomParticipant,
  VoiceRoomTranscriptItem,
} from '@/types/voiceRoom';

interface VoiceRoomStoreState {
  activeRoom: VoiceRoom | null;
  roomsHistory: VoiceRoom[];
  currentUserId: string;
  currentUserName: string;
  isMicMuted: boolean;
  isHandRaised: boolean;

  // Actions
  createRoom: (title: string, options?: { topic?: string; linkedMeetingId?: string }) => VoiceRoom;
  joinRoom: (roomOrCode: string, participantName?: string) => VoiceRoom | null;
  leaveRoom: () => void;
  endActiveRoom: () => VoiceRoom | null;
  toggleMicMute: (forcedState?: boolean) => boolean;
  toggleHandRaise: () => boolean;
  updateParticipantAudio: (participantId: string, isSpeaking: boolean, audioLevel: number) => void;
  setParticipantMute: (participantId: string, isMuted: boolean) => void;
  addTranscriptItem: (item: Omit<VoiceRoomTranscriptItem, 'id'>) => void;
  updateRoomParticipants: (participants: VoiceRoomParticipant[]) => void;
  getRoomByCodeOrId: (query: string) => VoiceRoom | undefined;
}

const AVATAR_COLORS = [
  '#E06D53', // Coral
  '#4D5C3B', // Olive
  '#80503D', // Terracotta
  '#2D4468', // Slate Blue
  '#8C6C26', // Warm Amber
  '#5C3D7A', // Plum
  '#2F6B58', // Teal
];

function generateInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function generateRoomCode(): string {
  // Generates readable code like "MN-8429"
  const digits = Math.floor(1000 + Math.random() * 9000);
  return `MN-${digits}`;
}

export const useVoiceRoomStore = create<VoiceRoomStoreState>((set, get) => ({
  activeRoom: null,
  roomsHistory: [],
  currentUserId: `user-host-${Math.random().toString(36).slice(2, 7)}`,
  currentUserName: 'Launa Vendrick',
  isMicMuted: false,
  isHandRaised: false,

  createRoom: (title, options) => {
    const { currentUserId, currentUserName } = get();
    const roomId = `room-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const code = generateRoomCode();

    const hostParticipant: VoiceRoomParticipant = {
      id: currentUserId,
      name: currentUserName,
      avatarColor: AVATAR_COLORS[0],
      initials: generateInitials(currentUserName),
      role: 'host',
      isMuted: false,
      isSpeaking: false,
      audioLevel: 0,
      handRaised: false,
      joinedAt: Date.now(),
    };

    const newRoom: VoiceRoom = {
      id: roomId,
      code,
      title: title.trim() || 'Instant Voice Meeting',
      topic: options?.topic,
      hostId: currentUserId,
      hostName: currentUserName,
      status: 'active',
      createdAt: new Date().toISOString(),
      participants: [hostParticipant],
      transcript: [],
      isRecording: true,
      linkedMeetingId: options?.linkedMeetingId,
    };

    set((state) => ({
      activeRoom: newRoom,
      roomsHistory: [newRoom, ...state.roomsHistory.filter((r) => r.id !== newRoom.id)],
      isMicMuted: false,
      isHandRaised: false,
    }));

    return newRoom;
  },

  joinRoom: (roomOrCode, participantName) => {
    const { roomsHistory, currentUserId, currentUserName } = get();
    const cleanQuery = roomOrCode.trim().toUpperCase();
    const name = participantName?.trim() || currentUserName;

    // Search existing room or create dynamic room for code
    let room = roomsHistory.find(
      (r) => r.code.toUpperCase() === cleanQuery || r.id.toLowerCase() === roomOrCode.trim().toLowerCase()
    );

    if (!room) {
      // Dynamic room created on-the-fly for joining peer
      const roomId = `room-${cleanQuery.toLowerCase()}`;
      room = {
        id: roomId,
        code: cleanQuery.startsWith('MN-') ? cleanQuery : `MN-${cleanQuery}`,
        title: `Voice Room ${cleanQuery}`,
        hostId: 'remote-host',
        hostName: 'Room Host',
        status: 'active',
        createdAt: new Date().toISOString(),
        participants: [
          {
            id: 'remote-host',
            name: 'Room Host',
            avatarColor: AVATAR_COLORS[1],
            initials: 'RH',
            role: 'host',
            isMuted: false,
            isSpeaking: false,
            audioLevel: 0,
            handRaised: false,
            joinedAt: Date.now() - 60000,
          },
        ],
        transcript: [],
        isRecording: true,
      };
    }

    // Add current user to participants if not already present
    const existingIndex = room.participants.findIndex((p) => p.id === currentUserId);
    let updatedParticipants = [...room.participants];

    if (existingIndex >= 0) {
      updatedParticipants[existingIndex] = {
        ...updatedParticipants[existingIndex],
        isMuted: false,
      };
    } else {
      const colorIndex = updatedParticipants.length % AVATAR_COLORS.length;
      updatedParticipants.push({
        id: currentUserId,
        name,
        avatarColor: AVATAR_COLORS[colorIndex],
        initials: generateInitials(name),
        role: room.hostId === currentUserId ? 'host' : 'speaker',
        isMuted: false,
        isSpeaking: false,
        audioLevel: 0,
        handRaised: false,
        joinedAt: Date.now(),
      });
    }

    const updatedRoom: VoiceRoom = {
      ...room,
      status: 'active',
      participants: updatedParticipants,
    };

    set((state) => ({
      activeRoom: updatedRoom,
      roomsHistory: [updatedRoom, ...state.roomsHistory.filter((r) => r.id !== updatedRoom.id)],
      isMicMuted: false,
      isHandRaised: false,
    }));

    return updatedRoom;
  },

  leaveRoom: () => {
    const { activeRoom, currentUserId } = get();
    if (!activeRoom) return;

    // Remove user or mark inactive
    const remainingParticipants = activeRoom.participants.filter((p) => p.id !== currentUserId);
    const updatedRoom: VoiceRoom = {
      ...activeRoom,
      participants: remainingParticipants,
    };

    set((state) => ({
      activeRoom: null,
      isMicMuted: false,
      isHandRaised: false,
      roomsHistory: state.roomsHistory.map((r) => (r.id === updatedRoom.id ? updatedRoom : r)),
    }));
  },

  endActiveRoom: () => {
    const { activeRoom } = get();
    if (!activeRoom) return null;

    const endedRoom: VoiceRoom = {
      ...activeRoom,
      status: 'ended',
    };

    set((state) => ({
      activeRoom: null,
      isMicMuted: false,
      isHandRaised: false,
      roomsHistory: state.roomsHistory.map((r) => (r.id === endedRoom.id ? endedRoom : r)),
    }));

    return endedRoom;
  },

  toggleMicMute: (forcedState) => {
    const { activeRoom, currentUserId, isMicMuted } = get();
    const nextState = forcedState !== undefined ? forcedState : !isMicMuted;

    if (activeRoom) {
      const updatedParticipants = activeRoom.participants.map((p) =>
        p.id === currentUserId ? { ...p, isMuted: nextState, isSpeaking: nextState ? false : p.isSpeaking } : p
      );
      set({
        isMicMuted: nextState,
        activeRoom: { ...activeRoom, participants: updatedParticipants },
      });
    } else {
      set({ isMicMuted: nextState });
    }

    return nextState;
  },

  toggleHandRaise: () => {
    const { activeRoom, currentUserId, isHandRaised } = get();
    const nextState = !isHandRaised;

    if (activeRoom) {
      const updatedParticipants = activeRoom.participants.map((p) =>
        p.id === currentUserId ? { ...p, handRaised: nextState } : p
      );
      set({
        isHandRaised: nextState,
        activeRoom: { ...activeRoom, participants: updatedParticipants },
      });
    } else {
      set({ isHandRaised: nextState });
    }

    return nextState;
  },

  updateParticipantAudio: (participantId, isSpeaking, audioLevel) => {
    const { activeRoom } = get();
    if (!activeRoom) return;

    let hasChanged = false;
    const updatedParticipants = activeRoom.participants.map((p) => {
      if (p.id === participantId) {
        if (p.isSpeaking !== isSpeaking || Math.abs(p.audioLevel - audioLevel) > 0.05) {
          hasChanged = true;
          return {
            ...p,
            isSpeaking,
            audioLevel,
          };
        }
      }
      return p;
    });

    if (hasChanged) {
      set({
        activeRoom: {
          ...activeRoom,
          activeSpeakerId: isSpeaking ? participantId : activeRoom.activeSpeakerId,
          participants: updatedParticipants,
        },
      });
    }
  },

  setParticipantMute: (participantId, isMuted) => {
    const { activeRoom } = get();
    if (!activeRoom) return;

    const updatedParticipants = activeRoom.participants.map((p) =>
      p.id === participantId ? { ...p, isMuted, isSpeaking: isMuted ? false : p.isSpeaking } : p
    );

    set({
      activeRoom: { ...activeRoom, participants: updatedParticipants },
    });
  },

  addTranscriptItem: (item) => {
    const { activeRoom } = get();
    if (!activeRoom) return;

    const newItem: VoiceRoomTranscriptItem = {
      ...item,
      id: `tr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    };

    set({
      activeRoom: {
        ...activeRoom,
        transcript: [...activeRoom.transcript, newItem],
      },
    });
  },

  updateRoomParticipants: (participants) => {
    const { activeRoom } = get();
    if (!activeRoom) return;

    set({
      activeRoom: {
        ...activeRoom,
        participants,
      },
    });
  },

  getRoomByCodeOrId: (query) => {
    const { roomsHistory } = get();
    const clean = query.trim().toUpperCase();
    return roomsHistory.find(
      (r) => r.code.toUpperCase() === clean || r.id.toLowerCase() === query.trim().toLowerCase()
    );
  },
}));
