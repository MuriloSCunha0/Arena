// Utility para debounce de notifications e prevenir spam
class NotificationDebouncer {
  private pendingNotifications = new Map<string, NodeJS.Timeout>();

  debounce(
    key: string, 
    message: string, 
    type: 'error' | 'warning' | 'success', 
    delay: number = 1000,
    addNotification?: (notification: { type: 'error' | 'warning' | 'success'; message: string }) => void
  ) {
    // Cancelar notification anterior para a mesma key
    if (this.pendingNotifications.has(key)) {
      clearTimeout(this.pendingNotifications.get(key)!);
    }

    // Agendar nova notification
    const timeoutId = setTimeout(() => {
      if (addNotification) {
        addNotification({ type, message });
      } else {
        // Fallback para console.log
        console.log(`[${type.toUpperCase()}] ${message}`);
      }
      this.pendingNotifications.delete(key);
    }, delay);

    this.pendingNotifications.set(key, timeoutId);
  }

  clear(key: string) {
    if (this.pendingNotifications.has(key)) {
      clearTimeout(this.pendingNotifications.get(key)!);
      this.pendingNotifications.delete(key);
    }
  }

  clearAll() {
    this.pendingNotifications.forEach(timeoutId => clearTimeout(timeoutId));
    this.pendingNotifications.clear();
  }
}

export const notificationDebouncer = new NotificationDebouncer();

// Hook para usar debounced notifications
export const useDebouncedNotification = () => {
  return {
    showError: (message: string, key?: string) => {
      notificationDebouncer.debounce(key || message, message, 'error');
    },
    showWarning: (message: string, key?: string) => {
      notificationDebouncer.debounce(key || message, message, 'warning');
    },
    showSuccess: (message: string, key?: string) => {
      notificationDebouncer.debounce(key || message, message, 'success');
    },
    clear: (key: string) => {
      notificationDebouncer.clear(key);
    },
    clearAll: () => {
      notificationDebouncer.clearAll();
    }
  };
};
