import { isDateBetween } from '@/helpers/dayjs';
import Account from '@/model/models/account';
import Budget from '@/model/models/budget';
import BudgetItem from '@/model/models/budget-item';
import { AccountBalanceSrouce, BudgetBalanceSource, BudgetDuration } from '@/types/budget';
import { Database, Q } from '@nozbe/watermelondb';

export interface CreateBudgetDto {
  startDate: Date;
  endDate: Date;
  balance: number;
  balanceSource: BudgetBalanceSource;
  accountBalanceSource: AccountBalanceSrouce;
  accountId: string;
  duration: BudgetDuration;
}

export class BudgetService {
  constructor(private readonly database: Database) {}

  /**
   * Creates a new budget.
   * @param createBudgetDto - The data to create a new budget.
   * @returns The created budget.
   */
  async createBudget(createBudgetDto: CreateBudgetDto) {
    return await this.database.write(async () => {
      const insertedBudget = await this.database.get<Budget>('budgets').create(budget => {
        budget.startDate = createBudgetDto.startDate;
        budget.endDate = createBudgetDto.endDate;
        budget.balance = createBudgetDto.balance;
        budget.balanceSource = createBudgetDto.balanceSource;
        budget.accountBalanceSource = createBudgetDto.accountBalanceSource;
        budget.accountId = createBudgetDto.accountId;
        budget.duration = createBudgetDto.duration;
      });

      if (insertedBudget.balanceSource === BudgetBalanceSource.Account) {
        await this.updateBudgetBalancesForAccount(insertedBudget.accountId!);
      }

      return insertedBudget;
    });
  }

  /**
   * Deletes a budget and all its associated budget items.
   * @param budgetId - The id of the budget to delete.
   */
  async deleteBudget(budgetId: string) {
    await this.database.write(async () => {
      const budget = await this.database.get<Budget>('budgets').find(budgetId);
      if (budget) {
        await budget.markAsDeleted();
      }

      const budgetItems = await this.database
        .get<BudgetItem>('budget_items')
        .query(Q.where('budget_id', budgetId))
        .fetch();
      for (const budgetItem of budgetItems) {
        await budgetItem.markAsDeleted();
      }
    });
  }

  /**
   * Gets the latest budget.
   * @returns The latest budget.
   */
  async getLatestBudget(): Promise<Budget | null> {
    const latestBudget = await this.database
      .get<Budget>('budgets')
      .query(Q.sortBy('created_at', Q.desc), Q.take(1))
      .fetch();

    return latestBudget?.[0] ?? null;
  }

  /**
   * Updates the balances for all budgets associated with an account.
   * @param account - The account to update the balances for.
   */
  async updateBudgetBalancesForAccount(account: Account | string) {
    const accountId = typeof account === 'string' ? account : account.accountId;
    if (!accountId) {
      return;
    }
    let internalAccount: Account | null = null;
    if (typeof account === 'string') {
      internalAccount = await this.database.get<Account>('accounts').find(accountId);
    } else {
      internalAccount = account;
    }

    const budgets = await this.database
      .get<Budget>('budgets')
      .query(Q.where('account_id', internalAccount.id), Q.where('balance_source', BudgetBalanceSource.Account))
      .fetch();

    const currentBudgets = budgets.filter(budget => isDateBetween(budget.startDate, budget.endDate, new Date()));

    for (const budget of currentBudgets) {
      if (budget.accountBalanceSource === AccountBalanceSrouce.Current) {
        await budget.update(budget => {
          budget.balance = internalAccount.balanceCurrent;
        });
      } else if (budget.accountBalanceSource === AccountBalanceSrouce.Available) {
        await budget.update(budget => {
          budget.balance = internalAccount.balanceAvailable ?? 0;
        });
      } else {
        await budget.update(budget => {
          budget.balance = 0;
        });
      }
    }
  }
}
