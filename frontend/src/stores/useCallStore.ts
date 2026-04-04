import { create } from 'zustand';
import type { User } from './useAuthStore';

type CallStatus = 'idle' | 'ringing' | 'connecting' | 'active' | 'ended';
type CallType = 'voice' | 'video';

interface CallState {
  callStatus: CallStatus;
  callType: CallType | null;
  caller: User | null;
  receiver: User | null;
  isIncoming: boolean;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isMuted: boolean;
  isCameraOff: boolean;
  callStartTime: Date | null;
  incomingOffer: RTCSessionDescriptionInit | null;

  setCallStatus: (status: CallStatus) => void;
  initiateCall: (receiver: User, callType: CallType) => void;
  receiveCall: (caller: User, callType: CallType, offer: RTCSessionDescriptionInit) => void;
  setLocalStream: (stream: MediaStream | null) => void;
  setRemoteStream: (stream: MediaStream | null) => void;
  toggleMute: () => void;
  toggleCamera: () => void;
  setCallStartTime: () => void;
  endCallState: () => void;
}

export const useCallStore = create<CallState>((set, get) => ({
  callStatus: 'idle',
  callType: null,
  caller: null,
  receiver: null,
  isIncoming: false,
  localStream: null,
  remoteStream: null,
  isMuted: false,
  isCameraOff: false,
  callStartTime: null,
  incomingOffer: null,

  setCallStatus: (status) => set({ callStatus: status }),

  initiateCall: (receiver, callType) =>
    set({
      callStatus: 'ringing',
      callType,
      receiver,
      isIncoming: false,
    }),

  receiveCall: (caller, callType, offer) =>
    set({
      callStatus: 'ringing',
      callType,
      caller,
      isIncoming: true,
      incomingOffer: offer,
    }),

  setLocalStream: (stream) => set({ localStream: stream }),
  setRemoteStream: (stream) => set({ remoteStream: stream }),

  toggleMute: () => {
    const isMuted = !get().isMuted;
    set({ isMuted });
  },

  toggleCamera: () => {
    const isCameraOff = !get().isCameraOff;
    set({ isCameraOff });
  },

  setCallStartTime: () => set({ callStartTime: new Date() }),

  endCallState: () =>
    set({
      callStatus: 'idle',
      callType: null,
      caller: null,
      receiver: null,
      isIncoming: false,
      localStream: null,
      remoteStream: null,
      isMuted: false,
      isCameraOff: false,
      callStartTime: null,
      incomingOffer: null,
    }),
}));
