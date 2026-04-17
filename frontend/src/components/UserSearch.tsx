import React, { useState, useCallback } from 'react';
import { FiSearch, FiUserPlus, FiCheck, FiMessageSquare, FiClock } from 'react-icons/fi';
import { toast } from 'react-toastify';
import { userService } from '../services/userService';
import { friendService } from '../services/friendService';
import { useAuthStore } from '../stores/useAuthStore';
import { useFriendStore } from '../stores/useFriendStore';
import socketService from '../services/socketService';
import Avatar from './Avatar';
import type { User } from '../stores/useAuthStore';

const UserSearch: React.FC = () => {
  const { user } = useAuthStore();
  const { friends, sentRequests, receivedRequests, setSentRequests } = useFriendStore();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [sentIds, setSentIds] = useState<Set<string>>(
    new Set(sentRequests.map((r) => r.receiver._id))
  );
  const [processingId, setProcessingId] = useState<string | null>(null);

  const handleSearch = useCallback(async (q: string) => {
    setQuery(q);
    if (q.trim().length < 2) { setResults([]); return; }
    setIsSearching(true);
    try {
      const data = await userService.search(q.trim());
      setResults(data);
    } catch {
      toast.error('Search failed');
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleSendRequest = async (targetUser: User) => {
    setProcessingId(targetUser._id);
    try {
      const data = await friendService.sendRequest(targetUser._id);
      setSentIds((prev) => new Set([...prev, targetUser._id]));
      // Notify via socket
      socketService.emitFriendRequest(targetUser._id, data.request);
      toast.success(`Friend request sent to ${targetUser.displayName || targetUser.username}!`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Could not send request');
    } finally {
      setProcessingId(null);
    }
  };

  const handleAcceptFromSearch = async (targetUser: User) => {
    // Find the incoming request from this user
    const incomingReq = receivedRequests.find(
      (r) => r.sender._id === targetUser._id
    );
    if (!incomingReq) return;

    setProcessingId(targetUser._id);
    try {
      await friendService.acceptRequest(incomingReq._id);
      const { addFriend, removeRequest } = useFriendStore.getState();
      addFriend(targetUser);
      removeRequest(incomingReq._id);
      socketService.emitFriendAccepted(targetUser._id, user as any);
      toast.success(`You and ${targetUser.displayName || targetUser.username} are now friends! 🎉`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to accept request');
    } finally {
      setProcessingId(null);
    }
  };

  const isFriend = (id: string) => friends.some((f) => f._id === id);
  const hasSentRequest = (id: string) => sentIds.has(id);
  const hasIncomingRequest = (id: string) =>
    receivedRequests.some((r) => r.sender._id === id);

  /** Get relationship label + action for a searched user */
  const getRelationshipUI = (u: User) => {
    if (u._id === user?._id) {
      return (
        <span className="text-xs text-gray-600 font-medium italic">You</span>
      );
    }

    if (isFriend(u._id)) {
      return (
        <span className="flex items-center gap-1 text-xs text-pink-400 font-medium">
          <FiCheck size={13} /> Friends
        </span>
      );
    }

    if (hasIncomingRequest(u._id)) {
      return (
        <button
          id={`accept-search-${u._id}`}
          onClick={() => handleAcceptFromSearch(u)}
          disabled={processingId === u._id}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-green-500/15 border border-green-500/30 text-green-400 hover:bg-green-500/25 transition-colors disabled:opacity-50"
        >
          <FiCheck size={12} />
          Accept
        </button>
      );
    }

    if (hasSentRequest(u._id)) {
      return (
        <span className="flex items-center gap-1 text-xs text-gray-500 font-medium">
          <FiClock size={12} /> Sent
        </span>
      );
    }

    return (
      <button
        id={`add-friend-${u._id}`}
        onClick={() => handleSendRequest(u)}
        disabled={processingId === u._id}
        className="btn-icon w-8 h-8 flex-shrink-0 hover:bg-pink-500/20 hover:text-pink-400 hover:border-pink-500/30"
        title="Send friend request"
      >
        <FiUserPlus size={15} />
      </button>
    );
  };

  return (
    <div className="space-y-3">
      {/* Search input */}
      <div className="relative">
        <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" size={15} />
        <input
          id="user-search-input"
          type="text"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search by username..."
          className="input-field pl-10 py-2.5"
          autoFocus
        />
        {isSearching && (
          <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
            <svg className="animate-spin h-4 w-4 text-pink-400" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        )}
      </div>

      {/* Results */}
      {results.length === 0 && query.length >= 2 && !isSearching && (
        <p className="text-center text-gray-500 text-sm py-6">No users found</p>
      )}

      {results.map((u) => (
        <div key={u._id} className="sidebar-item">
          <Avatar
            src={u.profilePic}
            name={u.displayName || u.username}
            size="sm"
            isOnline={u.isOnline}
          />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-white truncate">
              {u.displayName || u.username}
            </p>
            <p className="text-xs text-gray-500">@{u.username}</p>
          </div>
          {getRelationshipUI(u)}
        </div>
      ))}

      {/* Hint */}
      {query.length < 2 && (
        <p className="text-center text-gray-600 text-xs py-6">
          Type at least 2 characters to search
        </p>
      )}
    </div>
  );
};

export default UserSearch;
