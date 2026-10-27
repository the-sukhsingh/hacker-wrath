import { Platform } from 'react-native';
import { useVoiceRoomStore } from '@/store/voiceRoomStore';
import { realtimeTranscriptionService } from './realtimeTranscriptionService';
import { VoiceRoomParticipant, VoiceRoomSignalMessage } from '@/types/voiceRoom';

const STUN_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

class VoiceRoomService {
  private localStream: any = null;
  private audioContext: any = null;
  private analyserNode: any = null;
  private vadInterval: ReturnType<typeof setInterval> | null = null;
  private broadcastChannel: any = null;
  private peerConnections: Map<string, any> = new Map();
  private remoteAudioElements: Map<string, any> = new Map();
  private isMuted: boolean = false;
  private currentRoomId: string | null = null;
  private isJoined: boolean = false;
  private lastSpeakingTick: number = 0;

  constructor() {
    this.initBroadcastChannel();
  }

  private initBroadcastChannel() {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.broadcastChannel = new (window as any).BroadcastChannel('meetanotes_voice_mesh');
        this.broadcastChannel.onmessage = (event: MessageEvent) => {
          this.handleIncomingSignal(event.data);
        };
      } catch (err) {
        console.warn('BroadcastChannel not available:', err);
      }
    }
  }

  /**
   * Start local voice capture and join the room mesh
   */
  async joinVoiceRoom(roomId: string, participant: VoiceRoomParticipant): Promise<boolean> {
    this.currentRoomId = roomId;
    this.isJoined = true;
    this.isMuted = participant.isMuted;

    try {
      // 1. Initialize local microphone audio
      await this.initMicrophone();

      // 2. Start real-time speech transcription
      this.startTranscription(participant.name);

      // 3. Broadcast join signal to peers
      this.sendSignal({
        type: 'join',
        roomId,
        senderId: participant.id,
        senderName: participant.name,
        payload: participant,
        timestamp: Date.now(),
      });

      return true;
    } catch (err) {
      console.warn('Voice room join warning:', err);
      return false;
    }
  }

  /**
   * Leave the current voice room and release all audio/network resources
   */
  leaveVoiceRoom(roomId: string, participantId: string, participantName: string) {
    if (!this.isJoined) return;

    // Send leave signal
    this.sendSignal({
      type: 'leave',
      roomId,
      senderId: participantId,
      senderName: participantName,
      timestamp: Date.now(),
    });

    this.stopTranscription();
    this.stopMicrophone();
    this.closeAllPeerConnections();

    this.currentRoomId = null;
    this.isJoined = false;
  }

  /**
   * Toggle hardware mic mute state
   */
  setMute(isMuted: boolean, participantId: string, participantName: string) {
    this.isMuted = isMuted;

    // Disable local audio track
    if (this.localStream) {
      try {
        const audioTracks = this.localStream.getAudioTracks?.() || [];
        audioTracks.forEach((track: any) => {
          track.enabled = !isMuted;
        });
      } catch {
        // Ignored
      }
    }

    if (this.currentRoomId) {
      this.sendSignal({
        type: 'mute_toggle',
        roomId: this.currentRoomId,
        senderId: participantId,
        senderName: participantName,
        payload: { isMuted },
        timestamp: Date.now(),
      });
    }

    if (isMuted) {
      useVoiceRoomStore.getState().updateParticipantAudio(participantId, false, 0);
    }
  }

  /**
   * Notify peers of raised hand
   */
  sendHandRaise(handRaised: boolean, participantId: string, participantName: string) {
    if (this.currentRoomId) {
      this.sendSignal({
        type: 'hand_raise',
        roomId: this.currentRoomId,
        senderId: participantId,
        senderName: participantName,
        payload: { handRaised },
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Host ends the room for all participants
   */
  endRoom(roomId: string, hostId: string, hostName: string) {
    this.sendSignal({
      type: 'room_ended',
      roomId,
      senderId: hostId,
      senderName: hostName,
      timestamp: Date.now(),
    });

    this.leaveVoiceRoom(roomId, hostId, hostName);
  }

  /**
   * Initialize microphone and Web Audio API VAD (Voice Activity Detection)
   */
  private async initMicrophone() {
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
          video: false,
        });

        this.localStream = stream;

        // Set initial mute state on tracks
        const tracks = stream.getAudioTracks();
        tracks.forEach((t) => {
          t.enabled = !this.isMuted;
        });

        // Set up real-time audio volume analysis for speaking ripple indicators
        const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          const ctx = new AudioCtx();
          const source = ctx.createMediaStreamSource(stream);
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 256;
          analyser.smoothingTimeConstant = 0.4;
          source.connect(analyser);

          this.audioContext = ctx;
          this.analyserNode = analyser;

          this.startVadLoop();
        }
      } catch (err) {
        console.warn('Could not acquire local audio stream:', err);
      }
    }
  }

  /**
   * Continuous high-frequency volume monitor for speech detection & visual waveforms
   */
  private startVadLoop() {
    if (this.vadInterval) clearInterval(this.vadInterval);

    const dataArray = new Uint8Array(128);

    this.vadInterval = setInterval(() => {
      if (!this.analyserNode || this.isMuted || !this.currentRoomId) {
        return;
      }

      this.analyserNode.getByteFrequencyData(dataArray);

      // Compute RMS volume
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i];
      }
      const avg = sum / dataArray.length;
      const normalizedLevel = Math.min(avg / 128, 1);

      const isSpeaking = normalizedLevel > 0.08;
      const currentUserId = useVoiceRoomStore.getState().currentUserId;

      if (isSpeaking) {
        this.lastSpeakingTick = Date.now();
        useVoiceRoomStore.getState().updateParticipantAudio(currentUserId, true, normalizedLevel);

        // Broadcast active speaking state to other peers periodically
        this.broadcastSpeakingState(currentUserId, true, normalizedLevel);
      } else if (Date.now() - this.lastSpeakingTick > 400) {
        useVoiceRoomStore.getState().updateParticipantAudio(currentUserId, false, 0);
        this.broadcastSpeakingState(currentUserId, false, 0);
      }
    }, 120);
  }

  private broadcastSpeakingState(senderId: string, isSpeaking: boolean, audioLevel: number) {
    if (!this.currentRoomId) return;

    this.sendSignal({
      type: 'state_update',
      roomId: this.currentRoomId,
      senderId,
      senderName: useVoiceRoomStore.getState().currentUserName,
      payload: { isSpeaking, audioLevel },
      timestamp: Date.now(),
    });
  }

  /**
   * Start live transcription during the voice room
   */
  private startTranscription(speakerName: string) {
    realtimeTranscriptionService.start({
      meetingTitle: 'Voice Room Call',
      onTranscriptUpdate: (newChunk, fullTranscript) => {
        if (!this.currentRoomId || !newChunk.trim()) return;

        const currentUserId = useVoiceRoomStore.getState().currentUserId;
        const transcriptText = newChunk.trim();

        // Add to local store
        useVoiceRoomStore.getState().addTranscriptItem({
          speakerId: currentUserId,
          speakerName,
          text: transcriptText,
          timestamp: Date.now(),
          isFinal: true,
        });

        // Broadcast transcript segment to all room participants
        this.sendSignal({
          type: 'transcript',
          roomId: this.currentRoomId,
          senderId: currentUserId,
          senderName: speakerName,
          payload: { text: transcriptText },
          timestamp: Date.now(),
        });
      },
    });
  }

  private stopTranscription() {
    realtimeTranscriptionService.stop();
  }

  private stopMicrophone() {
    if (this.vadInterval) {
      clearInterval(this.vadInterval);
      this.vadInterval = null;
    }

    if (this.audioContext) {
      try {
        this.audioContext.close();
      } catch {
        // Ignored
      }
      this.audioContext = null;
    }

    if (this.localStream) {
      try {
        const tracks = this.localStream.getTracks?.() || [];
        tracks.forEach((track: any) => track.stop());
      } catch {
        // Ignored
      }
      this.localStream = null;
    }
  }

  /**
   * WebRTC Signaling Dispatcher
   */
  private sendSignal(message: VoiceRoomSignalMessage) {
    // 1. BroadcastChannel for local/multi-tab sync
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage(message);
      } catch {
        // Ignored
      }
    }

    // 2. LocalStorage event bus fallback for cross-window syncing
    if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem('meetanotes_voice_signal', JSON.stringify({ ...message, _rand: Math.random() }));
      } catch {
        // Ignored
      }
    }
  }

  /**
   * Handle incoming WebRTC and room signal messages
   */
  private handleIncomingSignal(msg: VoiceRoomSignalMessage) {
    if (!msg || !this.currentRoomId || msg.roomId !== this.currentRoomId) return;

    const currentUserId = useVoiceRoomStore.getState().currentUserId;
    if (msg.senderId === currentUserId) return; // Ignore own echoes

    const store = useVoiceRoomStore.getState();
    const activeRoom = store.activeRoom;
    if (!activeRoom) return;

    switch (msg.type) {
      case 'join': {
        const newPeer = msg.payload as VoiceRoomParticipant;
        if (newPeer && !activeRoom.participants.some((p) => p.id === newPeer.id)) {
          store.updateRoomParticipants([...activeRoom.participants, newPeer]);
          // Respond to the new peer so they know we exist
          this.sendSignal({
            type: 'state_update',
            roomId: this.currentRoomId,
            senderId: currentUserId,
            senderName: store.currentUserName,
            payload: {
              participant: activeRoom.participants.find((p) => p.id === currentUserId),
            },
            timestamp: Date.now(),
          });

          // Create WebRTC peer connection on web
          this.initiateWebRTCPeerConnection(newPeer.id, true);
        }
        break;
      }

      case 'leave': {
        store.updateRoomParticipants(activeRoom.participants.filter((p) => p.id !== msg.senderId));
        this.closePeerConnection(msg.senderId);
        break;
      }

      case 'state_update': {
        if (msg.payload?.isSpeaking !== undefined) {
          store.updateParticipantAudio(msg.senderId, msg.payload.isSpeaking, msg.payload.audioLevel || 0);
        }
        if (msg.payload?.participant) {
          const peer = msg.payload.participant;
          if (!activeRoom.participants.some((p) => p.id === peer.id)) {
            store.updateRoomParticipants([...activeRoom.participants, peer]);
            this.initiateWebRTCPeerConnection(peer.id, false);
          }
        }
        break;
      }

      case 'mute_toggle': {
        if (msg.payload?.isMuted !== undefined) {
          store.setParticipantMute(msg.senderId, msg.payload.isMuted);
        }
        break;
      }

      case 'hand_raise': {
        const updated = activeRoom.participants.map((p) =>
          p.id === msg.senderId ? { ...p, handRaised: !!msg.payload?.handRaised } : p
        );
        store.updateRoomParticipants(updated);
        break;
      }

      case 'transcript': {
        if (msg.payload?.text) {
          store.addTranscriptItem({
            speakerId: msg.senderId,
            speakerName: msg.senderName,
            text: msg.payload.text,
            timestamp: msg.timestamp || Date.now(),
            isFinal: true,
          });
        }
        break;
      }

      case 'offer': {
        this.handleWebRTCOffer(msg.senderId, msg.payload);
        break;
      }

      case 'answer': {
        this.handleWebRTCAnswer(msg.senderId, msg.payload);
        break;
      }

      case 'ice_candidate': {
        this.handleWebRTCIceCandidate(msg.senderId, msg.payload);
        break;
      }

      case 'room_ended': {
        store.endActiveRoom();
        break;
      }
    }
  }

  /**
   * WebRTC P2P Voice Mesh Handshake
   */
  private async initiateWebRTCPeerConnection(peerId: string, isInitiator: boolean) {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const RTCPeer = (window as any).RTCPeerConnection || (window as any).webkitRTCPeerConnection;
    if (!RTCPeer) return;

    try {
      const pc = new RTCPeer(STUN_SERVERS);
      this.peerConnections.set(peerId, pc);

      // Add local audio track
      if (this.localStream) {
        this.localStream.getAudioTracks().forEach((track: any) => {
          pc.addTrack(track, this.localStream);
        });
      }

      // Handle ICE candidates
      pc.onicecandidate = (event: any) => {
        if (event.candidate && this.currentRoomId) {
          this.sendSignal({
            type: 'ice_candidate',
            roomId: this.currentRoomId,
            senderId: useVoiceRoomStore.getState().currentUserId,
            senderName: useVoiceRoomStore.getState().currentUserName,
            payload: event.candidate,
            timestamp: Date.now(),
          });
        }
      };

      // Play remote audio when received
      pc.ontrack = (event: any) => {
        const remoteStream = event.streams[0];
        if (remoteStream) {
          let audioEl = this.remoteAudioElements.get(peerId);
          if (!audioEl) {
            audioEl = document.createElement('audio');
            audioEl.autoplay = true;
            audioEl.setAttribute('playsinline', 'true');
            document.body.appendChild(audioEl);
            this.remoteAudioElements.set(peerId, audioEl);
          }
          audioEl.srcObject = remoteStream;
        }
      };

      if (isInitiator) {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        if (this.currentRoomId) {
          this.sendSignal({
            type: 'offer',
            roomId: this.currentRoomId,
            senderId: useVoiceRoomStore.getState().currentUserId,
            senderName: useVoiceRoomStore.getState().currentUserName,
            payload: offer,
            timestamp: Date.now(),
          });
        }
      }
    } catch (err) {
      console.warn('WebRTC peer connection error:', err);
    }
  }

  private async handleWebRTCOffer(peerId: string, offer: any) {
    let pc = this.peerConnections.get(peerId);
    if (!pc) {
      await this.initiateWebRTCPeerConnection(peerId, false);
      pc = this.peerConnections.get(peerId);
    }

    if (!pc) return;

    try {
      await pc.setRemoteDescription(new (window as any).RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      if (this.currentRoomId) {
        this.sendSignal({
          type: 'answer',
          roomId: this.currentRoomId,
          senderId: useVoiceRoomStore.getState().currentUserId,
          senderName: useVoiceRoomStore.getState().currentUserName,
          payload: answer,
          timestamp: Date.now(),
        });
      }
    } catch (err) {
      console.warn('Error handling WebRTC offer:', err);
    }
  }

  private async handleWebRTCAnswer(peerId: string, answer: any) {
    const pc = this.peerConnections.get(peerId);
    if (pc) {
      try {
        await pc.setRemoteDescription(new (window as any).RTCSessionDescription(answer));
      } catch (err) {
        console.warn('Error handling WebRTC answer:', err);
      }
    }
  }

  private async handleWebRTCIceCandidate(peerId: string, candidate: any) {
    const pc = this.peerConnections.get(peerId);
    if (pc) {
      try {
        await pc.addIceCandidate(new (window as any).RTCIceCandidate(candidate));
      } catch (err) {
        console.warn('Error adding ICE candidate:', err);
      }
    }
  }

  private closePeerConnection(peerId: string) {
    const pc = this.peerConnections.get(peerId);
    if (pc) {
      try {
        pc.close();
      } catch {
        // Ignored
      }
      this.peerConnections.delete(peerId);
    }

    const audioEl = this.remoteAudioElements.get(peerId);
    if (audioEl) {
      try {
        audioEl.srcObject = null;
        audioEl.remove();
      } catch {
        // Ignored
      }
      this.remoteAudioElements.delete(peerId);
    }
  }

  private closeAllPeerConnections() {
    this.peerConnections.forEach((pc) => {
      try {
        pc.close();
      } catch {
        // Ignored
      }
    });
    this.peerConnections.clear();

    this.remoteAudioElements.forEach((el) => {
      try {
        el.srcObject = null;
        el.remove();
      } catch {
        // Ignored
      }
    });
    this.remoteAudioElements.clear();
  }
}

export const voiceRoomService = new VoiceRoomService();
