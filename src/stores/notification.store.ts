import { create } from "zustand";

export interface AppNotification {
  id: string;
  text: string;
  timestamp: number;
  unread: boolean;
  color: string;
}

const MAX_NOTIFICATIONS = 50;

let notificationAudio: HTMLAudioElement | null = null;
function playNotificationSound() {
  if (!notificationAudio) {
    notificationAudio = new Audio("/Notification.mp3");
  }
  notificationAudio.currentTime = 0;
  notificationAudio.play().catch(() => {});
}

interface NotificationState {
  notifications: AppNotification[];
  push: (text: string, color: string) => void;
  markAllRead: () => void;
  clear: () => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],

  push: (text, color) => {
    const notif: AppNotification = { id: crypto.randomUUID(), text, timestamp: Date.now(), unread: true, color };
    set((state) => ({ notifications: [notif, ...state.notifications].slice(0, MAX_NOTIFICATIONS) }));
    playNotificationSound();
  },

  markAllRead: () => set((state) => ({ notifications: state.notifications.map((n) => ({ ...n, unread: false })) })),

  clear: () => set({ notifications: [] }),
}));
