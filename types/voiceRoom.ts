export type ParticipantRole = 'host' | 'speaker' | 'listener';

export interface VoiceRoomParticipant {
  id: string;
  name: string;
  avatarColor: string;
  initials: string;
  role: ParticipantRole;
  isMuted: boolean;
  isSpeaking: boolean;
  audioLevel: number; // 0.0 to 1.0 normalized
  handRaised: boolean;
  joinedAt: number;
}

export interface VoiceRoomTranscriptItem {
  id: string;
  speakerId: string;
  speakerName: string;
  text: string;
  timestamp: number;
  isFinal: boolean;
}

export interface VoiceRoom {
  id: string;
  code: string; // 6-char room code, e.g. "MN-4829"
  title: string;
  topic?: string;
  hostId: string;
  hostName: string;
  status: 'active' | 'ended';
  createdAt: string;
  participants: VoiceRoomParticipant[];
  transcript: VoiceRoomTranscriptItem[];
  activeSpeakerId?: string;
  isRecording: boolean;
  linkedMeetingId?: string;
  summaryId?: string;
}

export interface VoiceRoomSignalMessage {
  type: 'join' | 'leave' | 'state_update' | 'chat' | 'transcript' | 'offer' | 'answer' | 'ice_candidate' | 'mute_toggle' | 'hand_raise' | 'room_ended';
  roomId: string;
  senderId: string;
  senderName: string;
  payload?: any;
  timestamp: number;
}
