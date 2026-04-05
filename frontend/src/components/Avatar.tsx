import React from 'react';

interface AvatarProps {
  src?: string;
  name?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  isOnline?: boolean;
  className?: string;
}

const sizeMap = {
  xs: 'w-7 h-7 text-xs',
  sm: 'w-9 h-9 text-sm',
  md: 'w-11 h-11 text-base',
  lg: 'w-14 h-14 text-lg',
  xl: 'w-20 h-20 text-xl',
};

const dotSizeMap = {
  xs: 'w-2 h-2 border',
  sm: 'w-2.5 h-2.5 border',
  md: 'w-3 h-3 border-2',
  lg: 'w-3.5 h-3.5 border-2',
  xl: 'w-4 h-4 border-2',
};

const getInitials = (name: string) => {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

const getGradient = (name: string) => {
  const gradients = [
    'from-pink-400 to-romantic-deep-pink',
    'from-romantic-deep-pink to-purple-600',
    'from-magenta-500 to-pink-500',
    'from-rose-400 to-pink-600',
    'from-fuchsia-500 to-purple-500',
    'from-pink-300 to-pink-500',
  ];
  const index = name.charCodeAt(0) % gradients.length;
  return gradients[index];
};

const Avatar: React.FC<AvatarProps> = ({
  src,
  name = 'U',
  size = 'md',
  isOnline = false,
  className = '',
}) => {
  return (
    <div className={`relative flex-shrink-0 ${className}`}>
      {src ? (
        <img
          src={src.startsWith('/uploads') ? src : src}
          alt={name}
          className={`${sizeMap[size]} rounded-full object-cover ring-2 ring-white/10`}
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
      ) : (
        <div
          className={`${sizeMap[size]} rounded-full bg-gradient-to-br ${getGradient(name)} flex items-center justify-center font-bold text-white ring-2 ring-white/10`}
        >
          {getInitials(name)}
        </div>
      )}
      {isOnline && (
        <span
          className={`absolute bottom-0 right-0 ${dotSizeMap[size]} bg-pink-400 border-gray-950 rounded-full`}
        />
      )}
    </div>
  );
};

export default Avatar;
