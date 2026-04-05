import React, { useEffect, useRef, useState } from 'react';
import { FiPlay, FiPause } from 'react-icons/fi';

interface VoiceMessagePlayerProps {
  url: string;
  isSent?: boolean;
}

const VoiceMessagePlayer: React.FC<VoiceMessagePlayerProps> = ({ url, isSent = false }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    const audio = new Audio(url);
    audioRef.current = audio;

    audio.onloadedmetadata = () => setDuration(audio.duration);
    audio.ontimeupdate = () => setCurrentTime(audio.currentTime);
    audio.onended = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    return () => {
      audio.pause();
      audio.src = '';
    };
  }, [url]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Generate fake waveform bars
  const bars = Array.from({ length: 28 }, (_, i) => {
    const heights = [30, 50, 70, 40, 90, 60, 80, 45, 65, 55, 75, 35, 85, 50, 70, 40,
                     90, 60, 45, 80, 35, 55, 75, 50, 65, 40, 85, 30];
    return heights[i % heights.length];
  });

  return (
    <div className="flex items-center gap-3 min-w-[200px]">
      <button
        onClick={togglePlay}
        className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 ${
          isSent
            ? 'bg-black/20 text-black hover:bg-black/30'
            : 'bg-pink-500/20 text-pink-400 hover:bg-pink-500/30'
        }`}
      >
        {isPlaying ? <FiPause size={16} /> : <FiPlay size={16} className="ml-0.5" />}
      </button>

      {/* Waveform */}
      <div className="flex items-center gap-[2px] flex-1">
        {bars.map((height, i) => {
          const barProgress = (i / bars.length) * 100;
          const isActive = barProgress <= progress;
          return (
            <div
              key={i}
              className={`w-[3px] rounded-full transition-all duration-100 ${
                isActive
                  ? isSent
                    ? 'bg-black/60'
                    : 'bg-pink-400'
                  : isSent
                  ? 'bg-black/25'
                  : 'bg-white/20'
              }`}
              style={{ height: `${height * 0.3}px` }}
            />
          );
        })}
      </div>

      <span className={`text-xs font-medium ${isSent ? 'text-black/60' : 'text-gray-400'}`}>
        {isPlaying ? formatTime(currentTime) : formatTime(duration)}
      </span>
    </div>
  );
};

export default VoiceMessagePlayer;
