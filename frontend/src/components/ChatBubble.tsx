import React from 'react';
import type { Message } from '../stores/useChatStore';
import type { User } from '../stores/useAuthStore';
import VoiceMessagePlayer from './VoiceMessagePlayer';
import { FiCheck, FiCheckCircle, FiTrash2 } from 'react-icons/fi';
import { format, isToday, isYesterday } from '../utils/dateUtils';

interface ChatBubbleProps {
  message: Message;
  currentUserId: string;
  isSelfChat?: boolean;
  onDelete?: (messageId: string) => void;
  onImageClick?: (url: string) => void;
}

const ChatBubble: React.FC<ChatBubbleProps> = ({
  message,
  currentUserId,
  isSelfChat = false,
  onDelete,
  onImageClick,
}) => {
  const senderId = typeof message.sender === 'string' ? message.sender : (message.sender as User)._id;
  // In self-chat, all messages are from the user — always show as sent (right side)
  const isSent = isSelfChat ? true : senderId === currentUserId;

  const timeStr = format(new Date(message.createdAt));

  if (message.deleted) {
    return (
      <div className={`flex ${isSent ? 'justify-end' : 'justify-start'} mb-1`}>
        <span className="text-xs text-gray-500 italic px-3 py-1.5">
          🗑 Message was deleted
        </span>
      </div>
    );
  }

  return (
    <div
      className={`flex items-end gap-2 mb-1 animate-fade-in ${
        isSent ? 'flex-row-reverse' : 'flex-row'
      }`}
    >
      {/* Bubble */}
      <div
        className={`group relative max-w-[70%] px-4 py-2.5 ${
          isSent ? 'bubble-sent' : 'bubble-received'
        }`}
      >
        {/* Image */}
        {message.imageUrl && (
          <div className="mb-2">
            <img
              src={message.imageUrl}
              alt="shared"
              className="rounded-lg max-w-[240px] max-h-[300px] object-cover cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => onImageClick?.(message.imageUrl!)}
            />
          </div>
        )}

        {/* Voice */}
        {message.voiceUrl && (
          <VoiceMessagePlayer url={message.voiceUrl} isSent={isSent} />
        )}

        {/* Text */}
        {message.text && (
          <p className={`text-sm leading-relaxed break-words ${isSent ? 'text-black' : 'text-white'}`}>
            {message.text}
          </p>
        )}

        {/* Footer row */}
        <div className={`flex items-center gap-1 mt-1 ${isSent ? 'justify-end' : 'justify-start'}`}>
          <span className={`text-[10px] ${isSent ? 'text-black/50' : 'text-gray-500'}`}>
            {timeStr}
          </span>
          {isSent && !isSelfChat && (
            message.read
              ? <FiCheckCircle size={11} className="text-black/60" />
              : <FiCheck size={11} className="text-black/40" />
          )}
        </div>

        {/* Delete button (hover, only for sent) */}
        {isSent && onDelete && (
          <button
            onClick={() => onDelete(message._id)}
            className="absolute -top-2 -left-7 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-800 text-red-400 p-1 rounded-full hover:bg-red-500 hover:text-white"
          >
            <FiTrash2 size={12} />
          </button>
        )}
      </div>
    </div>
  );
};

export default ChatBubble;
