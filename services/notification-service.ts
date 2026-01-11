import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { Database } from '@nozbe/watermelondb';
import { Q } from '@nozbe/watermelondb';
import BudgetItem from '@/model/models/budget-item';
import BudgetItemNotification from '@/model/models/budget-item-notification';
import NotificationSettings from '@/model/models/notification-settings';
import { logger } from './logging-service';
import { LogType } from '@/types/logging';
import dayjs from '@/helpers/dayjs';

// Configure default notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export class NotificationService {
  private database: Database;

  constructor(database: Database) {
    this.database = database;
  }

  /**
   * Request notification permissions from the user.
   * @returns true if granted, false otherwise
   */
  async requestPermissions(): Promise<boolean> {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        logger.warn(LogType.Notification, 'Notification permissions denied');
        return false;
      }

      // Set up Android notification channel
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('bill-reminders', {
          name: 'Bill Reminders',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#00A3E0',
        });
      }

      logger.info(LogType.Notification, 'Notification permissions granted');
      return true;
    } catch (error) {
      logger.error(LogType.Notification, 'Error requesting notification permissions', { error });
      return false;
    }
  }

  /**
   * Get current notification permission status.
   */
  async getPermissionStatus(): Promise<'granted' | 'denied' | 'undetermined'> {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      return status;
    } catch (error) {
      logger.error(LogType.Notification, 'Error getting permission status', { error });
      return 'undetermined';
    }
  }

  /**
   * Schedule bill reminder notifications for a budget item.
   * BULLETPROOF VERSION - Prevents duplicate notifications by:
   * 1. Checking if identical notifications already exist (same bill, same time, same due date)
   * 2. Canceling stale notifications (due date changed)
   * 3. Only scheduling if notification time is in the future
   *
   * @param budgetItem The bill to schedule notifications for
   * @param settings User notification preferences
   * @returns Array of scheduled notification IDs
   */
  async scheduleBillReminders(
    budgetItem: BudgetItem,
    settings: NotificationSettings
  ): Promise<string[]> {
    try {
      // Check if we should schedule notifications for this item
      if (!this.shouldScheduleNotification(budgetItem)) {
        return [];
      }

      // Get existing notification records for this bill
      const existingNotifications = await this.database
        .get<BudgetItemNotification>('budget_item_notifications')
        .query(Q.where('budget_item_id', budgetItem.id))
        .fetch();

      const now = Date.now();
      const billDueDateTimestamp = budgetItem.dueDate!.getTime();

      // Build list of notifications we WANT to have scheduled
      const desiredNotifications: Array<{
        daysBefore: number;
        scheduledFor: Date;
        title: string;
        body: string;
      }> = [];

      // "1 day before" notification
      if (settings.notifyOneDayBefore) {
        const notificationDate = this.calculateNotificationDate(
          budgetItem.dueDate!,
          1,
          settings.reminderTimeHour,
          settings.reminderTimeMinute
        );

        // Only add if in the future
        if (notificationDate.getTime() > now) {
          // Calculate days difference based on date-only comparison
          const dueDateStart = dayjs(budgetItem.dueDate!).startOf('day');
          const notificationDateStart = dayjs(notificationDate).startOf('day');
          const daysUntilDue = dueDateStart.diff(notificationDateStart, 'days');

          const title = daysUntilDue === 1 ? 'Bill Due Tomorrow' : `Bill Due in ${daysUntilDue} Days`;
          const bodyText = daysUntilDue === 1
            ? `${budgetItem.name} - $${budgetItem.amount.toFixed(2)} is due tomorrow`
            : `${budgetItem.name} - $${budgetItem.amount.toFixed(2)} is due in ${daysUntilDue} days`;

          desiredNotifications.push({
            daysBefore: 1,
            scheduledFor: notificationDate,
            title,
            body: bodyText,
          });
        }
      }

      // "On due date" notification
      if (settings.notifyOnDueDate) {
        const notificationDate = this.calculateNotificationDate(
          budgetItem.dueDate!,
          0,
          settings.reminderTimeHour,
          settings.reminderTimeMinute
        );

        // Only add if in the future
        if (notificationDate.getTime() > now) {
          desiredNotifications.push({
            daysBefore: 0,
            scheduledFor: notificationDate,
            title: 'Bill Due Today',
            body: `${budgetItem.name} - $${budgetItem.amount.toFixed(2)} is due today`,
          });
        }
      }

      // Compare existing vs desired notifications
      const notificationsToCancel: BudgetItemNotification[] = [];
      const notificationsToKeep = new Set<number>(); // daysBefore values

      for (const existing of existingNotifications) {
        const matchingDesired = desiredNotifications.find(
          desired =>
            desired.daysBefore === existing.daysBefore &&
            desired.scheduledFor.getTime() === existing.scheduledFor &&
            billDueDateTimestamp === existing.billDueDate
        );

        if (matchingDesired) {
          // This notification is already scheduled correctly
          notificationsToKeep.add(existing.daysBefore);
        } else {
          // This notification is stale (due date changed, time changed, or settings changed)
          notificationsToCancel.push(existing);
        }
      }

      // Cancel stale notifications
      if (notificationsToCancel.length > 0) {
        for (const record of notificationsToCancel) {
          try {
            await Notifications.cancelScheduledNotificationAsync(record.notificationId);
            logger.info(LogType.Notification, `Cancelled stale notification for ${budgetItem.name}`, {
              notificationId: record.notificationId,
              budgetItemId: budgetItem.id,
              reason: 'stale',
            });
          } catch (error) {
            logger.warn(LogType.Notification, `Failed to cancel notification (may already have fired)`, {
              notificationId: record.notificationId,
              error,
            });
          }
        }

        await this.database.write(async () => {
          for (const record of notificationsToCancel) {
            await record.destroyPermanently();
          }
        });
      }

      // Schedule new notifications (only those not already scheduled)
      const newNotificationIds: string[] = [];
      const notificationsToCreate: Array<{
        notificationId: string;
        daysBefore: number;
        scheduledFor: number;
      }> = [];

      for (const desired of desiredNotifications) {
        // Skip if already scheduled
        if (notificationsToKeep.has(desired.daysBefore)) {
          continue;
        }

        const id = await this.scheduleNotification(
          desired.title,
          desired.body,
          desired.scheduledFor,
          { budgetItemId: budgetItem.id, type: 'bill_reminder', daysBefore: desired.daysBefore }
        );

        if (id) {
          newNotificationIds.push(id);
          notificationsToCreate.push({
            notificationId: id,
            daysBefore: desired.daysBefore,
            scheduledFor: desired.scheduledFor.getTime(),
          });

          logger.info(LogType.Notification, `Scheduled notification for ${budgetItem.name}`, {
            notificationId: id,
            budgetItemId: budgetItem.id,
            daysBefore: desired.daysBefore,
            scheduledFor: desired.scheduledFor.toISOString(),
          });
        }
      }

      // Store new notification records in database
      if (notificationsToCreate.length > 0) {
        await this.database.write(async () => {
          const collection = this.database.get<BudgetItemNotification>('budget_item_notifications');
          for (const notifData of notificationsToCreate) {
            await collection.create(record => {
              record.budgetItemId = budgetItem.id;
              record.notificationId = notifData.notificationId;
              record.scheduledFor = notifData.scheduledFor;
              record.daysBefore = notifData.daysBefore;
              record.billDueDate = billDueDateTimestamp;
            });
          }
        });

        logger.info(LogType.Notification, `Created ${notificationsToCreate.length} new notification records for ${budgetItem.name}`, {
          budgetItemId: budgetItem.id,
          newNotificationIds,
        });
      }

      return newNotificationIds;
    } catch (error) {
      logger.error(LogType.Notification, 'Error scheduling bill reminders', {
        budgetItemId: budgetItem.id,
        error,
      });
      return [];
    }
  }

  /**
   * Cancel all notifications for a budget item.
   */
  async cancelBillReminders(budgetItem: BudgetItem): Promise<void> {
    try {
      const notificationRecords = await this.database
        .get<BudgetItemNotification>('budget_item_notifications')
        .query(Q.where('budget_item_id', budgetItem.id))
        .fetch();

      if (notificationRecords.length === 0) {
        return;
      }

      // Cancel each notification individually
      for (const record of notificationRecords) {
        await Notifications.cancelScheduledNotificationAsync(record.notificationId);
        logger.info(LogType.Notification, `Cancelled notification for ${budgetItem.name}`, {
          notificationId: record.notificationId,
          budgetItemId: budgetItem.id,
        });
      }

      // Remove notification records
      await this.database.write(async () => {
        for (const record of notificationRecords) {
          await record.destroyPermanently();
        }
      });

      logger.info(
        LogType.Notification,
        `Cancelled ${notificationRecords.length} bill reminders for ${budgetItem.name}`,
        {
          budgetItemId: budgetItem.id,
          cancelledCount: notificationRecords.length,
        }
      );
    } catch (error) {
      logger.error(LogType.Notification, 'Error cancelling bill reminders', {
        budgetItemId: budgetItem.id,
        budgetItemName: budgetItem.name,
        error,
      });
    }
  }

  /**
   * Reschedule all bill reminders. Called when settings change.
   *
   * BULLETPROOF VERSION:
   * - Uses idempotent scheduleBillReminders (automatically handles changes)
   * - Cleans up fired notifications first
   * - No need to manually cancel - scheduleBillReminders handles it
   */
  async rescheduleAllBillReminders(): Promise<void> {
    try {
      logger.info(LogType.Notification, 'Rescheduling all bill reminders');

      // Clean up fired/expired notifications first
      await this.cleanupFiredNotifications();

      const settingsRecords = await this.database
        .get<NotificationSettings>('notification_settings')
        .query()
        .fetch();

      if (settingsRecords.length === 0 || !settingsRecords[0].billRemindersEnabled) {
        logger.info(LogType.Notification, 'Bill reminders disabled, cancelling all notifications');
        await this.cancelAllBillReminders();
        return;
      }

      const settings = settingsRecords[0];

      // Get all expense bills (non-auto-pay) with due dates in the next 14 days
      const fourteenDaysFromNow = dayjs().add(14, 'days').endOf('day').toDate();

      const bills = await this.database
        .get<BudgetItem>('budget_items')
        .query(
          Q.where('type', 'expense'),
          Q.where('due_date', Q.notEq(null)),
          Q.where('due_date', Q.lte(fourteenDaysFromNow.getTime()))
        )
        .fetch();

      // Reschedule notifications (idempotent - will cancel stale ones automatically)
      let scheduledCount = 0;
      for (const bill of bills) {
        const ids = await this.scheduleBillReminders(bill, settings);
        if (ids.length > 0) {
          scheduledCount++;
        }
      }

      logger.info(LogType.Notification, 'Rescheduled all bill reminders', {
        billCount: bills.length,
        scheduledCount,
      });
    } catch (error) {
      logger.error(LogType.Notification, 'Error rescheduling all bill reminders', { error });
    }
  }

  /**
   * Cancel all bill reminders (used when disabling notifications).
   */
  private async cancelAllBillReminders(): Promise<void> {
    try {
      const notificationRecords = await this.database
        .get<BudgetItemNotification>('budget_item_notifications')
        .query()
        .fetch();

      for (const record of notificationRecords) {
        await Notifications.cancelScheduledNotificationAsync(record.notificationId);
      }

      await this.database.write(async () => {
        for (const record of notificationRecords) {
          await record.destroyPermanently();
        }
      });

      logger.info(LogType.Notification, 'Cancelled all bill reminders', {
        cancelledCount: notificationRecords.length,
      });
    } catch (error) {
      logger.error(LogType.Notification, 'Error cancelling all bill reminders', { error });
    }
  }

  /**
   * Register for push notifications (for future server-triggered sync).
   * @returns Push token or null if registration failed
   */
  async registerForPushNotifications(): Promise<string | null> {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      if (status !== 'granted') {
        return null;
      }

      const token = (await Notifications.getExpoPushTokenAsync()).data;
      logger.info(LogType.Notification, 'Registered for push notifications', { token });

      // Store token in notification settings
      const settingsRecords = await this.database
        .get<NotificationSettings>('notification_settings')
        .query()
        .fetch();

      if (settingsRecords.length > 0) {
        await this.database.write(async () => {
          await settingsRecords[0].update(settings => {
            settings.pushToken = token;
          });
        });
      }

      return token;
    } catch (error) {
      logger.error(LogType.Notification, 'Error registering for push notifications', { error });
      return null;
    }
  }

  /**
   * Set up notification listeners for foreground, background, and response handling.
   */
  setupNotificationHandlers(): void {
    // Handle notification received while app is in foreground
    Notifications.addNotificationReceivedListener(notification => {
      logger.info(LogType.Notification, 'Notification received in foreground', {
        notificationId: notification.request.identifier,
        title: notification.request.content.title,
      });
    });

    // Handle notification tapped by user
    Notifications.addNotificationResponseReceivedListener(response => {
      logger.info(LogType.Notification, 'Notification response received', {
        notificationId: response.notification.request.identifier,
        actionIdentifier: response.actionIdentifier,
      });

      // TODO: Navigate to recurring screen when tapped
      const data = response.notification.request.content.data;
      if (data.budgetItemId) {
        // Navigation will be implemented when recurring screen is ready
        logger.info(LogType.Notification, 'User tapped bill notification', {
          budgetItemId: data.budgetItemId,
        });
      }
    });
  }

  /**
   * Schedule a single notification.
   */
  private async scheduleNotification(
    title: string,
    body: string,
    date: Date,
    data: Record<string, unknown>
  ): Promise<string | null> {
    try {
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: true,
          ...(Platform.OS === 'android' && { channelId: 'bill-reminders' }),
        },
        trigger: {
          date,
        },
      });

      return id;
    } catch (error) {
      logger.error(LogType.Notification, 'Error scheduling notification', { error, title, date });
      return null;
    }
  }

  /**
   * Calculate notification date based on due date and user preferences.
   */
  private calculateNotificationDate(
    dueDate: Date,
    daysBefore: number,
    hour: number,
    minute: number
  ): Date {
    return dayjs(dueDate)
      .subtract(daysBefore, 'days')
      .hour(hour)
      .minute(minute)
      .second(0)
      .millisecond(0)
      .toDate();
  }

  /**
   * Clean up notification records for notifications that have already fired or are in the past.
   * This prevents the database from accumulating stale records.
   */
  async cleanupFiredNotifications(): Promise<void> {
    try {
      const now = Date.now();

      // Find all notification records scheduled in the past
      const firedNotifications = await this.database
        .get<BudgetItemNotification>('budget_item_notifications')
        .query(Q.where('scheduled_for', Q.lt(now)))
        .fetch();

      if (firedNotifications.length === 0) {
        return;
      }

      // Remove them from the database
      await this.database.write(async () => {
        for (const record of firedNotifications) {
          await record.destroyPermanently();
        }
      });

      logger.info(LogType.Notification, `Cleaned up ${firedNotifications.length} fired notification records`);
    } catch (error) {
      logger.error(LogType.Notification, 'Error cleaning up fired notifications', { error });
    }
  }

  /**
   * Determine if a budget item should have notifications scheduled.
   */
  private shouldScheduleNotification(budgetItem: BudgetItem): boolean {
    // Must be an expense with a due date
    if (budgetItem.type !== 'expense' || !budgetItem.dueDate) {
      return false;
    }

    // Skip auto-pay bills
    if (budgetItem.isAutoPay) {
      return false;
    }

    // Must be in the future (with some buffer for today)
    const dueDateStart = dayjs(budgetItem.dueDate).startOf('day');
    const today = dayjs().startOf('day');

    if (dueDateStart.isBefore(today)) {
      return false;
    }

    // Only schedule notifications for bills due within 14 days
    // (iOS has a 64 notification limit, 14 days gives more time for background task to run)
    const fourteenDaysFromNow = dayjs().add(14, 'days').endOf('day');
    if (dueDateStart.isAfter(fourteenDaysFromNow)) {
      return false;
    }

    return true;
  }
}
