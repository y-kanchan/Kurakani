import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  FiSearch, FiUsers, FiUserPlus, FiLogOut, FiSettings,
  FiMessageSquare, FiX, FiBell, FiCheckCircle, FiCheck,
  FiBookmark,
} from 'react-icons/fi';
import { useAuthStore } from '../stores/useAuthStore';
import { useChatStore } from '../stores/useChatStore';
import { useFriendStore } from '../stores/useFriendStore';
import { useCallStore } from '../stores/useCallStore';
import { useNotificationStore } from '../stores/useNotificationStore';
import { friendService } from '../services/friendService';
import { messageService } from '../services/messageService';
import { authService } from '../services/authService';
import { userService } from '../services/userService';
import socketService from '../services/socketService';
import webrtcService from '../services/webrtcService';
import Avatar from '../components/Avatar';
import ChatWindow from '../components/ChatWindow';
import UserSearch from '../components/UserSearch';
import FriendRequests from '../components/FriendRequests';
import { formatLastSeen } from '../utils/dateUtils';
import type { User } from '../stores/useAuthStore';
import FluidBackground from '../components/FluidBackground';
import { motion, AnimatePresence } from 'framer-motion';

type SidebarTab = 'chats' | 'friends' | 'requests' | 'search';

const Dashboard: React.FC = () => {
  const { userId: paramUserId } = useParams();
  const navigate = useNavigate();
  const { user, logout, updateUser, updateFriendStatus } = useAuthStore();
  const { activeChat, setActiveChat, addMessage } = useChatStore();
  const { friends, setFriends, receivedRequests, setReceivedRequests, setSentRequests,
    addReceivedRequest, updateFriendStatus: updateFriendStatusStore, addFriend } = useFriendStore();
  const { initiateCall } = useCallStore();
  const { unreadCounts, totalUnread, fetchUnreadCounts, incrementUnread, clearUnread } = useNotificationStore();

  const [sidebarTab, setSidebarTab] = useState<SidebarTab>('chats');
  const [isLoadingFriends, setIsLoadingFriends] = useState(true);
  const [showProfilePanel, setShowProfilePanel] = useState(false);
  const [mobileShowChat, setMobileShowChat] = useState(false);

  // Notification sound
  const notificationAudio = useRef<HTMLAudioElement>(new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3'));

  // ─── Browser Tab Title Notification ────────────────────────────────────────
  useEffect(() => {
    const originalTitle = 'Kurakani';
    if (totalUnread > 0) {
      document.title = `(${totalUnread}) ${originalTitle}`;
    } else {
      document.title = originalTitle;
    }
  }, [totalUnread]);

  // ─── Request Notification Permission ──────────────────────────────────────
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // ─── Fetch unread counts on load ──────────────────────────────────────────
  useEffect(() => {
    fetchUnreadCounts();
  }, []);

  // ─── Init socket ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;

    console.log('👤 Dashboard Identity:', {
      _id: user._id,
      displayName: user.displayName,
      username: user.username
    });

    const socket = socketService.connect(user._id);

    // Online/offline status updates
    socketService.onUserStatus(({ userId, isOnline, lastSeen }) => {
      updateFriendStatus(userId, isOnline, lastSeen as unknown as string);
      updateFriendStatusStore(userId, isOnline, lastSeen as unknown as string);
    });

    // Incoming messages
    socketService.onMessage((msg: any) => {
      console.log('📩 Socket Message Received:', msg);
      
      const senderId = msg.sender?._id || msg.sender;
      addMessage(msg);

      // Play notification sound
      notificationAudio.current.play().catch(e => console.log('🔊 Audio play failed:', e));

      // Use getState() to get the most FRESH version of activeChat and other state
      const currentChatState = useChatStore.getState();
      const currentActiveChat = currentChatState.activeChat;

      console.log('🔍 Notification Logic:', {
        senderId,
        currentActiveChatId: currentActiveChat?._id,
        shouldNotify: !currentActiveChat || currentActiveChat._id !== senderId
      });

      if (!currentActiveChat || currentActiveChat._id !== senderId) {
        incrementUnread(senderId);
        
        const senderName = msg.sender?.displayName || msg.sender?.username || 'someone';

        // Premium Toast - clickable
        toast.info(`New message from ${senderName}`, {
          toastId: `msg-${senderId}`,
          onClick: () => {
             console.log('🖱️ Toast Clicked - opening chat with:', senderId);
             if (msg.sender && typeof msg.sender !== 'string') {
               openChat(msg.sender);
             } else {
               // If msg.sender was just an ID, find the friend in the list using fresh state
               const friend = useFriendStore.getState().friends.find(f => f._id === senderId);
               if (friend) openChat(friend);
             }
          },
        });

        // Native Browser Notification
        if ('Notification' in window && Notification.permission === 'granted') {
          console.log('🖥️ Triggering Native Notification');
          const notification = new Notification(`New message from ${senderName}`, {
            body: msg.text || (msg.imageUrl ? '📷 Sent an image' : (msg.voiceUrl ? '🎤 Sent a voice message' : '')),
            icon: msg.sender?.profilePic || '/kurakani.png',
          });
          notification.onclick = () => {
             window.focus();
             if (msg.sender && typeof msg.sender !== 'string') {
               openChat(msg.sender);
             } else {
               const friend = useFriendStore.getState().friends.find(f => f._id === senderId);
               if (friend) openChat(friend);
             }
             notification.close();
          };
        } else {
          console.warn('⚠️ Native Notifications skipped:', {
            hasNotificationAPI: 'Notification' in window,
            permission: 'Notification' in window ? Notification.permission : 'N/A'
          });
        }
      }
    });

    // Message errors (friendship gate)
    socketService.onMessageError(({ error }) => {
      toast.error(error);
    });

    // Read acknowledgements
    socketService.onReadAck(({ readBy }) => {
      const currentChatState = useChatStore.getState();
      if (currentChatState.activeChat?._id === readBy) {
        currentChatState.markMessagesRead(user._id);
      }
    });

    // Friend request received
    socketService.onFriendRequest((req: any) => {
      addReceivedRequest(req);
      toast.info(`${req.sender?.displayName || req.sender?.username} sent you a friend request`);
    });

    // Friend accepted
    socketService.onFriendAccepted((friend: any) => {
      addFriend(friend);
      toast.success(`${friend.displayName || friend.username} accepted your friend request!`);
    });

    return () => {
      socketService.offMessage();
      socketService.offMessageError();
      socketService.offReadAck();
      socketService.offUserStatus();
      socketService.disconnect();
    };
  }, [user?._id]);

  // ─── Load friends + requests ──────────────────────────────────────────────
  useEffect(() => {
    const loadData = async () => {
      try {
        const [friendsData, requestsData] = await Promise.all([
          friendService.getFriends(),
          friendService.getRequests(),
        ]);
        setFriends(friendsData);
        setReceivedRequests(requestsData.received);
        setSentRequests(requestsData.sent);
      } catch {
        toast.error('Failed to load friends');
      } finally {
        setIsLoadingFriends(false);
      }
    };
    loadData();
  }, []);

  // ─── Auto-open chat from URL param ───────────────────────────────────────
  useEffect(() => {
    if (paramUserId && user) {
      // Check if it's a self-chat
      if (paramUserId === user._id) {
        openSelfChat();
        return;
      }
      if (friends.length > 0) {
        const friend = friends.find((f) => f._id === paramUserId);
        if (friend) {
          setActiveChat(friend);
          setMobileShowChat(true);
        }
      }
    }
  }, [paramUserId, friends]);

  // ─── Handle logout ────────────────────────────────────────────────────────
  const handleLogout = async () => {
    try {
      await authService.logout();
    } catch { /* ignore */ }
    socketService.disconnect();
    logout();
    navigate('/login');
  };

  // ─── Open a chat ─────────────────────────────────────────────────────────
  const openChat = (friend: User) => {
    setActiveChat(friend);
    useChatStore.setState({ isSelfChat: false });
    clearUnread(friend._id);
    navigate(`/dashboard/${friend._id}`);
    setMobileShowChat(true);
  };

  // ─── Open self-chat (Notes to Self) ───────────────────────────────────────
  const openSelfChat = () => {
    if (!user) return;
    setActiveChat(user);
    useChatStore.setState({ isSelfChat: true });
    clearUnread(user._id);
    navigate(`/dashboard/${user._id}`);
    setMobileShowChat(true);
  };

  // ─── Start call ──────────────────────────────────────────────────────────
  const handleStartCall = async (callType: 'voice' | 'video') => {
    if (!activeChat || !user) return;
    try {
      const stream = await webrtcService.getLocalStream(callType);
      const { useCallStore: _store } = await import('../stores/useCallStore');
      const callStore = _store.getState();
      callStore.setLocalStream(stream);
      callStore.initiateCall(activeChat, callType);

      const pc = webrtcService.createPeerConnection(
        (remoteStream) => callStore.setRemoteStream(remoteStream),
        (candidate) => socketService.sendIceCandidate(activeChat._id, candidate)
      );

      const offer = await webrtcService.createOffer();
      socketService.initiateCall({
        to: activeChat._id,
        from: user._id,
        callType,
        offer,
        callerInfo: user as unknown as Record<string, unknown>,
      });
    } catch (err: any) {
      toast.error('Could not access microphone/camera. Check permissions.');
      console.error(err);
    }
  };

  const pendingRequestCount = receivedRequests.length;
  const selfUnread = unreadCounts[user?._id || ''] || 0;

  return (
    <div className="flex h-screen overflow-hidden font-sans">
      <FluidBackground />

      {/* ── Sidebar ─────────────────────────────────────────────────────────── */}
      <aside
        className={`${mobileShowChat ? 'hidden' : 'flex'} md:flex flex-col w-full md:w-[340px] lg:w-[360px] glass-v2 border-r border-white/5 flex-shrink-0 z-10 transition-all duration-300`}
      >
        {/* Header */}
        <div className="px-4 pt-5 pb-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowProfilePanel((v) => !v)}
              className="relative"
            >
              <Avatar
                src={user?.profilePic}
                name={user?.displayName || user?.username}
                size="md"
                isOnline
              />
              {/* Red dot when totalUnread > 0 */}
              {totalUnread > 0 && (
                <span className="badge-red-dot" />
              )}
            </button>
            <div>
              <h2 className="font-bold text-white text-sm leading-tight">
                {user?.displayName || user?.username}
              </h2>
              <p className="text-xs text-pink-400 font-medium">Online</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handleLogout}
              className="btn-icon hover:text-red-400"
              title="Logout"
              id="logout-btn"
            >
              <FiLogOut size={17} />
            </button>
          </div>
        </div>

        {/* Profile mini-panel */}
        {showProfilePanel && (
          <div className="mx-3 mb-3 glass-light rounded-2xl p-4 animate-slide-up">
            <div className="flex items-center gap-3">
              <Avatar src={user?.profilePic} name={user?.displayName || user?.username} size="md" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-white text-sm truncate">
                  {user?.displayName || user?.username}
                </p>
                <p className="text-xs text-gray-400 truncate">{user?.status}</p>
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => navigate('/profile-setup')}
                className="btn-secondary flex-1 py-2 text-xs"
              >
                <FiSettings size={13} /> Edit Profile
              </button>
            </div>
          </div>
        )}

        {/* Tab bar */}
        <div className="px-3 mb-3">
          <div className="flex gap-1 p-1 rounded-xl bg-white/3 border border-white/5">
            {([
              { key: 'chats', icon: <FiMessageSquare size={15} />, label: 'Chats', badge: totalUnread },
              { key: 'friends', icon: <FiUsers size={15} />, label: 'Friends' },
              { key: 'requests', icon: <FiBell size={15} />, label: 'Requests', badge: pendingRequestCount },
              { key: 'search', icon: <FiSearch size={15} />, label: 'Search' },
            ] as { key: SidebarTab; icon: React.ReactNode; label: string; badge?: number }[]).map((tab) => (
              <button
                key={tab.key}
                id={`tab-${tab.key}`}
                onClick={() => setSidebarTab(tab.key)}
                className={`flex-1 flex flex-col items-center gap-0.5 py-2 px-1 rounded-lg text-xs font-medium transition-all duration-200 relative ${
                  sidebarTab === tab.key
                    ? 'bg-pink-500/15 text-pink-400 border border-pink-500/20'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                {tab.icon}
                <span className="text-[10px]">{tab.label}</span>
                {tab.badge != null && tab.badge > 0 && (
                  <span className="absolute top-1 right-1 badge text-[9px] min-w-[14px] h-[14px]">
                    {tab.badge > 99 ? '99+' : tab.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto px-3 pb-4 custom-scrollbar">
          <AnimatePresence mode="wait">
            <motion.div
              key={sidebarTab}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.2 }}
            >
              {/* ── Chats Tab ── */}
              {sidebarTab === 'chats' && (
                <div className="space-y-1">
                  {/* ── Notes to Self (always first) ── */}
                  {user && (
                    <motion.button
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      id="self-chat-item"
                      onClick={openSelfChat}
                      className={`sidebar-item w-full group relative ${
                        activeChat?._id === user._id
                          ? 'bg-amber-500/10 border-amber-500/20'
                          : 'hover:bg-white/5'
                      }`}
                    >
                      <div className="relative">
                        <Avatar
                          src={user.profilePic}
                          name={user.displayName || user.username}
                          size="md"
                        />
                        <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center">
                          <FiBookmark size={10} className="text-amber-400" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0 text-left">
                        <div className="flex items-center justify-between">
                          <p className="font-semibold text-sm text-white group-hover:text-amber-400 transition-colors">
                            Notes to Self
                          </p>
                          {selfUnread > 0 && (
                            <span className="badge-amber ml-1 flex-shrink-0">
                              {selfUnread > 99 ? '99+' : selfUnread}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-gray-500 truncate mt-0.5">
                          📌 Save notes, links & reminders
                        </p>
                      </div>
                      {activeChat?._id === user._id && (
                        <motion.div
                          layoutId="active-indicator"
                          className="absolute left-0 top-3 bottom-3 w-1 bg-amber-500 rounded-r-full"
                        />
                      )}
                    </motion.button>
                  )}

                  {/* ── Friend conversations ── */}
                  {isLoadingFriends ? (
                    <div className="space-y-2 pt-2">
                      {[...Array(5)].map((_, i) => (
                        <div key={i} className="flex items-center gap-3 p-3 rounded-xl animate-pulse bg-white/5" />
                      ))}
                    </div>
                  ) : friends.length === 0 ? (
                    <div className="text-center py-12 flex flex-col items-center">
                      <div className="w-16 h-16 rounded-full bg-pink-500/10 flex items-center justify-center mb-4">
                        <FiUsers size={24} className="text-pink-500/40" />
                      </div>
                      <p className="text-gray-400 text-sm font-medium">No conversations yet</p>
                      <button
                        onClick={() => setSidebarTab('search')}
                        className="btn-secondary mt-4 py-2 px-6 text-xs rounded-full"
                      >
                        Start Chatting
                      </button>
                    </div>
                  ) : (
                    friends.map((friend) => (
                      <motion.button
                        key={friend._id}
                        layout
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        id={`chat-item-${friend._id}`}
                        onClick={() => openChat(friend)}
                        className={`sidebar-item w-full group relative ${
                          activeChat?._id === friend._id && !useChatStore.getState().isSelfChat
                            ? 'bg-pink-500/10 border-pink-500/20' 
                            : 'hover:bg-white/5'
                        }`}
                      >
                        <Avatar
                          src={friend.profilePic}
                          name={friend.displayName || friend.username}
                          size="md"
                          isOnline={friend.isOnline}
                        />
                        <div className="flex-1 min-w-0 text-left">
                          <div className="flex items-center justify-between">
                            <p className="font-semibold text-sm text-white group-hover:text-pink-400 transition-colors">
                              {friend.displayName || friend.username}
                            </p>
                            {(unreadCounts[friend._id] || 0) > 0 && (
                              <span className="badge ml-1 flex-shrink-0 neon-border">
                                {unreadCounts[friend._id] > 99 ? '99+' : unreadCounts[friend._id]}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-gray-500 truncate mt-0.5">
                            {friend.isOnline
                              ? '💗 Active now'
                              : `Last seen ${formatLastSeen(friend.lastSeen)}`}
                          </p>
                        </div>
                        {activeChat?._id === friend._id && !useChatStore.getState().isSelfChat && (
                          <motion.div
                            layoutId="active-indicator"
                            className="absolute left-0 top-3 bottom-3 w-1 bg-pink-500 rounded-r-full"
                          />
                        )}
                      </motion.button>
                    ))
                  )}
                </div>
              )}

              {/* ── Friends Tab ── */}
              {sidebarTab === 'friends' && (
                <div className="space-y-1">
                  {friends.length === 0 ? (
                    <div className="text-center py-12 flex flex-col items-center">
                      <FiUserPlus size={32} className="text-gray-700 mb-3" />
                      <p className="text-gray-500 text-sm">Build your circle</p>
                    </div>
                  ) : (
                    friends.map((friend) => (
                      <div
                        key={friend._id}
                        className="sidebar-item hover:bg-white/5"
                      >
                        <Avatar
                          src={friend.profilePic}
                          name={friend.displayName || friend.username}
                          size="md"
                          isOnline={friend.isOnline}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-white truncate">
                            {friend.displayName || friend.username}
                          </p>
                          <p className="text-xs text-gray-500 truncate">@{friend.username}</p>
                        </div>
                        <button
                          onClick={() => openChat(friend)}
                          className="btn-icon w-9 h-9 rounded-full bg-white/5 border-white/10"
                        >
                          <FiMessageSquare size={14} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* ── Requests Tab ── */}
              {sidebarTab === 'requests' && <FriendRequests />}

              {/* ── Search Tab ── */}
              {sidebarTab === 'search' && <UserSearch />}
            </motion.div>
          </AnimatePresence>
        </div>
      </aside>

      {/* ── Main Chat Area ───────────────────────────────────────────────────── */}
      <main
        className={`${!mobileShowChat ? 'hidden' : 'flex'} md:flex flex-1 flex-col min-w-0`}
      >
        {activeChat ? (
          <ChatWindow
            onBack={() => {
              setMobileShowChat(false);
              navigate('/dashboard');
            }}
            onStartCall={handleStartCall}
          />
        ) : (
          /* Empty state */
          <div className="flex-1 flex flex-col items-center justify-center relative">
            <div className="text-center z-10">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="relative mx-auto w-40 h-40 mb-8"
              >
                <div className="absolute inset-0 rounded-full bg-pink-500/20 blur-3xl animate-pulse" />
                <div className="relative w-40 h-40 rounded-full bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden">
                   <img 
                      src="/kurakani.png" 
                      alt="Kurakani" 
                      className="w-24 h-24 object-contain opacity-40 filter grayscale hover:grayscale-0 transition-all duration-700" 
                    />
                </div>
              </motion.div>
              <h2 className="text-3xl font-extrabold text-white mb-3 tracking-tight">Welcome home</h2>
              <p className="text-gray-400 text-base max-w-sm mx-auto font-medium">
                Pick a conversation from the sidebar and start your journey of connection.
              </p>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSidebarTab('search')}
                className="btn-primary mt-8 px-10 py-4 rounded-full neon-border shadow-pink-500/20 shadow-xl"
                id="start-chat-btn"
              >
                <FiSearch size={18} />
                Explore People
              </motion.button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
