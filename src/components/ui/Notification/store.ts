import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';

export type NotificationType = 'success' | 'error' | 'info' | 'warning';

export interface Notification {
  id: string;
  type: NotificationType;
  message: string;
  duration?: number;
}

interface NotificationStore {
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id'>) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
}

export const useNotificationStore = create<NotificationStore>((set) => ({
  notifications: [],
  
  addNotification: (notification) => {
    const id = uuidv4();
    const newNotification = { 
      ...notification, 
      id, 
      duration: notification.duration || 5000 
    };
    
    set((state) => ({
      notifications: [...state.notifications, newNotification]
    }));
    
    // Auto-remove after duration
    setTimeout(() => {
      set((state) => ({
        notifications: state.notifications.filter(n => n.id !== id)
      }));
    }, newNotification.duration);
  },
  
  removeNotification: (id) => {
    set((state) => ({
      notifications: state.notifications.filter(notification => notification.id !== id)
    }));
  },
  
  clearNotifications: () => {
    set({ notifications: [] });
  }
}));
