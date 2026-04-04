import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  FiArrowLeft, FiPhone, FiVideo, FiSend, FiImage,
  FiMoreVertical, FiInfo, FiChevronDown,
} from 'react-icons/fi';
import { toast } from 'react-toastify';
import { useChatStore } from '../stores/useChatStore';
import { useAuthStore } from '../stores/useAuthStore';
import { messageService } from '../services/messageService';
import socketService from '../services/socketService';
import ChatBubble from './ChatBubble';
import TypingIndicator from './TypingIndicator';
import VoiceRecorder from './VoiceRecorder';
import ImageViewer from './ImageViewer';
import Avatar from './Avatar';
import { formatLastSeen } from '../utils/dateUtils';
import type { Message } from '../stores/useChatStore';

interface ChatWindowProps {
  onBack: () => void;
  onStartCall: (type: 'voice' | 'video') => void;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ onBack, onStartCall }) => {
  const { user } = useAuthStore();
  const {
    activeChat, messages, isTyping, typingUserId,
    setMessages, addMessage, markMessagesRead,
    setTyping, setLoadingMessages, isLoadingMessages,
    updateMessage,
  } = useChatStore();

  const [text, setText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [imageViewerUrl, setImageViewerUrl] = useState<string | null>(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);

  // ─── Load messages ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!activeChat) return;
    const load = async () => {
      setLoadingMessages(true);
      try {
        const data = await messageService.getConversation(activeChat._id);
        setMessages(data);
        // Mark read
        await messageService.markRead(activeChat._id);
        socketService.emitRead(activeChat._id, user!._id);
      } catch {
        toast.error('Failed to load messages');
      } finally {
        setLoadingMessages(false);
      }
    };
    load();
  }, [activeChat?._id]);

  // ─── Socket listeners for this chat ─────────────────────────────────────
  useEffect(() => {
    if (!activeChat || !user) return;

    socketService.onTypingStart(({ senderId }) => {
      if (senderId === activeChat._id) setTyping(true, senderId);
    });
    socketService.onTypingStop(({ senderId }) => {
      if (senderId === activeChat._id) setTyping(false);
    });
    socketService.onRead(() => {
      markMessagesRead(user._id);
    });

    return () => {
      socketService.offTyping();
    };
  }, [activeChat?._id]);

  // ─── Scroll to bottom ────────────────────────────────────────────────────
  useEffect(() => {
    scrollToBottom();
  }, [messages.length, isTyping]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleScroll = () => {
    if (!messagesContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    setShowScrollBtn(scrollHeight - scrollTop - clientHeight > 200);
  };

  // ─── Typing indicator emission ──────────────────────────────────────────
  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setText(e.target.value);
    if (!user || !activeChat) return;

    if (!isTypingRef.current) {
      isTypingRef.current = true;
      socketService.startTyping(user._id, activeChat._id);
    }
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      isTypingRef.current = false;
      socketService.stopTyping(user._id, activeChat._id);
    }, 1500);
  };

  // ─── Send message ────────────────────────────────────────────────────────
  const sendMessage = async (voiceBlob?: Blob) => {
    if (!activeChat || !user) return;
    if (!text.trim() && !voiceBlob && !imageFile) return;

    setIsSending(true);
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    if (isTypingRef.current) {
      isTypingRef.current = false;
      socketService.stopTyping(user._id, activeChat._id);
    }

    const fd = new FormData();
    fd.append('receiverId', activeChat._id);
    if (text.trim()) fd.append('text', text.trim());
    if (voiceBlob) fd.append('voice', voiceBlob, `voice-${Date.now()}.webm`);
    if (imageFile) fd.append('image', imageFile);

    setText('');
    setImageFile(null);
    setImagePreview(null);

    try {
      const message = await messageService.send(fd);
      addMessage(message);
      socketService.sendMessage(message);
    } catch {
      toast.error('Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Images only'); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error('Max 10MB'); return; }
    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleDeleteMessage = async (messageId: string) => {
    try {
      await messageService.deleteMessage(messageId);
      updateMessage(messageId, { deleted: true, text: '' });
    } catch {
      toast.error('Could not delete message');
    }
  };

  if (!activeChat) return null;

  // Group messages by date separator
  const groupedMessages: { date: string | null; messages: Message[] }[] = [];
  let currentDate = '';
  messages.forEach((msg) => {
    const d = new Date(msg.createdAt);
    const dateStr = d.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
    if (dateStr !== currentDate) {
      currentDate = dateStr;
      groupedMessages.push({ date: dateStr, messages: [msg] });
    } else {
      groupedMessages[groupedMessages.length - 1].messages.push(msg);
    }
  });

  return (
    <div className="flex flex-col h-full bg-dark-bg">
      {/* ── Chat header ─────────────────────────────────────────────────── */}
      <div className="glass border-b border-white/5 px-4 py-3 flex items-center gap-3 flex-shrink-0">
        {/* Mobile back */}
        <button
          onClick={onBack}
          className="md:hidden btn-icon w-8 h-8"
          id="chat-back-btn"
        >
          <FiArrowLeft size={18} />
        </button>

        <Avatar
          src={activeChat.profilePic}
          name={activeChat.displayName || activeChat.username}
          size="sm"
          isOnline={activeChat.isOnline}
        />

        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-white text-sm leading-tight truncate">
            {activeChat.displayName || activeChat.username}
          </h3>
          <p className="text-xs truncate">
            {isTyping && typingUserId === activeChat._id ? (
              <span className="text-cyan-400 font-medium">typing...</span>
            ) : activeChat.isOnline ? (
              <span className="text-green-400">Online</span>
            ) : (
              <span className="text-gray-500">
                Last seen {formatLastSeen(activeChat.lastSeen)}
              </span>
            )}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <button
            id="voice-call-btn"
            onClick={() => onStartCall('voice')}
            className="btn-icon"
            title="Voice call"
          >
            <FiPhone size={17} />
          </button>
          <button
            id="video-call-btn"
            onClick={() => onStartCall('video')}
            className="btn-icon"
            title="Video call"
          >
            <FiVideo size={17} />
          </button>
        </div>
      </div>

      {/* ── Messages area ───────────────────────────────────────────────── */}
      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-1"
      >
        {isLoadingMessages ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex gap-2">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-2.5 h-2.5 rounded-full bg-cyan-500/60 animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Avatar
              src={activeChat.profilePic}
              name={activeChat.displayName || activeChat.username}
              size="xl"
              isOnline={activeChat.isOnline}
            />
            <h4 className="text-white font-bold mt-4">
              {activeChat.displayName || activeChat.username}
            </h4>
            <p className="text-gray-500 text-sm mt-1">
              Start a conversation!
            </p>
          </div>
        ) : (
          <>
            {groupedMessages.map((group) => (
              <React.Fragment key={group.date}>
                {/* Date separator */}
                <div className="flex items-center gap-3 my-4">
                  <div className="flex-1 h-px bg-white/5" />
                  <span className="text-xs text-gray-600 px-2">{group.date}</span>
                  <div className="flex-1 h-px bg-white/5" />
                </div>
                {group.messages.map((msg) => (
                  <ChatBubble
                    key={msg._id}
                    message={msg}
                    currentUserId={user!._id}
                    onDelete={handleDeleteMessage}
                    onImageClick={setImageViewerUrl}
                  />
                ))}
              </React.Fragment>
            ))}
          </>
        )}

        {/* Typing indicator */}
        {isTyping && typingUserId === activeChat._id && <TypingIndicator />}

        <div ref={messagesEndRef} />
      </div>

      {/* Scroll to bottom button */}
      {showScrollBtn && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-24 right-6 w-9 h-9 rounded-full glass border border-white/10 flex items-center justify-center text-gray-400 hover:text-white shadow-lg transition-all animate-scale-in"
        >
          <FiChevronDown size={18} />
        </button>
      )}

      {/* ── Image preview ────────────────────────────────────────────────── */}
      {imagePreview && (
        <div className="px-4 pb-2 flex-shrink-0">
          <div className="relative inline-block">
            <img
              src={imagePreview}
              alt="Preview"
              className="h-20 w-20 rounded-xl object-cover border border-white/10"
            />
            <button
              onClick={() => { setImageFile(null); setImagePreview(null); }}
              className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center"
            >
              <FiMoreVertical size={10} />
            </button>
          </div>
        </div>
      )}

      {/* ── Message input bar ────────────────────────────────────────────── */}
      <div className="glass border-t border-white/5 px-4 py-3 flex items-center gap-2 flex-shrink-0">
        {/* Image attach */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="btn-icon flex-shrink-0"
          title="Send image"
          id="attach-image-btn"
        >
          <FiImage size={18} />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageSelect}
          className="hidden"
        />

        {/* Text input */}
        <input
          id="message-input"
          type="text"
          value={text}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          placeholder={`Message ${activeChat.displayName || activeChat.username}...`}
          className="input-field flex-1 py-2.5"
          disabled={isSending}
          autoComplete="off"
        />

        {/* Voice recorder */}
        <VoiceRecorder
          onRecordingComplete={(blob) => sendMessage(blob)}
          disabled={isSending || !!text.trim() || !!imageFile}
        />

        {/* Send button */}
        <button
          id="send-btn"
          onClick={() => sendMessage()}
          disabled={isSending || (!text.trim() && !imageFile)}
          className="btn-primary py-2.5 px-4 flex-shrink-0"
        >
          <FiSend size={16} />
        </button>
      </div>

      {/* Image viewer modal */}
      {imageViewerUrl && (
        <ImageViewer url={imageViewerUrl} onClose={() => setImageViewerUrl(null)} />
      )}
    </div>
  );
};

export default ChatWindow;
