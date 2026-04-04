import React, { useState, useEffect } from 'react';
import { FiMic, FiMicOff, FiVideo, FiVideoOff, FiPhoneOff, FiMaximize2 } from 'react-icons/fi';
import type { User } from '../stores/useAuthStore';
import Avatar from './Avatar';

interface VideoCallScreenProps {
  callType: 'voice' | 'video';
  remoteUser: User;
  localVideoRef: React.RefObject<HTMLVideoElement>;
  remoteVideoRef: React.RefObject<HTMLVideoElement>;
  isMuted: boolean;
  isCameraOff: boolean;
  onToggleMute: () => void;
  onToggleCamera: () => void;
  onEndCall: () => void;
}

const VideoCallScreen: React.FC<VideoCallScreenProps> = ({
  callType,
  remoteUser,
  localVideoRef,
  remoteVideoRef,
  isMuted,
  isCameraOff,
  onToggleMute,
  onToggleCamera,
  onEndCall,
}) => {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatElapsed = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-gray-950 flex flex-col animate-fade-in">
      {/* Remote video / avatar */}
      <div className="flex-1 relative flex items-center justify-center">
        {callType === 'video' ? (
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex flex-col items-center gap-4">
            <Avatar
              src={remoteUser.profilePic}
              name={remoteUser.displayName || remoteUser.username}
              size="xl"
              isOnline
            />
            <h2 className="text-2xl font-bold text-white">
              {remoteUser.displayName || remoteUser.username}
            </h2>
            <p className="text-gray-400">{formatElapsed(elapsed)}</p>
          </div>
        )}

        {/* Timer overlay (video mode) */}
        {callType === 'video' && (
          <div className="absolute top-4 left-0 right-0 flex flex-col items-center">
            <h3 className="text-white font-semibold">{remoteUser.displayName || remoteUser.username}</h3>
            <span className="text-sm text-gray-300">{formatElapsed(elapsed)}</span>
          </div>
        )}

        {/* Local video (PiP) */}
        {callType === 'video' && (
          <div className="absolute bottom-24 right-4 w-32 h-48 rounded-xl overflow-hidden border-2 border-white/20 shadow-xl">
            {isCameraOff ? (
              <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                <FiVideoOff size={24} className="text-gray-500" />
              </div>
            ) : (
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover mirror"
                style={{ transform: 'scaleX(-1)' }}
              />
            )}
          </div>
        )}
      </div>

      {/* Controls bar */}
      <div className="glass border-t border-white/05 px-6 py-5 flex items-center justify-center gap-6">
        {/* Mute */}
        <button
          onClick={onToggleMute}
          className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
            isMuted
              ? 'bg-white/20 text-white'
              : 'bg-white/10 text-white hover:bg-white/20'
          }`}
        >
          {isMuted ? <FiMicOff size={22} /> : <FiMic size={22} />}
        </button>

        {/* End call */}
        <button
          onClick={onEndCall}
          className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center hover:bg-red-600 transition-colors shadow-lg shadow-red-500/40"
        >
          <FiPhoneOff size={26} className="text-white rotate-[135deg]" />
        </button>

        {/* Camera (video mode only) */}
        {callType === 'video' && (
          <button
            onClick={onToggleCamera}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
              isCameraOff
                ? 'bg-white/20 text-white'
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            {isCameraOff ? <FiVideoOff size={22} /> : <FiVideo size={22} />}
          </button>
        )}
      </div>
    </div>
  );
};

export default VideoCallScreen;
