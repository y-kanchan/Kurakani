import React, { useEffect, useRef } from 'react';
import { FiX } from 'react-icons/fi';

interface ImageViewerProps {
  url: string;
  onClose: () => void;
}

const ImageViewer: React.FC<ImageViewerProps> = ({ url, onClose }) => {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center animate-fade-in"
      onClick={(e) => e.target === overlayRef.current && onClose()}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 btn-icon bg-white/10 text-white hover:bg-white/20 z-10"
      >
        <FiX size={20} />
      </button>
      <img
        src={url}
        alt="Full size"
        className="max-w-[90vw] max-h-[90vh] object-contain rounded-xl shadow-2xl"
      />
    </div>
  );
};

export default ImageViewer;
