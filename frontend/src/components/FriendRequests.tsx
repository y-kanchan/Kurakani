import React, { useState } from 'react';
import { FiCheck, FiX, FiUserPlus } from 'react-icons/fi';
import { toast } from 'react-toastify';
import { friendService } from '../services/friendService';
import { useFriendStore } from '../stores/useFriendStore';
import socketService from '../services/socketService';
import { useAuthStore } from '../stores/useAuthStore';
import Avatar from './Avatar';

const FriendRequests: React.FC = () => {
  const { user } = useAuthStore();
  const { receivedRequests, sentRequests, removeRequest, addFriend } = useFriendStore();
  const [processingId, setProcessingId] = useState<string | null>(null);

  const handleAccept = async (requestId: string, sender: any) => {
    setProcessingId(requestId);
    try {
      await friendService.acceptRequest(requestId);
      addFriend(sender);
      removeRequest(requestId);
      // Notify sender
      socketService.emitFriendAccepted(sender._id, user as any);
      toast.success(`You and ${sender.displayName || sender.username} are now friends! 🎉`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to accept request');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (requestId: string) => {
    setProcessingId(requestId);
    try {
      await friendService.rejectRequest(requestId);
      removeRequest(requestId);
      toast.info('Friend request declined');
    } catch {
      toast.error('Failed to reject request');
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Received */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-1">
          Received ({receivedRequests.length})
        </p>
        {receivedRequests.length === 0 ? (
          <div className="text-center py-8">
            <FiUserPlus size={28} className="text-gray-700 mx-auto mb-2" />
            <p className="text-gray-600 text-xs">No pending requests</p>
          </div>
        ) : (
          receivedRequests.map((req) => (
            <div key={req._id} className="sidebar-item mb-1">
              <Avatar
                src={req.sender.profilePic}
                name={req.sender.displayName || req.sender.username}
                size="sm"
                isOnline={req.sender.isOnline}
              />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-white truncate">
                  {req.sender.displayName || req.sender.username}
                </p>
                <p className="text-xs text-gray-500">@{req.sender.username}</p>
              </div>
              <div className="flex gap-1.5 flex-shrink-0">
                <button
                  id={`accept-request-${req._id}`}
                  onClick={() => handleAccept(req._id, req.sender)}
                  disabled={processingId === req._id}
                  className="w-8 h-8 rounded-lg bg-green-500/15 border border-green-500/30 text-green-400 flex items-center justify-center hover:bg-green-500/25 transition-colors disabled:opacity-50"
                  title="Accept"
                >
                  <FiCheck size={14} />
                </button>
                <button
                  id={`reject-request-${req._id}`}
                  onClick={() => handleReject(req._id)}
                  disabled={processingId === req._id}
                  className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center hover:bg-red-500/20 transition-colors disabled:opacity-50"
                  title="Decline"
                >
                  <FiX size={14} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Sent */}
      {sentRequests.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-1">
            Sent ({sentRequests.length})
          </p>
          {sentRequests.map((req) => (
            <div key={req._id} className="sidebar-item mb-1 opacity-70">
              <Avatar
                src={req.receiver.profilePic}
                name={req.receiver.displayName || req.receiver.username}
                size="sm"
              />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-white truncate">
                  {req.receiver.displayName || req.receiver.username}
                </p>
                <p className="text-xs text-gray-500">Request pending...</p>
              </div>
              <span className="text-xs text-gray-600 flex-shrink-0">Sent</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FriendRequests;
