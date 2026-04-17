import { create } from 'zustand';
import { messageService } from '../services/messageService';

interface NotificationState {
  unreadCounts: Record<string, number>;
  totalUnread: number;

  fetchUnreadCounts: () => Promise<void>;
  incrementUnread: (userId: string) => void;
  clearUnread: (userId: string) => void;
  setUnreadCount: (userId: string, count: number) => void;
}

/** Recalculate total from counts object */
const calcTotal = (counts: Record<string, number>) =>
  Object.values(counts).reduce((a, b) => a + b, 0);

export const useNotificationStore = create<NotificationState>((set, get) => ({
  unreadCounts: {},
  totalUnread: 0,

  fetchUnreadCounts: async () => {
    try {
      const data: { userId: string; count: number }[] = await messageService.getUnreadCounts();
      const counts: Record<string, number> = {};
      data.forEach((item) => {
        counts[item.userId] = item.count;
      });
      set({ unreadCounts: counts, totalUnread: calcTotal(counts) });
    } catch (err) {
      console.error('Failed to fetch unread counts:', err);
    }
  },

  incrementUnread: (userId) => {
    const counts = { ...get().unreadCounts };
    counts[userId] = (counts[userId] || 0) + 1;
    set({ unreadCounts: counts, totalUnread: calcTotal(counts) });
  },

  clearUnread: (userId) => {
    const counts = { ...get().unreadCounts };
    if (counts[userId]) {
      counts[userId] = 0;
      set({ unreadCounts: counts, totalUnread: calcTotal(counts) });
    }
    // Also mark read on server
    messageService.markReadBulk(userId).catch(() => {});
  },

  setUnreadCount: (userId, count) => {
    const counts = { ...get().unreadCounts };
    counts[userId] = count;
    set({ unreadCounts: counts, totalUnread: calcTotal(counts) });
  },
}));
