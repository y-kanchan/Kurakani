import React, { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'react-toastify';
import {
  FiSend, FiImage, FiArrowLeft, FiMic,
  FiPhone, FiVideo, FiStopCircle, FiBookmark,
  FiUserPlus, FiLock, FiX, FiChevronDown,
} from 'react-icons/fi';
import { useAuthStore } from '../stores/useAuthStore';
import { useChatStore } from '../stores/useChatStore';
import { useFriendStore } from '../stores/useFriendStore';
import { useNotificationStore } from '../stores/useNotificationStore';
import { messageService } from '../services/messageService';
import { friendService } from '../services/friendService';
import socketService from '../services/socketService';
import Avatar from './Avatar';
import ChatBubble from './ChatBubble';
import { formatLastSeen } from '../utils/dateUtils';
import type { User } from '../stores/useAuthStore';
import type { FriendshipStatus } from '../types';

interface ChatWindowProps {
  onBack: () => void;
  onStartCall?: (type: 'voice' | 'video') => void;
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function getDateLabel(dateStr: string): string {
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const ChatWindow: React.FC<ChatWindowProps> = ({ onBack, onStartCall }) => {
  const { user } = useAuthStore();
  const {
    activeChat, messages, setMessages, addMessage, updateMessage,
    isTyping, typingUserId, setTyping, isLoadingMessages, setLoadingMessages, isSelfChat,
  } = useChatStore();
  const { fetchFriendshipStatus, friendshipStatusCache, setFriendshipStatus } = useFriendStore();
  const { clearUnread } = useNotificationStore();

  const [text, setText] = useState('');
  const [imagePreview, setImagePreview] = useState<{ file: File; url: string } | null>(null);
  const [isSending, setSending] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [showImageViewer, setShowImageViewer] = useState<string | null>(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [friendStatus, setFriendStatus] = useState<FriendshipStatus | null>(null);
  const [isSendingFriendReq, setIsSendingFriendReq] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const handleScroll = () => {
    const el = scrollAreaRef.current;
    if (!el) return;
    setShowScrollBtn(el.scrollHeight - el.scrollTop - el.clientHeight > 200);
  };

  useEffect(() => { scrollToBottom(); }, [messages.length]);

  // ── Fetch messages ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!activeChat) return;
    const fetchMessages = async () => {
      setLoadingMessages(true);
      try {
        const data = isSelfChat
          ? await messageService.getSelfMessages()
          : await messageService.getConversation(activeChat._id);
        setMessages(data);
      } catch {
        toast.error('Failed to load messages');
      } finally {
        setLoadingMessages(false);
      }
    };
    fetchMessages();
    if (!isSelfChat && user) {
      clearUnread(activeChat._id);
      socketService.emitMarkRead(activeChat._id, user._id);
    }
  }, [activeChat?._id, isSelfChat]);

  // ── Friendship status ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!activeChat || isSelfChat || !user) { setFriendStatus(null); return; }
    const cached = friendshipStatusCache[activeChat._id];
    if (cached) setFriendStatus(cached.status);
    fetchFriendshipStatus(activeChat._id).then((d) => setFriendStatus(d.status));
  }, [activeChat?._id, isSelfChat]);

  // ── Typing listener ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!activeChat || isSelfChat) return;
    socketService.onTypingStart(({ senderId }) => {
      if (senderId === activeChat._id) setTyping(true, senderId);
    });
    socketService.onTypingStop(({ senderId }) => {
      if (senderId === activeChat._id) setTyping(false);
    });
    return () => { socketService.offTyping(); };
  }, [activeChat?._id, isSelfChat]);

  // ── Auto-focus ────────────────────────────────────────────────────────────
  useEffect(() => { inputRef.current?.focus(); }, [activeChat?._id]);

  // ── Send message ──────────────────────────────────────────────────────────
  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if ((!text.trim() && !imagePreview) || !activeChat || !user || isSending) return;
    if (!isSelfChat && friendStatus !== 'accepted' && friendStatus !== 'self') return;

    setSending(true);
    try {
      const formData = new FormData();
      formData.append('receiverId', activeChat._id);
      formData.append('text', text.trim());
      if (imagePreview) formData.append('image', imagePreview.file);

      const msg = await messageService.send(formData);
      addMessage(msg);
      setText('');
      setImagePreview(null);
      socketService.sendMessage(msg);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  // ── Typing indicator ──────────────────────────────────────────────────────
  const handleTyping = (val: string) => {
    setText(val);
    if (!activeChat || !user || isSelfChat) return;
    socketService.startTyping(user._id, activeChat._id);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socketService.stopTyping(user._id, activeChat._id);
    }, 1500);
  };

  // ── Image upload ──────────────────────────────────────────────────────────
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { toast.error('Image must be under 10MB'); return; }
    setImagePreview({ file, url: URL.createObjectURL(file) });
  };

  // ── Voice recording ───────────────────────────────────────────────────────
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const file = new File([blob], `voice-${Date.now()}.webm`, { type: 'audio/webm' });
        if (activeChat && user) {
          const formData = new FormData();
          formData.append('receiverId', activeChat._id);
          formData.append('text', '');
          formData.append('voice', file);
          try {
            const msg = await messageService.send(formData);
            addMessage(msg);
            socketService.sendMessage(msg);
          } catch { toast.error('Failed to send voice message'); }
        }
      };
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      recordingIntervalRef.current = setInterval(() => setRecordingTime((t) => t + 1), 1000);
    } catch { toast.error('Microphone access denied'); }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop();
    setIsRecording(false);
    if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
  };

  // ── Delete message ────────────────────────────────────────────────────────
  const handleDelete = async (messageId: string) => {
    try {
      await messageService.deleteMessage(messageId);
      updateMessage(messageId, { deleted: true, text: '' });
    } catch { toast.error('Failed to delete'); }
  };

  // ── Send friend request ───────────────────────────────────────────────────
  const handleSendFriendRequest = async () => {
    if (!activeChat || !user || isSendingFriendReq) return;
    setIsSendingFriendReq(true);
    try {
      const data = await friendService.sendRequest(activeChat._id);
      socketService.emitFriendRequest(activeChat._id, data.request);
      setFriendStatus('pending');
      setFriendshipStatus(activeChat._id, 'pending');
      toast.success(`Friend request sent to ${activeChat.displayName || activeChat.username}!`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to send request');
    } finally {
      setIsSendingFriendReq(false);
    }
  };

  if (!activeChat || !user) return null;
  const canSendMessage = isSelfChat || friendStatus === 'accepted' || friendStatus === 'self';

  // ── Build message list with date separators ───────────────────────────────
  const renderMessages = () => {
    const items: React.ReactNode[] = [];
    let lastDate = '';
    messages.forEach((msg, idx) => {
      const dateLabel = getDateLabel(msg.createdAt);
      if (dateLabel !== lastDate) {
        lastDate = dateLabel;
        items.push(
          <div key={`sep-${idx}`} className="flex items-center gap-3 my-3">
            <div className="flex-1 h-px bg-white/5" />
            <span className="chat-date-separator">{dateLabel}</span>
            <div className="flex-1 h-px bg-white/5" />
          </div>
        );
      }
      items.push(
        <ChatBubble
          key={msg._id}
          message={msg}
          currentUserId={user._id}
          isSelfChat={isSelfChat}
          onDelete={handleDelete}
          onImageClick={(url) => setShowImageViewer(url)}
        />
      );
    });
    return items;
  };

  return (
    <div className="flex flex-col h-full relative">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="glass-header px-4 py-3 flex items-center gap-3 z-10 sticky top-0">
        <button onClick={onBack} className="btn-icon md:hidden w-9 h-9" id="chat-back-btn">
          <FiArrowLeft size={18} />
        </button>

        <div className="relative">
          <Avatar
            src={activeChat.profilePic}
            name={activeChat.displayName || activeChat.username}
            size="md"
            isOnline={isSelfChat ? undefined : activeChat.isOnline}
          />
          {isSelfChat && (
            <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center">
              <FiBookmark size={10} className="text-amber-400" />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-white text-sm leading-tight">
            {isSelfChat ? (
              <span className="flex items-center gap-1.5">
                <FiBookmark size={13} className="text-amber-400" />
                Notes to Self
              </span>
            ) : (
              activeChat.displayName || activeChat.username
            )}
          </h3>
          <p className="text-xs text-gray-500">
            {isSelfChat
              ? 'Your private notes & reminders'
              : isTyping && typingUserId === activeChat._id
              ? <span className="text-pink-400/80">typing...</span>
              : activeChat.isOnline
              ? <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block animate-pulse" />Active now</span>
              : `Last seen ${formatLastSeen(activeChat.lastSeen)}`}
          </p>
        </div>

        {/* Call buttons */}
        {!isSelfChat && friendStatus === 'accepted' && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => onStartCall?.('voice')}
              className="btn-icon w-9 h-9 hover:text-green-400 hover:border-green-400/30 hover:bg-green-400/10"
              title="Voice call"
              id="voice-call-btn"
            >
              <FiPhone size={16} />
            </button>
            <button
              onClick={() => onStartCall?.('video')}
              className="btn-icon w-9 h-9 hover:text-blue-400 hover:border-blue-400/30 hover:bg-blue-400/10"
              title="Video call"
              id="video-call-btn"
            >
              <FiVideo size={16} />
            </button>
          </div>
        )}
      </div>

      {/* ── Messages ────────────────────────────────────────────────────────── */}
      <div
        ref={scrollAreaRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-3 custom-scrollbar"
      >
        {isLoadingMessages ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex items-center gap-3 text-gray-500">
              <svg className="animate-spin h-5 w-5 text-pink-400" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span className="text-sm font-medium">Loading messages...</span>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-20 h-20 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-4">
              {isSelfChat ? (
                <FiBookmark size={28} className="text-amber-400/40" />
              ) : (
                <FiSend size={28} className="text-pink-400/40 rotate-[-30deg]" />
              )}
            </div>
            <p className="text-gray-400 text-sm font-medium">
              {isSelfChat
                ? 'Save your first note, link, or reminder'
                : canSendMessage
                ? `Start chatting with ${activeChat.displayName || activeChat.username}`
                : 'No messages yet'}
            </p>
          </div>
        ) : (
          <div className="space-y-0.5">{renderMessages()}</div>
        )}

        {/* Typing indicator */}
        {isTyping && !isSelfChat && (
          <div className="flex items-center gap-2 px-2 py-1 mt-1">
            <div className="flex items-center gap-1 px-4 py-2.5 bubble-received">
              <div className="typing-dot" />
              <div className="typing-dot" />
              <div className="typing-dot" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ── Scroll to bottom FAB ─────────────────────────────────────────────── */}
      {showScrollBtn && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-24 right-5 w-9 h-9 rounded-full bg-pink-500/80 backdrop-blur-sm border border-pink-500/40 text-white flex items-center justify-center shadow-lg hover:bg-pink-500 transition-all z-20"
        >
          <FiChevronDown size={18} />
        </button>
      )}

      {/* ── Friend-gate banner ───────────────────────────────────────────────── */}
      {!canSendMessage && !isLoadingMessages && (
        <div className="px-4 py-4 border-t border-white/5 bg-white/[0.02]">
          <div className="flex flex-col items-center gap-3 py-4">
            <div className="w-14 h-14 rounded-full bg-pink-500/10 border border-pink-500/20 flex items-center justify-center">
              <FiLock size={22} className="text-pink-400" />
            </div>
            <p className="text-gray-400 text-sm text-center font-medium">
              {friendStatus === 'pending'
                ? 'Friend request sent — waiting for approval'
                : friendStatus === 'incoming'
                ? 'This user sent you a friend request'
                : `You need to be friends with ${activeChat.displayName || activeChat.username} to chat`}
            </p>
            {friendStatus === 'none' && (
              <button
                onClick={handleSendFriendRequest}
                disabled={isSendingFriendReq}
                className="btn-primary py-2.5 px-8 rounded-full text-sm"
                id="friend-gate-add-btn"
              >
                <FiUserPlus size={16} />
                {isSendingFriendReq ? 'Sending...' : 'Add Friend'}
              </button>
            )}
            {friendStatus === 'pending' && (
              <span className="text-xs text-pink-400/60 italic">Request pending...</span>
            )}
          </div>
        </div>
      )}

      {/* ── Input ────────────────────────────────────────────────────────────── */}
      {canSendMessage && (
        <div className="glass-header px-4 py-3 border-t border-white/5">
          {/* Image preview */}
          {imagePreview && (
            <div className="mb-3 relative inline-block">
              <img src={imagePreview.url} alt="preview"
                className="h-28 w-auto rounded-xl border border-white/10 shadow-lg" />
              <button
                onClick={() => { URL.revokeObjectURL(imagePreview.url); setImagePreview(null); }}
                className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-gray-900 border border-gray-700 flex items-center justify-center text-red-400 hover:bg-red-500 hover:text-white transition-colors shadow"
              >
                <FiX size={12} />
              </button>
            </div>
          )}

          {isRecording ? (
            <div className="flex items-center gap-3">
              <div className="flex-1 flex items-center gap-3 px-4 py-3 rounded-2xl bg-red-500/10 border border-red-500/20">
                <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                <span className="text-red-400 font-mono text-sm font-medium">
                  {Math.floor(recordingTime / 60).toString().padStart(2, '0')}:
                  {(recordingTime % 60).toString().padStart(2, '0')}
                </span>
                <span className="text-gray-500 text-xs">Recording...</span>
              </div>
              <button onClick={stopRecording} className="btn-danger w-11 h-11 rounded-2xl">
                <FiStopCircle size={18} />
              </button>
            </div>
          ) : (
              <div className="flex-1 relative flex items-center bg-white/4 border border-white/5 rounded-2xl px-3 group focus-within:border-pink-500/30 transition-all">
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-pink-400 transition-colors"
                  title="Send image"
                >
                  <FiImage size={17} />
                </button>

                <input
                  ref={inputRef}
                  type="text"
                  value={text}
                  onChange={(e) => handleTyping(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
                  }}
                  placeholder={isSelfChat ? 'Write a note...' : `Message ${activeChat.displayName || activeChat.username}...`}
                  className="bg-transparent border-none outline-none flex-1 py-2.5 px-2 text-sm text-white placeholder-gray-600"
                  id="message-input"
                />

                <button
                  type="button"
                  onClick={text.trim() || imagePreview ? handleSend : startRecording}
                  disabled={isSending}
                  className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                    text.trim() || imagePreview
                      ? 'bg-pink-500 text-white shadow-lg shadow-pink-500/20'
                      : 'text-gray-500 hover:text-pink-400'
                  }`}
                  id="send-morph-btn"
                >
                  {text.trim() || imagePreview ? (
                    <FiSend size={16} />
                  ) : (
                    <FiMic size={17} />
                  )}
                </button>
              </div>
          )}
        </div>
      )}

      {/* ── Image viewer overlay ─────────────────────────────────────────────── */}
      {showImageViewer && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setShowImageViewer(null)}
        >
          <button
            className="absolute top-4 right-4 text-white/70 hover:text-white"
            onClick={() => setShowImageViewer(null)}
          >
            <FiX size={28} />
          </button>
          <img
            src={showImageViewer}
            alt="full"
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
          />
        </div>
      )}
    </div>
  );
};

export default ChatWindow;
