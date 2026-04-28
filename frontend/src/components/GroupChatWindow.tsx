import React, { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'react-toastify';
import {
  FiSend, FiImage, FiArrowLeft, FiTrash2, FiMic, FiInfo,
  FiPhone, FiVideo, FiMoreVertical, FiStopCircle, FiX, FiUsers,
} from 'react-icons/fi';
import { useAuthStore } from '../stores/useAuthStore';
import { useGroupStore, type GroupMessage } from '../stores/useGroupStore';
import { groupService } from '../services/groupService';
import socketService from '../services/socketService';
import Avatar from './Avatar';
import VoiceMessagePlayer from './VoiceMessagePlayer';
import GroupInfoPanel from './GroupInfoPanel';
import GroupCallModal from './GroupCallModal';
import { format } from '../utils/dateUtils';

interface GroupChatWindowProps {
  onBack: () => void;
  onStartCall?: (type: 'voice' | 'video') => void;
}

// ── Date separator helper ────────────────────────────────────────────────────
function getDateLabel(dateStr: string): string {
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ── Is pure emoji ────────────────────────────────────────────────────────────
const emojiOnly = (str: string) => /^[\p{Emoji}\s]+$/u.test(str.trim()) && str.trim().length <= 6;

const GroupChatWindow: React.FC<GroupChatWindowProps> = ({ onBack, onStartCall }) => {
  const { user } = useAuthStore();
  const { activeGroup, groupMessages, setGroupMessages, addGroupMessage, isLoadingGroupMessages,
    setLoadingGroupMessages, groupTyping, setGroupTyping } = useGroupStore();

  const [text, setText] = useState('');
  const [isSending, setSending] = useState(false);
  const [imagePreview, setImagePreview] = useState<{ file: File; url: string } | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [showInfo, setShowInfo] = useState(false);
  const [showImageViewer, setShowImageViewer] = useState<string | null>(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [showCallModal, setShowCallModal] = useState(false);
  const [pendingCallType, setPendingCallType] = useState<'voice' | 'video'>('voice');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const messages: GroupMessage[] = activeGroup ? (groupMessages[activeGroup._id] || []) : [];

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // ── Track scroll to show/hide FAB ─────────────────────────────────────────
  const handleScroll = () => {
    const el = scrollAreaRef.current;
    if (!el) return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setShowScrollBtn(distFromBottom > 200);
  };

  useEffect(() => { scrollToBottom(); }, [messages.length]);

  // ── Fetch messages ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!activeGroup) return;
    const fetchMessages = async () => {
      setLoadingGroupMessages(true);
      try {
        const data = await groupService.getGroupMessages(activeGroup._id);
        setGroupMessages(activeGroup._id, data);
      } catch {
        toast.error('Failed to load messages');
      } finally {
        setLoadingGroupMessages(false);
      }
    };
    fetchMessages();
    inputRef.current?.focus();
  }, [activeGroup?._id]);

  // ── Socket listeners ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!activeGroup) return;

    socketService.onGroupMessage((msg: any) => {
      if ((msg.group?._id || msg.group) === activeGroup._id) {
        addGroupMessage(msg as GroupMessage);
      }
    });

    socketService.onGroupTypingStart(({ groupId, senderId, senderName }) => {
      if (groupId === activeGroup._id && senderId !== user?._id) {
        setGroupTyping(groupId, { senderId, senderName });
      }
    });

    socketService.onGroupTypingStop(({ groupId }) => {
      if (groupId === activeGroup._id) {
        setGroupTyping(groupId, null);
      }
    });

    return () => {
      socketService.offGroupMessage();
      socketService.offGroupTyping();
    };
  }, [activeGroup?._id]);

  // ── Typing handler ────────────────────────────────────────────────────────
  const handleTyping = (val: string) => {
    setText(val);
    if (!activeGroup || !user) return;
    socketService.startGroupTyping(activeGroup._id, user._id, user.displayName || user.username);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socketService.stopGroupTyping(activeGroup._id, user._id);
    }, 1500);
  };

  // ── Send message ──────────────────────────────────────────────────────────
  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if ((!text.trim() && !imagePreview) || !activeGroup || !user || isSending) return;

    setSending(true);
    try {
      const formData = new FormData();
      formData.append('text', text.trim());
      if (imagePreview) formData.append('image', imagePreview.file);

      const msg = await groupService.sendGroupMessage(activeGroup._id, formData);
      addGroupMessage(msg);
      socketService.sendGroupMessage(msg);
      setText('');
      setImagePreview(null);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to send');
    } finally {
      setSending(false);
    }
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

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const file = new File([blob], `voice-${Date.now()}.webm`, { type: 'audio/webm' });
        if (!activeGroup || !user) return;
        const formData = new FormData();
        formData.append('text', '');
        formData.append('voice', file);
        try {
          const msg = await groupService.sendGroupMessage(activeGroup._id, formData);
          addGroupMessage(msg);
          socketService.sendGroupMessage(msg);
        } catch { toast.error('Failed to send voice message'); }
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

  if (!activeGroup || !user) return null;

  const currentTyping = groupTyping[activeGroup._id];
  const onlineCount = activeGroup.members.filter((m) => m.isOnline).length;

  // ── Build date-grouped message list ──────────────────────────────────────
  const renderMessages = () => {
    const items: React.ReactNode[] = [];
    let lastDate = '';
    messages.forEach((msg) => {
      const dateLabel = getDateLabel(msg.createdAt);
      if (dateLabel !== lastDate) {
        lastDate = dateLabel;
        items.push(
          <div key={`sep-${msg._id}`} className="flex items-center gap-3 my-3">
            <div className="flex-1 h-px bg-white/5" />
            <span className="chat-date-separator">{dateLabel}</span>
            <div className="flex-1 h-px bg-white/5" />
          </div>
        );
      }
      const isSent = msg.sender._id === user._id;
      const isEmoji = !msg.deleted && emojiOnly(msg.text) && !msg.imageUrl && !msg.voiceUrl;

      items.push(
        <div
          key={msg._id}
          className={`flex items-end gap-2 mb-1 ${isSent ? 'flex-row-reverse' : 'flex-row'}`}
        >
          {/* Sender avatar for received messages */}
          {!isSent && (
            <Avatar
              src={msg.sender.profilePic}
              name={msg.sender.displayName || msg.sender.username}
              size="xs"
            />
          )}

          <div className={`flex flex-col ${isSent ? 'items-end' : 'items-start'} max-w-[70%]`}>
            {/* Sender name (received only) */}
            {!isSent && (
              <span className="text-[10px] text-pink-300/70 font-semibold ml-1 mb-0.5">
                {msg.sender.displayName || msg.sender.username}
              </span>
            )}

            {msg.deleted ? (
              <span className="text-xs text-gray-500 italic px-3 py-1.5">🗑 Message deleted</span>
            ) : (
              <div
                className={`group relative px-4 py-2.5 ${
                  isEmoji
                    ? 'bg-transparent px-2 py-1'
                    : isSent
                    ? 'bubble-sent'
                    : 'bubble-received'
                }`}
              >
                {msg.imageUrl && (
                  <div className="mb-2">
                    <img
                      src={msg.imageUrl}
                      alt="shared"
                      className="rounded-xl max-w-[240px] max-h-[300px] object-cover cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => setShowImageViewer(msg.imageUrl!)}
                    />
                  </div>
                )}
                {msg.voiceUrl && <VoiceMessagePlayer url={msg.voiceUrl} isSent={isSent} />}
                {msg.text && (
                  <p
                    className={`leading-relaxed break-words ${
                      isEmoji ? 'text-4xl' : `text-sm ${isSent ? 'text-white' : 'text-white'}`
                    }`}
                  >
                    {msg.text}
                  </p>
                )}
                <div className={`flex items-center gap-1 mt-1 ${isSent ? 'justify-end' : 'justify-start'}`}>
                  <span className={`text-[10px] ${isSent ? 'text-white/50' : 'text-gray-500'}`}>
                    {format(new Date(msg.createdAt))}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      );
    });
    return items;
  };

  return (
    <div className="flex flex-col h-full relative">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="glass-header px-4 py-3 flex items-center gap-3 z-10 sticky top-0">
        <button onClick={onBack} className="btn-icon md:hidden w-9 h-9" id="group-back-btn">
          <FiArrowLeft size={18} />
        </button>

        {/* Group avatar stack */}
        <div className="relative flex-shrink-0">
          {activeGroup.avatar ? (
            <img
              src={activeGroup.avatar}
              alt={activeGroup.name}
              className="w-10 h-10 rounded-xl object-cover border border-white/10"
            />
          ) : (
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center">
              <FiUsers size={18} className="text-white" />
            </div>
          )}
          {/* Online dot */}
          {onlineCount > 0 && (
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-[#050505] shadow-lg" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-white text-sm leading-tight truncate">{activeGroup.name}</h3>
          <p className="text-xs text-gray-500">
            {currentTyping
              ? <span className="text-pink-400/80">{currentTyping.senderName} is typing...</span>
              : `${activeGroup.members.length} members · ${onlineCount} online`}
          </p>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => { setPendingCallType('voice'); setShowCallModal(true); }}
            className="btn-icon w-9 h-9"
            title="Voice call"
            id="group-voice-call-btn"
          >
            <FiPhone size={16} />
          </button>
          <button
            onClick={() => { setPendingCallType('video'); setShowCallModal(true); }}
            className="btn-icon w-9 h-9"
            title="Video call"
            id="group-video-call-btn"
          >
            <FiVideo size={16} />
          </button>
          <button
            onClick={() => setShowInfo((v) => !v)}
            className={`btn-icon w-9 h-9 ${showInfo ? 'text-pink-400' : ''}`}
            title="Group info"
            id="group-info-btn"
          >
            <FiInfo size={16} />
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* ── Messages ──────────────────────────────────────────────────────── */}
        <div
          ref={scrollAreaRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto px-4 py-3 custom-scrollbar"
        >
          {isLoadingGroupMessages ? (
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
                <FiUsers size={28} className="text-pink-400/40" />
              </div>
              <p className="text-gray-400 text-sm font-medium">Start the group conversation!</p>
              <p className="text-gray-600 text-xs mt-1">{activeGroup.members.length} members are waiting</p>
            </div>
          ) : (
            <div className="space-y-0.5">{renderMessages()}</div>
          )}

          {/* Typing indicator */}
          {currentTyping && (
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

        {/* ── Group Info Panel ───────────────────────────────────────────────── */}
        {showInfo && (
          <GroupInfoPanel onClose={() => setShowInfo(false)} />
        )}
      </div>

      {/* ── Scroll to bottom FAB ─────────────────────────────────────────────── */}
      {showScrollBtn && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-24 right-6 w-9 h-9 rounded-full bg-pink-500/80 backdrop-blur-sm border border-pink-500/40 text-white flex items-center justify-center shadow-lg hover:bg-pink-500 transition-all z-20"
        >
          ↓
        </button>
      )}

      {/* ── Input ─────────────────────────────────────────────────────────────── */}
      <div className="glass-header px-4 py-3 border-t border-white/5">
        {/* Image preview */}
        {imagePreview && (
          <div className="mb-3 relative inline-block">
            <img src={imagePreview.url} alt="preview" className="h-28 w-auto rounded-xl border border-white/10" />
            <button
              onClick={() => { URL.revokeObjectURL(imagePreview.url); setImagePreview(null); }}
              className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center text-red-400 hover:bg-red-500 hover:text-white transition-colors"
            >
              <FiX size={12} />
            </button>
          </div>
        )}

        {isRecording ? (
          <div className="flex items-center gap-3">
            <div className="flex-1 flex items-center gap-3 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20">
              <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
              <span className="text-red-400 font-mono text-sm font-medium">
                {Math.floor(recordingTime / 60).toString().padStart(2, '0')}:
                {(recordingTime % 60).toString().padStart(2, '0')}
              </span>
              <span className="text-gray-500 text-xs">Recording...</span>
            </div>
            <button onClick={stopRecording} className="btn-danger w-11 h-11 rounded-xl">
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
              placeholder={`Message ${activeGroup.name}...`}
              className="bg-transparent border-none outline-none flex-1 py-2.5 px-2 text-sm text-white placeholder-gray-600"
              id="group-message-input"
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
              id="group-send-morph-btn"
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

      {/* ── Image viewer ──────────────────────────────────────────────────────── */}
      {showImageViewer && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setShowImageViewer(null)}
        >
          <button className="absolute top-4 right-4 text-white/70 hover:text-white" onClick={() => setShowImageViewer(null)}>
            <FiX size={28} />
          </button>
          <img src={showImageViewer} alt="full" className="max-w-full max-h-full object-contain rounded-lg" />
        </div>
      )}

      {/* ── Group Call Modal ────────────────────────────────────────────────── */}
      <GroupCallModal
        isOpen={showCallModal}
        onClose={() => setShowCallModal(false)}
        onCall={(userId, type) => {
          setShowCallModal(false);
          toast.info(`Initiating ${type} call to member... (multi-party coming soon)`);
        }}
      />
    </div>
  );
};

export default GroupChatWindow;
