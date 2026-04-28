import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-toastify';
import {
  FiX, FiUserPlus, FiUserMinus, FiTrash2, FiLogOut,
  FiShield, FiEdit2, FiUsers, FiCheck,
} from 'react-icons/fi';
import { useAuthStore } from '../stores/useAuthStore';
import { useGroupStore } from '../stores/useGroupStore';
import { useFriendStore } from '../stores/useFriendStore';
import { groupService } from '../services/groupService';
import socketService from '../services/socketService';
import Avatar from './Avatar';

interface GroupInfoPanelProps {
  onClose: () => void;
}

const GroupInfoPanel: React.FC<GroupInfoPanelProps> = ({ onClose }) => {
  const { user } = useAuthStore();
  const { activeGroup, updateGroup, removeGroup, setActiveGroup } = useGroupStore();
  const { friends } = useFriendStore();

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(activeGroup?.name || '');
  const [editDesc, setEditDesc] = useState(activeGroup?.description || '');
  const [showAddMember, setShowAddMember] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  if (!activeGroup || !user) return null;

  const isAdmin = activeGroup.admin._id === user._id;

  // Friends not already in the group
  const addableFriends = friends.filter(
    (f) => !activeGroup.members.some((m) => m._id === f._id)
  );

  const handleSaveEdit = async () => {
    if (!editName.trim()) { toast.error('Group name required'); return; }
    setIsSaving(true);
    try {
      const fd = new FormData();
      fd.append('name', editName.trim());
      fd.append('description', editDesc.trim());
      const updated = await groupService.updateGroup(activeGroup._id, fd);
      updateGroup(updated);
      setIsEditing(false);
      toast.success('Group updated!');
    } catch {
      toast.error('Failed to update group');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddMember = async (userId: string) => {
    try {
      const updated = await groupService.addMember(activeGroup._id, userId);
      updateGroup(updated);
      const newMember = updated.members.find((m) => m._id === userId);
      if (newMember) socketService.emitGroupMemberAdded(activeGroup._id, newMember as any);
      toast.success('Member added!');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to add member');
    }
  };

  const handleRemoveMember = async (userId: string) => {
    setRemovingId(userId);
    try {
      const updated = await groupService.removeMember(activeGroup._id, userId);
      updateGroup(updated);
      socketService.emitGroupMemberRemoved(activeGroup._id, userId);
      toast.success('Member removed');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to remove');
    } finally {
      setRemovingId(null);
    }
  };

  const handleLeave = async () => {
    if (!confirm('Are you sure you want to leave this group?')) return;
    try {
      await groupService.leaveGroup(activeGroup._id);
      socketService.leaveGroupRoom(activeGroup._id);
      removeGroup(activeGroup._id);
      setActiveGroup(null);
      onClose();
      toast.success('Left group');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to leave');
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Delete "${activeGroup.name}"? This cannot be undone.`)) return;
    try {
      await groupService.deleteGroup(activeGroup._id);
      socketService.leaveGroupRoom(activeGroup._id);
      removeGroup(activeGroup._id);
      setActiveGroup(null);
      onClose();
      toast.success('Group deleted');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete');
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        className="w-72 lg:w-80 flex-shrink-0 border-l border-white/5 flex flex-col overflow-hidden"
        style={{ background: 'rgba(8,8,8,0.6)', backdropFilter: 'blur(20px)' }}
        initial={{ x: 80, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 80, opacity: 0 }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
      >
        {/* Header */}
        <div className="px-4 py-3 flex items-center justify-between border-b border-white/5">
          <h3 className="text-sm font-bold text-white">Group Info</h3>
          <button onClick={onClose} className="btn-icon w-8 h-8"><FiX size={15} /></button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-5">
          {/* Group identity */}
          <div className="flex flex-col items-center gap-3 text-center">
            {activeGroup.avatar ? (
              <img src={activeGroup.avatar} alt={activeGroup.name}
                className="w-20 h-20 rounded-2xl object-cover border border-white/10" />
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center">
                <FiUsers size={28} className="text-white" />
              </div>
            )}

            {isEditing ? (
              <div className="w-full space-y-2">
                <input value={editName} onChange={(e) => setEditName(e.target.value)}
                  className="input-field text-sm text-center py-2" placeholder="Group name" />
                <input value={editDesc} onChange={(e) => setEditDesc(e.target.value)}
                  className="input-field text-sm text-center py-2" placeholder="Description" />
                <div className="flex gap-2">
                  <button onClick={() => setIsEditing(false)}
                    className="flex-1 btn-secondary py-2 text-xs rounded-xl">Cancel</button>
                  <button onClick={handleSaveEdit} disabled={isSaving}
                    className="flex-1 btn-primary py-2 text-xs rounded-xl">
                    {isSaving ? '...' : <><FiCheck size={13} /> Save</>}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div>
                  <p className="font-bold text-white text-base">{activeGroup.name}</p>
                  {activeGroup.description && (
                    <p className="text-xs text-gray-400 mt-1">{activeGroup.description}</p>
                  )}
                </div>
                {isAdmin && (
                  <button onClick={() => setIsEditing(true)}
                    className="btn-secondary py-1.5 px-4 text-xs rounded-full">
                    <FiEdit2 size={12} /> Edit
                  </button>
                )}
              </>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-white/4 border border-white/5 p-3 text-center">
              <p className="text-lg font-bold text-white">{activeGroup.members.length}</p>
              <p className="text-[10px] text-gray-500">Members</p>
            </div>
            <div className="rounded-xl bg-white/4 border border-white/5 p-3 text-center">
              <p className="text-lg font-bold text-green-400">
                {activeGroup.members.filter((m) => m.isOnline).length}
              </p>
              <p className="text-[10px] text-gray-500">Online</p>
            </div>
          </div>

          {/* Add member */}
          {isAdmin && (
            <div>
              <button
                onClick={() => setShowAddMember((v) => !v)}
                className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-pink-500/8 border border-pink-500/15 text-pink-300 text-sm font-medium hover:bg-pink-500/15 transition-colors"
              >
                <FiUserPlus size={15} />
                Add Member
              </button>
              {showAddMember && (
                <div className="mt-2 space-y-1 max-h-40 overflow-y-auto custom-scrollbar">
                  {addableFriends.length === 0 ? (
                    <p className="text-xs text-gray-600 text-center py-3">All friends already in group</p>
                  ) : (
                    addableFriends.map((f) => (
                      <button
                        key={f._id}
                        onClick={() => handleAddMember(f._id)}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-white/5 transition-colors"
                      >
                        <Avatar src={f.profilePic} name={f.displayName || f.username} size="xs" />
                        <span className="flex-1 text-left text-xs text-white truncate">
                          {f.displayName || f.username}
                        </span>
                        <span className="text-xs text-pink-400">Add</span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          )}

          {/* Member list */}
          <div>
            <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Members
            </p>
            <div className="space-y-1">
              {activeGroup.members.map((member) => {
                const isMemberAdmin = member._id === activeGroup.admin._id;
                const isMe = member._id === user._id;
                return (
                  <div
                    key={member._id}
                    className="flex items-center gap-2.5 px-2 py-2 rounded-xl hover:bg-white/3 transition-colors group"
                  >
                    <Avatar
                      src={member.profilePic}
                      name={member.displayName || member.username}
                      size="sm"
                      isOnline={member.isOnline}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-white truncate">
                        {member.displayName || member.username}
                        {isMe && <span className="text-gray-600 font-normal"> (you)</span>}
                      </p>
                    </div>
                    {isMemberAdmin && (
                      <span className="flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/20">
                        <FiShield size={9} /> Admin
                      </span>
                    )}
                    {isAdmin && !isMe && !isMemberAdmin && (
                      <button
                        onClick={() => handleRemoveMember(member._id)}
                        disabled={removingId === member._id}
                        className="opacity-0 group-hover:opacity-100 btn-icon w-7 h-7 rounded-lg text-red-400 hover:bg-red-500/15 transition-all"
                        title="Remove member"
                      >
                        {removingId === member._id
                          ? <span className="text-[10px]">...</span>
                          : <FiUserMinus size={13} />}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Danger zone */}
        <div className="p-4 border-t border-white/5 space-y-2">
          {!isAdmin && (
            <button
              onClick={handleLeave}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-orange-500/8 border border-orange-500/15 text-orange-400 text-sm font-medium hover:bg-orange-500/15 transition-colors"
            >
              <FiLogOut size={15} /> Leave Group
            </button>
          )}
          {isAdmin && (
            <button
              onClick={handleDelete}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/8 border border-red-500/15 text-red-400 text-sm font-medium hover:bg-red-500/15 transition-colors"
            >
              <FiTrash2 size={15} /> Delete Group
            </button>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default GroupInfoPanel;
