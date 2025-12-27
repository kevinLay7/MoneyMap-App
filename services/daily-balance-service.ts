import { Database, Q } from '@nozbe/watermelondb';
import Account from '@/model/models/account';
import Transaction from '@/model/models/transaction';
import AccountDailyBalance from '@/model/models/account-daily-balance';
import dayjs from 'dayjs';

/**
 * Service for calculating and storing daily account balances.
 * Works backwards from current balance using transaction history.
 */
export class DailyBalanceService {
  constructor(private readonly database: Database) {}

  /**
   * Calculates and stores daily balances for all accounts.
   * Designed to run in background after sync.
   */
  async calculateAllAccountBalances(): Promise<void> {
    try {
      const accounts = await this.database.get<Account>('accounts').query().fetch();

      // Process accounts sequentially to avoid database contention
      for (const account of accounts) {
        try {
          await this.calculateDailyBalancesForAccount(account);
        } catch (error) {
          console.error(`Failed to calculate daily balances for account ${account.id}:`, error);
          // Continue with other accounts
        }
      }
    } catch (error) {
      console.error('Failed to calculate daily balances for all accounts:', error);
    }
  }

  /**
   * Calculates and stores daily balances for a specific account.
   * Uses the current balance and works backwards through transaction history.
   *
   * @param account - The account to calculate balances for
   * @param daysBack - Number of days to calculate (default: 90)
   */
  async calculateDailyBalancesForAccount(account: Account, daysBack: number = 90): Promise<void> {
    // Fetch all non-pending transactions for this account, sorted by date descending
    const transactions = await this.database
      .get<Transaction>('transactions')
      .query(
        Q.where('account_id', account.accountId),
        Q.where('pending', false),
        Q.sortBy('date', Q.desc)
      )
      .fetch();

    // Group transactions by date
    const transactionsByDate = new Map<string, Transaction[]>();
    for (const tx of transactions) {
      const dateKey = tx.date; // Format: YYYY-MM-DD
      if (!transactionsByDate.has(dateKey)) {
        transactionsByDate.set(dateKey, []);
      }
      transactionsByDate.get(dateKey)!.push(tx);
    }

    // Calculate daily balances working backwards from current balance
    const today = dayjs().format('YYYY-MM-DD');
    const startDate = dayjs().subtract(daysBack, 'day');
    let runningBalance = account.balanceCurrent;

    const dailyBalances: { date: string; balance: number }[] = [];

    // Start from today and work backwards
    let currentDate = dayjs();
    while (currentDate.isAfter(startDate) || currentDate.isSame(startDate, 'day')) {
      const dateKey = currentDate.format('YYYY-MM-DD');

      // Record the balance for this date (end of day balance)
      dailyBalances.push({
        date: dateKey,
        balance: runningBalance,
      });

      // Get transactions for the previous day and reverse their effect
      // We're moving backwards, so we need to reverse what happened today
      const dayTransactions = transactionsByDate.get(dateKey) || [];
      for (const tx of dayTransactions) {
        // In Plaid: positive = money out (debit), negative = money in (credit)
        // To reverse: add the amount back (if it was a debit, money goes back in)
        runningBalance += tx.amount;
      }

      currentDate = currentDate.subtract(1, 'day');
    }

    // Store calculated balances in database
    await this.storeDailyBalances(account, dailyBalances);
  }

  /**
   * Stores daily balances in the database, updating existing records or creating new ones.
   */
  private async storeDailyBalances(
    account: Account,
    dailyBalances: { date: string; balance: number }[]
  ): Promise<void> {
    await this.database.write(async () => {
      // Fetch existing balances for this account
      const existingBalances = await this.database
        .get<AccountDailyBalance>('account_daily_balances')
        .query(Q.where('account_id', account.accountId))
        .fetch();

      // Create a map of existing balances by date
      const existingByDate = new Map<string, AccountDailyBalance>();
      for (const balance of existingBalances) {
        existingByDate.set(balance.date, balance);
      }

      // Batch operations
      const toCreate: { date: string; balance: number }[] = [];
      const toUpdate: { record: AccountDailyBalance; balance: number }[] = [];

      for (const { date, balance } of dailyBalances) {
        const existing = existingByDate.get(date);
        if (existing) {
          // Only update if balance changed
          if (existing.balance !== balance) {
            toUpdate.push({ record: existing, balance });
          }
        } else {
          toCreate.push({ date, balance });
        }
      }

      // Perform batch create
      if (toCreate.length > 0) {
        await this.database.batch(
          ...toCreate.map(({ date, balance }) =>
            this.database.get<AccountDailyBalance>('account_daily_balances').prepareCreate(record => {
              record.accountId = account.accountId;
              record.itemId = account.itemId;
              record.date = date;
              record.balance = balance;
            })
          )
        );
      }

      // Perform batch update
      if (toUpdate.length > 0) {
        await this.database.batch(
          ...toUpdate.map(({ record, balance }) =>
            record.prepareUpdate(r => {
              r.balance = balance;
            })
          )
        );
      }
    });
  }

  /**
   * Deletes all daily balances for a specific account.
   * Useful when account is removed or needs full recalculation.
   */
  async clearBalancesForAccount(accountId: string): Promise<void> {
    await this.database.write(async () => {
      const balances = await this.database
        .get<AccountDailyBalance>('account_daily_balances')
        .query(Q.where('account_id', accountId))
        .fetch();

      await this.database.batch(...balances.map(b => b.prepareDestroyPermanently()));
    });
  }
}

