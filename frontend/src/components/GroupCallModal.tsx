import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiPhone, FiVideo, FiSearch } from 'react-icons/fi';
import { useGroupStore } from '../stores/useGroupStore';
import Avatar from './Avatar';

interface GroupCallModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCall: (userId: string, type: 'voice' | 'video') => void;
}

const GroupCallModal: React.FC<GroupCallModalProps> = ({ isOpen, onClose, onCall }) => {
  const { activeGroup } = useGroupStore();
  const [search, setSearch] = React.useState('');

  if (!activeGroup) return null;

  const filteredMembers = activeGroup.members.filter(m => 
    (m.displayName || m.username).toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
            onClick={onClose}
          />

          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative w-full max-w-sm glass-card rounded-3xl p-6 overflow-hidden shadow-2xl"
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-bold text-white">Group Call</h2>
                <p className="text-xs text-gray-500">Choose a member to call</p>
              </div>
              <button onClick={onClose} className="btn-icon w-9 h-9">
                <FiX size={18} />
              </button>
            </div>

            <div className="relative mb-4">
              <FiSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search members..."
                className="input-field pl-9 py-2 text-sm rounded-xl"
              />
            </div>

            <div className="space-y-1 max-h-80 overflow-y-auto custom-scrollbar pr-1">
              {filteredMembers.length === 0 ? (
                <p className="text-center text-gray-600 py-8 text-sm">No members found</p>
              ) : (
                filteredMembers.map((member) => (
                  <div
                    key={member._id}
                    className="flex items-center gap-3 p-2 rounded-2xl hover:bg-white/5 transition-colors group"
                  >
                    <Avatar
                      src={member.profilePic}
                      name={member.displayName || member.username}
                      size="sm"
                      isOnline={member.isOnline}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white truncate">
                        {member.displayName || member.username}
                      </p>
                      <p className="text-[10px] text-gray-500">
                        {member.isOnline ? 'Available' : 'Offline'}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => onCall(member._id, 'voice')}
                        className="w-8 h-8 rounded-full bg-green-500/10 text-green-400 border border-green-500/20 flex items-center justify-center hover:bg-green-500 hover:text-white transition-all shadow-lg shadow-green-500/20"
                      >
                        <FiPhone size={13} />
                      </button>
                      <button
                        onClick={() => onCall(member._id, 'video')}
                        className="w-8 h-8 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center hover:bg-blue-500 hover:text-white transition-all shadow-lg shadow-blue-500/20"
                      >
                        <FiVideo size={13} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-white/5">
              <p className="text-[10px] text-gray-600 text-center uppercase tracking-widest font-bold">
                Multi-party calls coming soon
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default GroupCallModal;
