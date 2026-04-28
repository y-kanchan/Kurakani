import React from 'react';
import type { Message } from '../stores/useChatStore';
import type { User } from '../stores/useAuthStore';
import VoiceMessagePlayer from './VoiceMessagePlayer';
import { FiCheck, FiCheckCircle, FiTrash2, FiSmile, FiCornerUpLeft } from 'react-icons/fi';
import { toast } from 'react-toastify';
import { format } from '../utils/dateUtils';

interface ChatBubbleProps {
  message: Message;
  currentUserId: string;
  isSelfChat?: boolean;
  onDelete?: (messageId: string) => void;
  onImageClick?: (url: string) => void;
  onReply?: (message: Message) => void;
  onReact?: (messageId: string, emoji: string) => void;
}

const REACTION_OPTIONS = ['❤️', '😂', '😮', '😢', '🔥', '👍'];

// Detect pure emoji messages (max 3 emojis) for big rendering
const isEmojiOnly = (str: string) =>
  /^[\p{Emoji}\s]+$/u.test(str.trim()) && str.trim().length <= 8;

const ChatBubble: React.FC<ChatBubbleProps> = ({
  message,
  currentUserId,
  isSelfChat = false,
  onDelete,
  onImageClick,
}) => {
  const senderId =
    typeof message.sender === 'string' ? message.sender : (message.sender as User)._id;
  const isSent = isSelfChat ? true : senderId === currentUserId;
  const timeStr = format(new Date(message.createdAt));

  // Deleted state
  if (message.deleted) {
    return (
      <div className={`flex ${isSent ? 'justify-end' : 'justify-start'} mb-1 px-1`}>
        <span className="flex items-center gap-1.5 text-xs text-gray-600 italic bg-white/2 border border-white/5 rounded-full px-3 py-1.5">
          <FiTrash2 size={11} className="opacity-60" />
          Message deleted
        </span>
      </div>
    );
  }

  const isEmoji = isEmojiOnly(message.text || '') && !message.imageUrl && !message.voiceUrl;

  return (
    <div
      className={`flex items-end gap-2 mb-1 animate-fade-in ${
        isSent ? 'flex-row-reverse' : 'flex-row'
      }`}
    >
      {/* Bubble */}
      <div
        className={`group relative max-w-[72%] ${
          isEmoji
            ? 'px-2 py-1'
            : `px-4 py-2.5 ${isSent ? 'bubble-sent' : 'bubble-received'}`
        }`}
      >
        {/* Image */}
        {message.imageUrl && (
          <div className="mb-2">
            <img
              src={message.imageUrl}
              alt="shared"
              className="rounded-xl max-w-[260px] max-h-[320px] object-cover cursor-pointer hover:opacity-90 transition-opacity shadow-lg"
              onClick={() => onImageClick?.(message.imageUrl!)}
            />
          </div>
        )}

        {/* Voice */}
        {message.voiceUrl && <VoiceMessagePlayer url={message.voiceUrl} isSent={isSent} />}

        {/* Text */}
        {message.text && (
          <p
            className={`leading-relaxed break-words ${
              isEmoji ? 'text-4xl' : `text-sm ${isSent ? 'text-white' : 'text-white'}`
            }`}
          >
            {message.text}
          </p>
        )}

        {/* Footer row */}
        {!isEmoji && (
          <div
            className={`flex items-center gap-1 mt-1 ${
              isSent ? 'justify-end' : 'justify-start'
            }`}
          >
            <span className={`text-[10px] ${isSent ? 'text-white/50' : 'text-gray-500'}`}>
              {timeStr}
            </span>
            {isSent && !isSelfChat && (
              message.read ? (
                <FiCheckCircle size={11} className="text-white/60" />
              ) : (
                <FiCheck size={11} className="text-white/35" />
              )
            )}
          </div>
        )}

        {/* Delete button (hover, sender only) */}
        {isSent && onDelete && (
          <button
            onClick={() => onDelete(message._id)}
            className="absolute -top-2 -left-7 opacity-0 group-hover:opacity-100 transition-all bg-gray-900/90 backdrop-blur-sm text-red-400 p-1.5 rounded-full hover:bg-red-500 hover:text-white border border-white/10 shadow-lg z-20"
            title="Delete message"
          >
            <FiTrash2 size={11} />
          </button>
        )}

        {/* Reaction & Reply buttons (hover) */}
        <div className={`absolute top-0 ${isSent ? '-left-14' : '-right-14'} opacity-0 group-hover:opacity-100 transition-all flex items-center gap-1 z-20`}>
          <div className="relative group/picker">
            <button
              className="bg-gray-900/90 backdrop-blur-sm text-gray-400 p-1.5 rounded-full hover:text-pink-400 border border-white/10 shadow-lg"
              title="Add reaction"
            >
              <FiSmile size={13} />
            </button>
            {/* Emoji Picker Popup */}
            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover/picker:flex items-center gap-1 p-1 bg-gray-900/95 border border-white/10 rounded-full shadow-2xl backdrop-blur-md animate-in fade-in zoom-in duration-200">
              {REACTION_OPTIONS.map(emoji => (
                <button
                  key={emoji}
                  onClick={() => {
                    toast.info(`Reacted with ${emoji} (persistence coming soon)`);
                  }}
                  className="w-7 h-7 flex items-center justify-center hover:bg-white/10 rounded-full text-base transition-colors"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={() => toast.info('Reply feature coming soon')}
            className="bg-gray-900/90 backdrop-blur-sm text-gray-400 p-1.5 rounded-full hover:text-blue-400 border border-white/10 shadow-lg"
            title="Reply"
          >
            <FiCornerUpLeft size={13} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatBubble;
