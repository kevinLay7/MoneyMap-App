import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import database from '@/model/database';

// Type-only import to avoid loading the module
import type { NotificationService as NotificationServiceType } from '@/services/notification-service';

interface NotificationContextValue {
  readonly notificationService: NotificationServiceType | null;
  readonly isAvailable: boolean;
}

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);

// Check if expo-notifications native module is available
let notificationsAvailable = false;
let NotificationServiceClass: typeof NotificationServiceType | null = null;

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('expo-notifications');
  // Only import the service if expo-notifications is available
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { NotificationService } = require('@/services/notification-service');
  NotificationServiceClass = NotificationService;
  notificationsAvailable = true;
} catch {
  // Note: Using console.warn here because logger might not be initialized yet
  console.warn(
    "expo-notifications native module not available. Run 'npm run ios' to build native modules."
  );
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [isAvailable] = useState(notificationsAvailable);
  const notificationService = useMemo(
    () => (isAvailable && NotificationServiceClass ? new NotificationServiceClass(database) : null),
    [isAvailable]
  );

  useEffect(() => {
    if (!notificationService || !isAvailable) {
      return;
    }

    // Set up notification handlers on mount
    notificationService.setupNotificationHandlers();

    // Request permissions and register for push notifications if not already done
    const initializeNotifications = async () => {
      try {
        const status = await notificationService.getPermissionStatus();

        if (status === 'granted') {
          // Register for push notifications (for future server sync feature)
          await notificationService.registerForPushNotifications();
        }
      } catch (error) {
        console.error('Error initializing notifications', error);
      }
    };

    void initializeNotifications();
  }, [notificationService, isAvailable]);

  const value = useMemo(
    () => ({
      notificationService,
      isAvailable,
    }),
    [notificationService, isAvailable]
  );

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export const useNotificationService = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotificationService must be used within NotificationProvider');
  }
  return context.notificationService;
};

export const useNotificationContext = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotificationContext must be used within NotificationProvider');
  }
  return context;
};
