import React, { useEffect } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { create } from 'zustand';

type NotificationType = 'success' | 'error' | 'warning' | 'info';

interface Notification {
  id: string;
  message: string;
  type: NotificationType;
  duration?: number;
}

interface NotificationState {
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id'>) => void;
  removeNotification: (id: string) => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  addNotification: (notification) =>
    set((state) => ({
      notifications: [
        ...state.notifications,
        { id: Math.random().toString(36).substr(2, 9), ...notification },
      ],
    })),
  removeNotification: (id) =>
    set((state) => ({
      notifications: state.notifications.filter((notification) => notification.id !== id),
    })),
}));

interface NotificationProps {
  notification: Notification;
  onClose: () => void;
}

const NotificationComponent: React.FC<NotificationProps> = ({
  notification,
  onClose,
}) => {
  const { message, type, duration = 5000 } = notification;

  useEffect(() => {
    if (duration) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const icons = {
    success: <CheckCircle size={20} className="text-green-500" />,
    error: <XCircle size={20} className="text-red-500" />,
    warning: <AlertTriangle size={20} className="text-orange-500" />,
    info: <Info size={20} className="text-blue-500" />,
  };

  const colors = {
    success: 'bg-green-50 border-green-200',
    error: 'bg-red-50 border-red-200',
    warning: 'bg-orange-50 border-orange-200',
    info: 'bg-blue-50 border-blue-200',
  };

  return (
    <div
      className={`flex items-center p-4 rounded-lg shadow-md border ${colors[type]} mb-3`}
      role="alert"
    >
      <div className="flex-shrink-0 mr-3">{icons[type]}</div>
      <div className="text-sm font-medium">{message}</div>
      <button
        onClick={onClose}
        className="ml-auto -mx-1.5 -my-1.5 p-1.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-300"
      >
        <X size={16} />
      </button>
    </div>
  );
};

export const NotificationContainer: React.FC = () => {
  const { notifications, removeNotification } = useNotificationStore();

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col items-end space-y-2">
      {notifications.map((notification) => (
        <NotificationComponent
          key={notification.id}
          notification={notification}
          onClose={() => removeNotification(notification.id)}
        />
      ))}
    </div>
  );
};
