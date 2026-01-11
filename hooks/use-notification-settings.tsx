import { useEffect, useState } from 'react';
import database from '@/model/database';
import NotificationSettings from '@/model/models/notification-settings';
import { useNotificationContext } from '@/context/NotificationProvider';
import { logger } from '@/services/logging-service';
import { LogType } from '@/types/logging';

interface NotificationSettingsData {
  billRemindersEnabled: boolean;
  reminderTimeHour: number;
  reminderTimeMinute: number;
  notifyOnDueDate: boolean;
  notifyOneDayBefore: boolean;
  pushToken?: string | null;
  reminderTimeDisplay: string;
}

interface UseNotificationSettingsReturn {
  settings: NotificationSettingsData | null;
  isLoading: boolean;
  updateSettings: (updates: Partial<NotificationSettingsData>) => Promise<void>;
  requestPermissions: () => Promise<boolean>;
  permissionStatus: 'granted' | 'denied' | 'undetermined';
  isAvailable: boolean;
}

const DEFAULT_SETTINGS: Omit<NotificationSettingsData, 'reminderTimeDisplay' | 'pushToken'> = {
  billRemindersEnabled: false,
  reminderTimeHour: 9,
  reminderTimeMinute: 0,
  notifyOnDueDate: true,
  notifyOneDayBefore: true,
};

/**
 * Hook to manage notification settings.
 * Creates default settings if none exist.
 * Returns isAvailable=false if native modules aren't built.
 */
export function useNotificationSettings(): UseNotificationSettingsReturn {
  const [settings, setSettings] = useState<NotificationSettingsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [permissionStatus, setPermissionStatus] = useState<'granted' | 'denied' | 'undetermined'>(
    'undetermined'
  );
  const { notificationService, isAvailable } = useNotificationContext();

  // Load settings and permission status
  useEffect(() => {
    const loadSettings = async () => {
      try {
        setIsLoading(true);

        // If notifications aren't available, still load settings from DB but skip permission check
        if (!isAvailable || !notificationService) {
          // Just load settings from database without checking permissions
          const settingsRecords = await database
            .get<NotificationSettings>('notification_settings')
            .query()
            .fetch();

          let settingsRecord: NotificationSettings;

          if (settingsRecords.length === 0) {
            // Create default settings
            settingsRecord = await database.write(async () => {
              return await database.get<NotificationSettings>('notification_settings').create(s => {
                s.billRemindersEnabled = DEFAULT_SETTINGS.billRemindersEnabled;
                s.reminderTimeHour = DEFAULT_SETTINGS.reminderTimeHour;
                s.reminderTimeMinute = DEFAULT_SETTINGS.reminderTimeMinute;
                s.notifyOnDueDate = DEFAULT_SETTINGS.notifyOnDueDate;
                s.notifyOneDayBefore = DEFAULT_SETTINGS.notifyOneDayBefore;
              });
            });
          } else {
            settingsRecord = settingsRecords[0];
          }

          // Observe settings for changes
          const subscription = settingsRecord.observe().subscribe({
            next: record => {
              setSettings({
                billRemindersEnabled: false, // Force disabled when not available
                reminderTimeHour: record.reminderTimeHour,
                reminderTimeMinute: record.reminderTimeMinute,
                notifyOnDueDate: record.notifyOnDueDate,
                notifyOneDayBefore: record.notifyOneDayBefore,
                pushToken: record.pushToken,
                reminderTimeDisplay: record.reminderTimeDisplay,
              });
            },
            error: error => {
              logger.error('Error observing notification settings', { type: LogType.Database, error });
              setSettings(null);
            },
          });

          setIsLoading(false);
          return () => subscription.unsubscribe();
        }

        // Check permission status
        const status = await notificationService.getPermissionStatus();
        setPermissionStatus(status);

        // Get or create settings
        const settingsRecords = await database
          .get<NotificationSettings>('notification_settings')
          .query()
          .fetch();

        let settingsRecord: NotificationSettings;

        if (settingsRecords.length === 0) {
          // Create default settings
          settingsRecord = await database.write(async () => {
            return await database.get<NotificationSettings>('notification_settings').create(s => {
              s.billRemindersEnabled = DEFAULT_SETTINGS.billRemindersEnabled;
              s.reminderTimeHour = DEFAULT_SETTINGS.reminderTimeHour;
              s.reminderTimeMinute = DEFAULT_SETTINGS.reminderTimeMinute;
              s.notifyOnDueDate = DEFAULT_SETTINGS.notifyOnDueDate;
              s.notifyOneDayBefore = DEFAULT_SETTINGS.notifyOneDayBefore;
            });
          });
          logger.info('Created default notification settings', { type: LogType.General });
        } else {
          settingsRecord = settingsRecords[0];
        }

        // Observe settings for changes
        const subscription = settingsRecord.observe().subscribe({
          next: record => {
            setSettings({
              billRemindersEnabled: record.billRemindersEnabled,
              reminderTimeHour: record.reminderTimeHour,
              reminderTimeMinute: record.reminderTimeMinute,
              notifyOnDueDate: record.notifyOnDueDate,
              notifyOneDayBefore: record.notifyOneDayBefore,
              pushToken: record.pushToken,
              reminderTimeDisplay: record.reminderTimeDisplay,
            });
          },
          error: error => {
            logger.error('Error observing notification settings', { type: LogType.Database, error });
            setSettings(null);
          },
        });

        setIsLoading(false);

        return () => subscription.unsubscribe();
      } catch (error) {
        logger.error('Error loading notification settings', { type: LogType.Database, error });
        setIsLoading(false);
      }
    };

    void loadSettings();
  }, [notificationService, isAvailable]);

  /**
   * Update notification settings and reschedule notifications if needed.
   */
  const updateSettings = async (updates: Partial<NotificationSettingsData>) => {
    try {
      const settingsRecords = await database
        .get<NotificationSettings>('notification_settings')
        .query()
        .fetch();

      if (settingsRecords.length === 0) {
        logger.error('No settings record found to update', { type: LogType.Database });
        return;
      }

      const oldSettings = settingsRecords[0];
      const settingsChanged =
        updates.reminderTimeHour !== undefined ||
        updates.reminderTimeMinute !== undefined ||
        updates.notifyOnDueDate !== undefined ||
        updates.notifyOneDayBefore !== undefined;

      await database.write(async () => {
        await oldSettings.update(s => {
          if (updates.billRemindersEnabled !== undefined) {
            s.billRemindersEnabled = updates.billRemindersEnabled;
          }
          if (updates.reminderTimeHour !== undefined) {
            s.reminderTimeHour = updates.reminderTimeHour;
          }
          if (updates.reminderTimeMinute !== undefined) {
            s.reminderTimeMinute = updates.reminderTimeMinute;
          }
          if (updates.notifyOnDueDate !== undefined) {
            s.notifyOnDueDate = updates.notifyOnDueDate;
          }
          if (updates.notifyOneDayBefore !== undefined) {
            s.notifyOneDayBefore = updates.notifyOneDayBefore;
          }
        });
      });

      // Reschedule all notifications if settings changed and service is available
      if (notificationService && (settingsChanged || updates.billRemindersEnabled !== undefined)) {
        await notificationService.rescheduleAllBillReminders();
      }

      logger.info('Updated notification settings', { type: LogType.General, updates });
    } catch (error) {
      logger.error('Error updating notification settings', { type: LogType.Database, error });
    }
  };

  /**
   * Request notification permissions from the user.
   */
  const requestPermissions = async (): Promise<boolean> => {
    if (!notificationService) {
      logger.warn('Cannot request permissions: notification service not available', {
        type: LogType.General,
      });
      return false;
    }

    const granted = await notificationService.requestPermissions();
    const status = await notificationService.getPermissionStatus();
    setPermissionStatus(status);
    return granted;
  };

  return {
    settings,
    isLoading,
    updateSettings,
    requestPermissions,
    permissionStatus,
    isAvailable,
  };
}
