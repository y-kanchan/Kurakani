import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/useAuthStore';

// Declare global YT variable for TypeScript
declare global {
  interface Window {
    onYouTubeIframeAPIReady: () => void;
    YT: any;
  }
}

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuthStore();
  const [isEntering, setIsEntering] = useState(false);
  const [hearts, setHearts] = useState<{ id: number; left: string; delay: string; size: string }[]>([]);
  const [hasInteracted, setHasInteracted] = useState(false);
  const playerRef = useRef<any>(null);

  // Load YouTube IFrame API
  useEffect(() => {
    // Only load if not already loaded
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
    }

    const initPlayer = () => {
      if (playerRef.current) return; // Avoid double init
      
      playerRef.current = new window.YT.Player('youtube-player', {
        height: '1',
        width: '1',
        videoId: 'OsyczbZc1Mg',
        playerVars: {
          autoplay: 1,
          mute: 1, // Start muted to bypass autoplay block
          controls: 0,
          showinfo: 0,
          rel: 0,
          loop: 1,
          playlist: 'OsyczbZc1Mg', // Required for loop
          enablejsapi: 1,
          origin: window.location.origin,
        },
        events: {
          onReady: (event: any) => {
            event.target.playVideo();
            // If already interacted, unmute immediately
            if (hasInteracted) {
              event.target.unMute();
              event.target.setVolume(100);
            }
          },
          onStateChange: (event: any) => {
            // Re-play if ended/paused to ensure looping background music
            if (event.data === window.YT.PlayerState.ENDED) {
              event.target.playVideo();
            }
          }
        },
      });
    };

    window.onYouTubeIframeAPIReady = initPlayer;

    // If script already loaded, it won't trigger onYouTubeIframeAPIReady again
    if (window.YT && window.YT.Player) {
      initPlayer();
    }

    // Generate random floating hearts
    const newHearts = Array.from({ length: 15 }).map((_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      delay: `${Math.random() * 8}s`,
      size: `${Math.random() * 20 + 10}px`,
    }));
    setHearts(newHearts);

    // Click anywhere to unmute (Autoplay workaround)
    const handleFirstInteraction = () => {
      setHasInteracted(true);
      if (playerRef.current && typeof playerRef.current.unMute === 'function') {
        playerRef.current.unMute();
        playerRef.current.setVolume(100);
        playerRef.current.playVideo();
      }
      window.removeEventListener('click', handleFirstInteraction);
      window.removeEventListener('keydown', handleFirstInteraction);
    };

    window.addEventListener('click', handleFirstInteraction);
    window.addEventListener('keydown', handleFirstInteraction);

    // Cleanup on unmount
    return () => {
      window.removeEventListener('click', handleFirstInteraction);
      window.removeEventListener('keydown', handleFirstInteraction);
      if (playerRef.current && typeof playerRef.current.stopVideo === 'function') {
        playerRef.current.stopVideo();
      }
    };
  }, []);

  const handleEnter = () => {
    if (isEntering) return;
    setIsEntering(true);
    
    // Slow fade out music
    if (playerRef.current && typeof playerRef.current.getVolume === 'function') {
      let volume = playerRef.current.getVolume();
      const fadeInterval = setInterval(() => {
        if (volume > 0) {
          volume -= 5;
          playerRef.current.setVolume(Math.max(0, volume));
        } else {
          clearInterval(fadeInterval);
          playerRef.current.stopVideo();
        }
      }, 100); 
    }
    
    // Navigation after fade out
    setTimeout(() => {
      const target = isAuthenticated 
        ? (!user?.profileSetupComplete ? '/profile-setup' : '/dashboard')
        : '/register'; 
      navigate(target);
    }, 2500);
  };

  return (
    <div className="romantic-bg min-h-screen flex items-center justify-center p-6 select-none bg-black">
      {/* Hidden YouTube Player Div */}
      <div id="youtube-player" className="absolute opacity-0 pointer-events-none -z-50" />

      {/* Floating Hearts */}
      {hearts.map((heart) => (
        <span
          key={heart.id}
          className="heart-particle opacity-0"
          style={{
            left: heart.left,
            animationDelay: heart.delay,
            fontSize: heart.size,
          }}
        >
          ❤️
        </span>
      ))}

      {/* Content Container */}
      <div className="max-w-lg w-full text-center space-y-12 z-10 animate-landing-in">
        <div className="relative inline-block">
          {/* Logo with Pink Glow */}
          <div className="logo-pink-glow">
            <img 
              src="/kurakani.png" 
              alt="Kurakani Logo" 
              className="w-48 h-48 md:w-64 md:h-64 object-contain mx-auto transition-transform hover:scale-105 duration-500"
            />
          </div>
          
          {/* Subtitle */}
          <div className="mt-8 space-y-2">
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tighter text-white drop-shadow-lg">
              Kurakani
            </h1>
            <p className="text-pink-400 font-medium tracking-[0.2em] uppercase text-xs md:text-sm animate-pulse">
              Connect with Love & Harmony
            </p>
          </div>
        </div>

        {/* Enter Button */}
        <div className="pt-6">
          <button
            onClick={handleEnter}
            disabled={isEntering}
            className={`
              relative group overflow-hidden px-10 py-5 rounded-full font-bold text-lg 
              transition-all duration-300 transform active:scale-95
              ${isEntering 
                ? 'bg-pink-600/50 text-white/50 cursor-not-allowed scale-95 blur-[1px]' 
                : 'bg-white text-black hover:bg-pink-500 hover:text-white hover:scale-105 shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:shadow-[0_0_30px_rgba(255,77,148,0.6)]'
              }
            `}
          >
            <span className="relative z-10">
              {isEntering ? 'Starting Journey...' : 'Enter the Journey'}
            </span>
            <div className="absolute inset-0 bg-gradient-to-r from-pink-400 to-romantic-deep-pink opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </button>
        </div>

        {/* Footer Text */}
        <p className="text-gray-500 text-xs italic">
          Best experienced with sound
        </p>
      </div>

      {/* Ambient pink glows */}
      <div className="fixed top-0 left-0 w-64 h-64 bg-romantic-pink-glow blur-[120px] rounded-full opacity-20 -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
      <div className="fixed bottom-0 right-0 w-80 h-80 bg-romantic-pink-glow blur-[150px] rounded-full opacity-10 translate-x-1/3 translate-y-1/3 pointer-events-none" />
    </div>
  );
};

export default LandingPage;
