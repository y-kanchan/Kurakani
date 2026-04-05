import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  FiSearch, FiUsers, FiUserPlus, FiLogOut, FiSettings,
  FiMessageSquare, FiX, FiBell, FiCheckCircle, FiCheck,
} from 'react-icons/fi';
import { useAuthStore } from '../stores/useAuthStore';
import { useChatStore } from '../stores/useChatStore';
import { useFriendStore } from '../stores/useFriendStore';
import { useCallStore } from '../stores/useCallStore';
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

type SidebarTab = 'chats' | 'friends' | 'requests' | 'search';

const Dashboard: React.FC = () => {
  const { userId: paramUserId } = useParams();
  const navigate = useNavigate();
  const { user, logout, updateUser, updateFriendStatus } = useAuthStore();
  const { activeChat, setActiveChat, unreadCounts, incrementUnread, clearUnread, addMessage } = useChatStore();
  const { friends, setFriends, receivedRequests, setReceivedRequests, setSentRequests,
    addReceivedRequest, updateFriendStatus: updateFriendStatusStore, addFriend } = useFriendStore();
  const { initiateCall } = useCallStore();

  const [sidebarTab, setSidebarTab] = useState<SidebarTab>('chats');
  const [isLoadingFriends, setIsLoadingFriends] = useState(true);
  const [showProfilePanel, setShowProfilePanel] = useState(false);
  const [mobileShowChat, setMobileShowChat] = useState(false);

  // ─── Init socket ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;

    const socket = socketService.connect(user._id);

    // Online/offline status updates
    socketService.onUserStatus(({ userId, isOnline, lastSeen }) => {
      updateFriendStatus(userId, isOnline, lastSeen as unknown as string);
      updateFriendStatusStore(userId, isOnline, lastSeen as unknown as string);
    });

    // Incoming messages (from others while NOT in that chat)
    socketService.onMessage((msg: any) => {
      const senderId = msg.sender?._id || msg.sender;
      addMessage(msg);
      if (!activeChat || activeChat._id !== senderId) {
        incrementUnread(senderId);
        toast.info(`New message from ${msg.sender?.displayName || 'someone'}`, {
          toastId: `msg-${senderId}`,
        });
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
    if (paramUserId && friends.length > 0) {
      const friend = friends.find((f) => f._id === paramUserId);
      if (friend) {
        setActiveChat(friend);
        setMobileShowChat(true);
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
    clearUnread(friend._id);
    navigate(`/dashboard/${friend._id}`);
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

  const totalUnread = Object.values(unreadCounts).reduce((a, b) => a + b, 0);
  const pendingRequestCount = receivedRequests.length;

  return (
    <div className="flex h-screen bg-dark-bg overflow-hidden">
      {/* ── Sidebar ─────────────────────────────────────────────────────────── */}
      <aside
        className={`${mobileShowChat ? 'hidden' : 'flex'} md:flex flex-col w-full md:w-[340px] lg:w-[380px] glass border-r border-white/5 flex-shrink-0`}
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
        <div className="flex-1 overflow-y-auto px-3 pb-4">
          {/* ── Chats Tab ── */}
          {sidebarTab === 'chats' && (
            <div className="space-y-1">
              {isLoadingFriends ? (
                <div className="space-y-2 pt-2">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-xl animate-pulse">
                      <div className="w-11 h-11 rounded-full bg-white/5 flex-shrink-0" />
                      <div className="flex-1">
                        <div className="h-3 bg-white/5 rounded w-2/3 mb-2" />
                        <div className="h-2 bg-white/5 rounded w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : friends.length === 0 ? (
                <div className="text-center py-12">
                  <FiUsers size={32} className="text-gray-700 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">No friends yet</p>
                  <button
                    onClick={() => setSidebarTab('search')}
                    className="btn-secondary mt-3 py-2 px-4 text-xs"
                  >
                    Find People
                  </button>
                </div>
              ) : (
                friends.map((friend) => (
                  <button
                    key={friend._id}
                    id={`chat-item-${friend._id}`}
                    onClick={() => openChat(friend)}
                    className={`sidebar-item w-full ${
                      activeChat?._id === friend._id ? 'active' : ''
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
                        <p className="font-semibold text-sm text-white truncate">
                          {friend.displayName || friend.username}
                        </p>
                        {unreadCounts[friend._id] > 0 && (
                          <span className="badge ml-1 flex-shrink-0">
                            {unreadCounts[friend._id]}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 truncate">
                        {friend.isOnline
                          ? '💗 Online'
                          : `Last seen ${formatLastSeen(friend.lastSeen)}`}
                      </p>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}

          {/* ── Friends Tab ── */}
          {sidebarTab === 'friends' && (
            <div className="space-y-1">
              {friends.length === 0 ? (
                <div className="text-center py-12">
                  <FiUserPlus size={32} className="text-gray-700 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">No friends yet</p>
                  <button
                    onClick={() => setSidebarTab('search')}
                    className="btn-secondary mt-3 py-2 px-4 text-xs"
                  >
                    Search & Add
                  </button>
                </div>
              ) : (
                friends.map((friend) => (
                  <div
                    key={friend._id}
                    className="sidebar-item"
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
                      className="btn-icon w-8 h-8 flex-shrink-0"
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
          <div className="flex-1 flex flex-col items-center justify-center bg-dark-bg">
            <div className="text-center animate-fade-in">
              {/* Gradient orb */}
              <div className="relative mx-auto w-32 h-32 mb-6">
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-pink-500/20 to-romantic-deep-pink/20 blur-2xl" />
                <div className="relative w-32 h-32 rounded-full bg-gradient-to-br from-pink-500/10 to-romantic-deep-pink/10 border border-white/5 flex items-center justify-center">
                  <FiMessageSquare size={40} className="text-pink-500/60" />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Your Messages</h2>
              <p className="text-gray-500 text-sm max-w-xs">
                Select a friend to start chatting, or search for new people to connect with.
              </p>
              <button
                onClick={() => setSidebarTab('search')}
                className="btn-primary mt-6"
                id="start-chat-btn"
              >
                <FiSearch size={16} />
                Find People
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
