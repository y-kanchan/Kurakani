import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-toastify';
import { FiX, FiUsers, FiCamera, FiCheck, FiSearch } from 'react-icons/fi';
import { useAuthStore } from '../stores/useAuthStore';
import { useFriendStore } from '../stores/useFriendStore';
import { useGroupStore } from '../stores/useGroupStore';
import { groupService } from '../services/groupService';
import socketService from '../services/socketService';
import Avatar from './Avatar';

interface CreateGroupModalProps {
  onClose: () => void;
  onCreated?: (group: any) => void;
}

const CreateGroupModal: React.FC<CreateGroupModalProps> = ({ onClose, onCreated }) => {
  const { user } = useAuthStore();
  const { friends } = useFriendStore();
  const { addGroup } = useGroupStore();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredFriends = friends.filter((f) =>
    (f.displayName || f.username).toLowerCase().includes(search.toLowerCase())
  );

  const toggleMember = (id: string) => {
    setSelectedMembers((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('Image must be under 5MB'); return; }
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleCreate = async () => {
    if (!name.trim()) { toast.error('Group name is required'); return; }
    if (selectedMembers.length < 1) { toast.error('Add at least one member'); return; }
    setIsCreating(true);
    try {
      const formData = new FormData();
      formData.append('name', name.trim());
      formData.append('description', description.trim());
      formData.append('memberIds', JSON.stringify(selectedMembers));
      if (avatarFile) formData.append('avatar', avatarFile);

      const group = await groupService.createGroup(formData);
      addGroup(group);
      // Join the socket room immediately
      socketService.joinGroupRoom(group._id);
      toast.success(`Group "${group.name}" created! 🎉`);
      onCreated?.(group);
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create group');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Backdrop */}
        <motion.div
          className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal */}
        <motion.div
          className="relative w-full max-w-md glass-card rounded-3xl p-6 z-10 overflow-hidden"
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold text-white">New Group</h2>
              <p className="text-xs text-gray-500 mt-0.5">Add friends and give your group a name</p>
            </div>
            <button onClick={onClose} className="btn-icon w-9 h-9">
              <FiX size={17} />
            </button>
          </div>

          {/* Avatar picker */}
          <div className="flex items-center gap-4 mb-5">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="relative w-16 h-16 rounded-2xl overflow-hidden bg-white/5 border-2 border-dashed border-white/10 hover:border-pink-500/40 transition-colors flex items-center justify-center flex-shrink-0 group"
            >
              {avatarPreview ? (
                <img src={avatarPreview} alt="group" className="w-full h-full object-cover" />
              ) : (
                <div className="flex flex-col items-center gap-1">
                  <FiCamera size={18} className="text-gray-500 group-hover:text-pink-400 transition-colors" />
                  <span className="text-[9px] text-gray-600">Photo</span>
                </div>
              )}
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />

            <div className="flex-1 space-y-2">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Group name *"
                className="input-field py-2.5 text-sm"
                maxLength={60}
              />
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Description (optional)"
                className="input-field py-2 text-sm"
                maxLength={200}
              />
            </div>
          </div>

          {/* Member search */}
          <div className="relative mb-3">
            <FiSearch size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search friends..."
              className="input-field pl-9 py-2 text-sm"
            />
          </div>

          {/* Selected chips */}
          {selectedMembers.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {selectedMembers.map((id) => {
                const f = friends.find((f) => f._id === id);
                if (!f) return null;
                return (
                  <button
                    key={id}
                    onClick={() => toggleMember(id)}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-pink-500/15 border border-pink-500/25 text-pink-300 text-xs font-medium"
                  >
                    {f.displayName || f.username}
                    <FiX size={11} />
                  </button>
                );
              })}
            </div>
          )}

          {/* Friend list */}
          <div className="space-y-1 max-h-48 overflow-y-auto custom-scrollbar mb-5 pr-1">
            {filteredFriends.length === 0 ? (
              <p className="text-center text-gray-600 text-sm py-6">No friends found</p>
            ) : (
              filteredFriends.map((friend) => {
                const isSelected = selectedMembers.includes(friend._id);
                return (
                  <button
                    key={friend._id}
                    onClick={() => toggleMember(friend._id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 ${
                      isSelected
                        ? 'bg-pink-500/12 border border-pink-500/20'
                        : 'hover:bg-white/4 border border-transparent'
                    }`}
                  >
                    <Avatar
                      src={friend.profilePic}
                      name={friend.displayName || friend.username}
                      size="sm"
                      isOnline={friend.isOnline}
                    />
                    <span className="flex-1 text-left text-sm font-medium text-white truncate">
                      {friend.displayName || friend.username}
                    </span>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                      isSelected ? 'bg-pink-500 border-pink-500' : 'border-gray-600'
                    }`}>
                      {isSelected && <FiCheck size={11} className="text-white" />}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Create button */}
          <button
            onClick={handleCreate}
            disabled={isCreating || !name.trim() || selectedMembers.length === 0}
            className="btn-primary w-full rounded-2xl disabled:opacity-40"
            id="create-group-btn"
          >
            {isCreating ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Creating...
              </span>
            ) : (
              <>
                <FiUsers size={16} />
                Create Group ({selectedMembers.length + 1})
              </>
            )}
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default CreateGroupModal;
