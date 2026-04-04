import React, { useEffect, useRef } from 'react';
import { FiPhoneCall, FiPhoneOff, FiVideo, FiPhone } from 'react-icons/fi';
import { useCallStore } from '../stores/useCallStore';
import { useAuthStore } from '../stores/useAuthStore';
import socketService from '../services/socketService';
import webrtcService from '../services/webrtcService';
import Avatar from './Avatar';
import VideoCallScreen from './VideoCallScreen';

const CallModal: React.FC = () => {
  const {
    callStatus,
    callType,
    caller,
    receiver,
    isIncoming,
    incomingOffer,
    localStream,
    remoteStream,
    isMuted,
    isCameraOff,
    setCallStatus,
    setLocalStream,
    setRemoteStream,
    toggleMute,
    toggleCamera,
    setCallStartTime,
    endCallState,
    receiveCall,
  } = useCallStore();

  const { user } = useAuthStore();
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  // Listen for incoming calls
  useEffect(() => {
    socketService.onIncomingCall((data) => {
      const callerUser = data.callerInfo as any;
      receiveCall(callerUser, data.callType, data.offer);
    });

    socketService.onCallAnswered(async (data) => {
      await webrtcService.setRemoteAnswer(data.answer);
      setCallStatus('active');
      setCallStartTime();
    });

    socketService.onCallRejected(() => {
      endCall();
    });

    socketService.onCallEnded(() => {
      endCall();
    });

    socketService.onIceCandidate(async (data) => {
      await webrtcService.addIceCandidate(data.candidate as unknown as RTCIceCandidateInit);
    });

    return () => {
      socketService.offCallEvents();
    };
  }, []);

  // Attach local stream to video element
  useEffect(() => {
    if (localStream && localVideoRef.current) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // Attach remote stream to video element
  useEffect(() => {
    if (remoteStream && remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  const acceptCall = async () => {
    if (!incomingOffer || !caller || !user) return;
    try {
      const stream = await webrtcService.getLocalStream(callType!);
      setLocalStream(stream);

      const pc = webrtcService.createPeerConnection(
        (stream) => setRemoteStream(stream),
        (candidate) => socketService.sendIceCandidate(caller._id, candidate)
      );

      const answer = await webrtcService.createAnswer(incomingOffer);
      socketService.answerCall({ to: caller._id, from: user._id, answer });
      setCallStatus('active');
      setCallStartTime();
    } catch (err) {
      console.error('Accept call error:', err);
      endCall();
    }
  };

  const rejectCall = () => {
    if (caller && user) {
      socketService.rejectCall({ to: caller._id, from: user._id });
    }
    endCall();
  };

  const endCall = () => {
    webrtcService.endCall();
    const otherUser = isIncoming ? caller : receiver;
    if (otherUser) socketService.endCall(otherUser._id);
    endCallState();
  };

  if (callStatus === 'idle') return null;

  const displayUser = isIncoming ? caller : receiver;

  // Active call - show video/voice screen
  if (callStatus === 'active') {
    return (
      <VideoCallScreen
        callType={callType!}
        remoteUser={displayUser!}
        localVideoRef={localVideoRef}
        remoteVideoRef={remoteVideoRef}
        isMuted={isMuted}
        isCameraOff={isCameraOff}
        onToggleMute={() => {
          webrtcService.toggleAudio(isMuted);
          toggleMute();
        }}
        onToggleCamera={() => {
          webrtcService.toggleVideo(isCameraOff);
          toggleCamera();
        }}
        onEndCall={endCall}
      />
    );
  }

  // Ringing UI
  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center animate-fade-in">
      <div className="glass-card rounded-3xl p-8 flex flex-col items-center gap-6 w-[320px] animate-scale-in text-center">
        {/* Call type icon */}
        <div className="w-12 h-12 rounded-full bg-cyan-500/20 flex items-center justify-center">
          {callType === 'video' ? (
            <FiVideo size={22} className="text-cyan-400" />
          ) : (
            <FiPhone size={22} className="text-cyan-400" />
          )}
        </div>

        {/* Caller info */}
        <div className="relative">
          {/* Pulse rings */}
          <div className="absolute inset-0 rounded-full bg-cyan-500/20 animate-ping" />
          <Avatar
            src={displayUser?.profilePic}
            name={displayUser?.displayName || displayUser?.username}
            size="xl"
            isOnline
          />
        </div>

        <div>
          <h3 className="text-xl font-bold text-white">
            {displayUser?.displayName || displayUser?.username}
          </h3>
          <p className="text-sm text-gray-400 mt-1">
            {isIncoming
              ? `Incoming ${callType} call...`
              : `Calling... ${callType === 'video' ? 'video' : 'voice'}`}
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-8">
          {isIncoming && (
            <button
              onClick={acceptCall}
              className="flex flex-col items-center gap-2 group"
              id="accept-call-btn"
            >
              <div className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center shadow-lg shadow-green-500/40 group-hover:scale-110 transition-transform">
                <FiPhoneCall size={24} className="text-white" />
              </div>
              <span className="text-xs text-gray-400">Accept</span>
            </button>
          )}
          <button
            onClick={isIncoming ? rejectCall : endCall}
            className="flex flex-col items-center gap-2 group"
            id="reject-call-btn"
          >
            <div className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center shadow-lg shadow-red-500/40 group-hover:scale-110 transition-transform">
              <FiPhoneOff size={24} className="text-white rotate-[135deg]" />
            </div>
            <span className="text-xs text-gray-400">
              {isIncoming ? 'Decline' : 'Cancel'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default CallModal;
