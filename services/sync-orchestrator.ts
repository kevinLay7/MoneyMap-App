import { InteractionManager } from 'react-native';
import { Sync } from '@/api/gen/Sync';
import { Plaid } from '@/api/gen/Plaid';
import { databaseSynchronize, pushOnlyChanges } from '@/model/synchronize';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SyncLogger from '@nozbe/watermelondb/sync/SyncLogger';
import dayjs from 'dayjs';
import database from '@/model/database';
import Item from '@/model/models/item';
import { PlaidService } from './plaid-service';
import { BudgetService } from './budget-service';
import { logger } from '@/services/logging-service';
import { LogType } from '@/types/logging';

// Intervals
const FOREGROUND_FULL_SYNC_INTERVAL = 60 * 1000; // 60 seconds
const PUSH_DEBOUNCE_DELAY = 3 * 1000; // 3 seconds after last write
const PLAID_CHECK_INTERVAL = 12 * 60 * 60 * 1000; // 12 hours
const STALE_ITEM_THRESHOLD_HOURS = 12;

// Storage keys
const LAST_PLAID_CHECK_KEY = 'last_plaid_check';

// Lock timeout
const SYNC_LOCK_TIMEOUT = 60 * 1000; // 60 seconds

type SyncMode = 'foreground' | 'background' | 'stopped';

interface SyncOrchestratorConfig {
  syncApi: Sync;
  plaidApi: Plaid;
}

/**
 * SyncOrchestrator - Central controller for all sync operations.
 *
 * Foreground mode:
 * - Full sync every 60s
 * - Debounced push 3s after local DB writes
 * - Plaid check every 12h (fallback for missed webhooks)
 *
 * Background mode:
 * - Handled by expo-background-task (OS-scheduled)
 */
class SyncOrchestrator {
  private syncApi: Sync | null = null;
  private plaidApi: Plaid | null = null;
  private mode: SyncMode = 'stopped';

  // Sync lock state
  private syncInProgress = false;
  private syncLockAcquiredAt: number | null = null;

  // Foreground timers
  private fullSyncTimer: ReturnType<typeof setInterval> | null = null;
  private plaidCheckTimer: ReturnType<typeof setInterval> | null = null;
  private pushDebounceTimer: ReturnType<typeof setTimeout> | null = null;

  // DB change subscription
  private dbSubscription: (() => void) | null = null;

  /**
   * Initialize the orchestrator with API clients.
   */
  initialize(config: SyncOrchestratorConfig): void {
    this.syncApi = config.syncApi;
    this.plaidApi = config.plaidApi;
    logger.info(LogType.Sync, 'SyncOrchestrator initialized');
  }

  /**
   * Check if orchestrator is ready.
   */
  isInitialized(): boolean {
    return this.syncApi !== null && this.plaidApi !== null;
  }

  /**
   * Start foreground sync mode.
   * Called when app becomes active.
   */
  startForeground(): void {
    if (this.mode === 'foreground') {
      logger.info(LogType.Sync, 'SyncOrchestrator already in foreground mode');
      return;
    }

    if (!this.isInitialized()) {
      logger.warn(LogType.Sync, 'SyncOrchestrator not initialized, cannot start foreground mode');
      return;
    }

    this.mode = 'foreground';
    logger.info(LogType.Sync, 'SyncOrchestrator starting foreground mode');

    // Immediate full sync on app resume
    this.executeFullSync();

    // Start periodic full sync
    this.fullSyncTimer = setInterval(() => {
      this.executeFullSync();
    }, FOREGROUND_FULL_SYNC_INTERVAL);

    // Start periodic plaid check (12h interval, but check immediately if stale)
    this.checkPlaidIfStale();
    this.plaidCheckTimer = setInterval(() => {
      this.checkPlaidIfStale();
    }, PLAID_CHECK_INTERVAL);

    // Subscribe to database changes for debounced push
    this.subscribeToDbChanges();
  }

  /**
   * Stop foreground sync mode.
   * Called when app goes to background.
   */
  stopForeground(): void {
    if (this.mode === 'stopped') {
      return;
    }

    logger.info(LogType.Sync, 'SyncOrchestrator stopping foreground mode');
    this.mode = 'stopped';

    // Clear all timers
    if (this.fullSyncTimer) {
      clearInterval(this.fullSyncTimer);
      this.fullSyncTimer = null;
    }

    if (this.plaidCheckTimer) {
      clearInterval(this.plaidCheckTimer);
      this.plaidCheckTimer = null;
    }

    if (this.pushDebounceTimer) {
      clearTimeout(this.pushDebounceTimer);
      this.pushDebounceTimer = null;
    }

    // Unsubscribe from database changes
    if (this.dbSubscription) {
      this.dbSubscription();
      this.dbSubscription = null;
    }
  }

  /**
   * Subscribe to WatermelonDB changes for debounced push.
   */
  private subscribeToDbChanges(): void {
    if (this.dbSubscription) {
      this.dbSubscription();
    }

    // Subscribe to all database changes
    this.dbSubscription = database.experimentalSubscribe(
      ['transactions', 'accounts', 'items', 'categories', 'budgets', 'budget_items'],
      () => {
        logger.info(LogType.Sync, 'Database change detected, scheduling push');
        this.scheduleDebouncedPush();
      }
    );
  }

  /**
   * Schedule a debounced push operation.
   * Resets timer on each call, pushing 3s after last write.
   */
  private scheduleDebouncedPush(): void {
    // Clear existing timer
    if (this.pushDebounceTimer) {
      clearTimeout(this.pushDebounceTimer);
    }

    // Schedule new push
    logger.info(LogType.Sync, `Scheduling push-only sync in ${PUSH_DEBOUNCE_DELAY / 1000}s`);
    this.pushDebounceTimer = setTimeout(() => {
      this.executePushOnly();
    }, PUSH_DEBOUNCE_DELAY);
  }

  /**
   * Acquire sync lock. Returns true if acquired, false if already locked.
   * Auto-releases stale locks.
   */
  private acquireSyncLock(): boolean {
    const now = Date.now();

    // Check for stale lock
    if (this.syncInProgress && this.syncLockAcquiredAt) {
      const lockHeldFor = now - this.syncLockAcquiredAt;
      if (lockHeldFor > SYNC_LOCK_TIMEOUT) {
        logger.warn(LogType.Sync, `Sync lock stale (held ${Math.round(lockHeldFor / 1000)}s), force-releasing`);
        this.releaseSyncLock();
      }
    }

    if (this.syncInProgress) {
      return false;
    }

    this.syncInProgress = true;
    this.syncLockAcquiredAt = now;
    return true;
  }

  /**
   * Release sync lock.
   */
  private releaseSyncLock(): void {
    this.syncInProgress = false;
    this.syncLockAcquiredAt = null;
  }

  /**
   * Run operation after user interactions complete (non-blocking).
   */
  private runAfterInteractions<T>(operation: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      InteractionManager.runAfterInteractions(() => {
        operation().then(resolve).catch(reject);
      });
    });
  }

  /**
   * Execute full sync (pull + push) with lock.
   */
  async executeFullSync(): Promise<void> {
    if (!this.syncApi) {
      logger.warn(LogType.Sync, 'SyncOrchestrator: syncApi not available');
      return;
    }

    if (!this.acquireSyncLock()) {
      logger.info(LogType.Sync, 'Sync in progress, skipping full sync');
      return;
    }

    try {
      await this.runAfterInteractions(async () => {
        const syncLogger = new SyncLogger(1000);
        await databaseSynchronize(this.syncApi!, syncLogger);
        const budgetService = new BudgetService(database);
        await budgetService.completeExpiredBudgetsAndItems();

        // Schedule upcoming bill reminders after successful sync
        await this.scheduleUpcomingBillReminders();
      });
    } catch (error) {
      logger.error(LogType.Sync, 'Full sync failed', { error });
    } finally {
      this.releaseSyncLock();
    }
  }

  /**
   * Execute push-only sync with lock.
   */
  async executePushOnly(): Promise<void> {
    if (!this.syncApi) {
      logger.warn(LogType.Sync, 'SyncOrchestrator: syncApi not available');
      return;
    }

    if (!this.acquireSyncLock()) {
      logger.info(LogType.Sync, 'Sync in progress, skipping push-only');
      return;
    }

    try {
      logger.info(LogType.Sync, 'Starting push-only sync');
      await this.runAfterInteractions(async () => {
        await pushOnlyChanges(this.syncApi!);
      });
      logger.info(LogType.Sync, 'Push-only sync completed');
    } catch (error) {
      logger.error(LogType.Sync, 'Push-only sync failed', { error });
    } finally {
      this.releaseSyncLock();
    }
  }

  /**
   * Check if any Plaid items are stale and need refresh.
   * Only runs if 12h since last check.
   */
  private async checkPlaidIfStale(): Promise<void> {
    try {
      // Check last plaid check time
      const lastCheckStr = await AsyncStorage.getItem(LAST_PLAID_CHECK_KEY);
      const lastCheck = lastCheckStr ? parseInt(lastCheckStr, 10) : 0;
      const now = Date.now();

      if (lastCheck && now - lastCheck < PLAID_CHECK_INTERVAL) {
        const hoursRemaining = Math.round((PLAID_CHECK_INTERVAL - (now - lastCheck)) / (60 * 60 * 1000));
        logger.info(LogType.Sync, `Plaid check skipped: ${hoursRemaining}h until next check`);
        return;
      }

      logger.info(LogType.Sync, 'Checking for stale Plaid items');

      // Query items from database
      const items = await database.get<Item>('items').query().fetch();

      // Filter items that are stale
      const staleItems = items.filter(item => {
        if (!item.lastLocalRefresh) return true;
        return dayjs(item.lastLocalRefresh).isBefore(dayjs().subtract(STALE_ITEM_THRESHOLD_HOURS, 'hour'));
      });

      if (staleItems.length === 0) {
        logger.info(LogType.Sync, 'All Plaid items up to date');
        await AsyncStorage.setItem(LAST_PLAID_CHECK_KEY, now.toString());
        return;
      }

      logger.warn(LogType.Sync, `${staleItems.length} stale items found`, {
        staleItems: staleItems.map(i => i.institutionName),
      });

      // Refresh stale items (fire-and-forget, non-blocking)
      this.runAfterInteractions(async () => {
        if (!this.plaidApi) return;

        // First, trigger backend webhook check
        try {
          await this.plaidApi.plaidControllerCheckForUpdates();
        } catch (error) {
          logger.error(LogType.Sync, 'Plaid checkForUpdates failed', { error });
        }

        // Then refresh stale items
        const plaidService = new PlaidService(this.plaidApi, database);

        for (const item of staleItems) {
          try {
            logger.info(LogType.Sync, `Refreshing: ${item.institutionName}`);
            await plaidService.refeshItem(item.plaidItemId);
            logger.info(LogType.Sync, `Refreshed: ${item.institutionName}`);
          } catch (error) {
            logger.error(LogType.Sync, `Failed to refresh ${item.institutionName}`, { error });
          }
        }
      }).catch(error => {
        logger.error(LogType.Sync, 'Plaid refresh failed', { error });
      });

      // Update last check time
      await AsyncStorage.setItem(LAST_PLAID_CHECK_KEY, now.toString());
    } catch (error) {
      logger.error(LogType.Sync, 'Plaid stale check failed', { error });
    }
  }

  /**
   * Execute background sync (called from BackgroundTaskService).
   * Combines full sync + plaid check.
   */
  async executeBackgroundSync(): Promise<boolean> {
    if (!this.isInitialized()) {
      logger.warn(LogType.Sync, 'SyncOrchestrator not initialized for background sync');
      return false;
    }

    if (!this.acquireSyncLock()) {
      logger.info(LogType.Sync, 'Sync in progress, skipping background sync');
      return true; // Not a failure, just skipped
    }

    try {
      // Full sync
      const syncLogger = new SyncLogger(1000);
      await databaseSynchronize(this.syncApi!, syncLogger);
      logger.info(LogType.Sync, 'Background full sync completed');
      const budgetService = new BudgetService(database);
      await budgetService.completeExpiredBudgetsAndItems();

      // Check for stale plaid items
      await this.checkPlaidIfStale();

      return true;
    } catch (error) {
      logger.error(LogType.Sync, 'Background sync failed', { error });
      return false;
    } finally {
      this.releaseSyncLock();
    }
  }

  /**
   * Force release sync lock (for debugging/recovery).
   */
  forceReleaseLock(): void {
    logger.warn(LogType.Sync, 'Force releasing sync lock');
    this.syncInProgress = false;
    this.syncLockAcquiredAt = null;
  }

  /**
   * Get current orchestrator status.
   */
  getStatus(): {
    mode: SyncMode;
    syncInProgress: boolean;
    initialized: boolean;
  } {
    return {
      mode: this.mode,
      syncInProgress: this.syncInProgress,
      initialized: this.isInitialized(),
    };
  }

  /**
   * Schedule upcoming bill reminders (14-day window).
   * Only runs if notifications are available and enabled.
   *
   * BULLETPROOF VERSION:
   * - Cleans up fired notifications first
   * - Uses idempotent scheduleBillReminders (won't create duplicates)
   * - Safe to call multiple times
   */
  private async scheduleUpcomingBillReminders(): Promise<void> {
    try {
      // Check if notifications are available (conditional import)
      let NotificationServiceClass;
      let NotificationSettings;
      let BudgetItem;
      let Q;

      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        require('expo-notifications');
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const notifService = require('@/services/notification-service');
        NotificationServiceClass = notifService.NotificationService;
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        NotificationSettings = require('@/model/models/notification-settings').default;
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        BudgetItem = require('@/model/models/budget-item').default;
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        Q = require('@nozbe/watermelondb').Q;
      } catch {
        // Notifications not available, skip silently
        return;
      }

      const notificationService = new NotificationServiceClass(database);

      // Clean up fired/expired notifications first
      await notificationService.cleanupFiredNotifications();

      // Get notification settings
      const settingsRecords = await database.get(NotificationSettings.table).query().fetch();

      if (settingsRecords.length === 0 || !settingsRecords[0].billRemindersEnabled) {
        return;
      }

      const settings = settingsRecords[0];

      // Get bills due in next 14 days
      const fourteenDaysFromNow = dayjs().add(14, 'days').endOf('day').toDate();

      const bills = await database
        .get(BudgetItem.table)
        .query(
          Q.where('type', 'expense'),
          Q.where('due_date', Q.notEq(null)),
          Q.where('due_date', Q.lte(fourteenDaysFromNow.getTime())),
          Q.or(Q.where('is_auto_pay', Q.eq(null)), Q.where('is_auto_pay', Q.eq(false)))
        )
        .fetch();

      // Schedule notifications (idempotent - won't create duplicates)
      let scheduledCount = 0;
      for (const bill of bills) {
        const ids = await notificationService.scheduleBillReminders(bill, settings);
        if (ids.length > 0) {
          scheduledCount++;
        }
      }

      if (scheduledCount > 0) {
        logger.info(LogType.Sync, `Scheduled notifications for ${scheduledCount}/${bills.length} bills`);
      }
    } catch (error) {
      logger.error(LogType.Sync, 'Failed to schedule bill reminders', { error });
    }
  }
}

// Export singleton instance
export const syncOrchestrator = new SyncOrchestrator();
