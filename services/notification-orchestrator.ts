import { Q } from '@nozbe/watermelondb';
import database from '@/model/database';
import { logger } from '@/services/logging-service';
import { LogType } from '@/types/logging';
import { Subscription } from 'rxjs';

/**
 * NotificationOrchestrator - Watches for budget item changes and reschedules notifications.
 *
 * This service observes changes to budget items (due date, auto-pay status) and automatically
 * reschedules bill reminders when those fields change.
 */
class NotificationOrchestrator {
  private subscription: Subscription | null = null;
  private NotificationServiceClass: any = null;
  private NotificationSettings: any = null;
  private BudgetItem: any = null;
  private isAvailable = false;
  private hasSeeded = false;
  private lastBills = new Map<
    string,
    {
      dueDate: number | null;
      isAutoPay: boolean;
    }
  >();

  /**
   * Start watching for budget item changes.
   * Only runs if notifications are available.
   */
  async start(): Promise<void> {
    try {
      // Check if notifications are available (conditional import)
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        require('expo-notifications');
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const notifService = require('@/services/notification-service');
        this.NotificationServiceClass = notifService.NotificationService;
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        this.NotificationSettings = require('@/model/models/notification-settings').default;
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        this.BudgetItem = require('@/model/models/budget-item').default;
        this.isAvailable = true;
      } catch {
        // Notifications not available
        logger.info('Notifications not available, skipping NotificationOrchestrator', {
          type: LogType.General,
        });
        return;
      }

      if (this.subscription) {
        logger.warn('NotificationOrchestrator already started', { type: LogType.General });
        return;
      }

      // Observe expense budget items with due dates
      this.subscription = database
        .get(this.BudgetItem.table)
        .query(Q.where('type', 'expense'), Q.where('due_date', Q.notEq(null)))
        .observeWithColumns(['due_date', 'is_auto_pay'])
        .subscribe({
          next: async bills => {
            await this.handleBudgetItemsChanged(bills);
          },
          error: error => {
            logger.error('Error observing budget items', { type: LogType.General, error });
          },
        });

      logger.info('NotificationOrchestrator started', { type: LogType.General });
    } catch (error) {
      logger.error('Failed to start NotificationOrchestrator', { type: LogType.General, error });
    }
  }

  /**
   * Stop watching for budget item changes.
   */
  stop(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
      this.subscription = null;
      logger.info('NotificationOrchestrator stopped', { type: LogType.General });
    }
  }

  /**
   * Handle budget item changes by rescheduling notifications.
   */
  private async handleBudgetItemsChanged(bills: any[]): Promise<void> {
    if (!this.isAvailable || !this.NotificationServiceClass) {
      return;
    }

    try {
      if (!this.hasSeeded) {
        this.lastBills.clear();
        for (const bill of bills) {
          this.lastBills.set(bill.id, {
            dueDate: bill.dueDate ? bill.dueDate.getTime() : null,
            isAutoPay: !!bill.isAutoPay,
          });
        }
        this.hasSeeded = true;
        return;
      }

      // Get notification settings
      const settingsRecords = await database.get(this.NotificationSettings.table).query().fetch();

      if (settingsRecords.length === 0 || !settingsRecords[0].billRemindersEnabled) {
        return;
      }

      const settings = settingsRecords[0];
      const notificationService = new this.NotificationServiceClass(database);
      const currentIds = new Set<string>();
      const previousIds = new Set(this.lastBills.keys());

      // Reschedule notifications for changed bills
      for (const bill of bills) {
        currentIds.add(bill.id);
        const previous = this.lastBills.get(bill.id);
        const dueDateValue = bill.dueDate ? bill.dueDate.getTime() : null;
        const isAutoPay = !!bill.isAutoPay;
        const hasChanged =
          !previous || previous.dueDate !== dueDateValue || previous.isAutoPay !== isAutoPay;

        this.lastBills.set(bill.id, { dueDate: dueDateValue, isAutoPay });

        if (!hasChanged) {
          continue;
        }

        // Cancel existing notifications
        await notificationService.cancelBillReminders(bill);

        // Skip auto-pay bills
        if (bill.isAutoPay) {
          continue;
        }

        // Reschedule if bill is within scheduling window
        await notificationService.scheduleBillReminders(bill, settings);
      }

      // Cancel notifications for bills that no longer match the query (removed or no due date)
      for (const billId of previousIds) {
        if (currentIds.has(billId)) {
          continue;
        }

        try {
          const removedBill = await database.get(this.BudgetItem.table).find(billId);
          await notificationService.cancelBillReminders(removedBill);
        } catch {
          // Bill no longer exists; nothing to cancel.
        } finally {
          this.lastBills.delete(billId);
        }
      }
    } catch (error) {
      logger.error('Failed to handle budget item changes', { type: LogType.General, error });
    }
  }

  /**
   * Get orchestrator status.
   */
  getStatus(): { running: boolean; available: boolean } {
    return {
      running: this.subscription !== null,
      available: this.isAvailable,
    };
  }
}

// Export singleton instance
export const notificationOrchestrator = new NotificationOrchestrator();
