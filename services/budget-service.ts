import { isDateBetween } from '@/helpers/dayjs';
import Account from '@/model/models/account';
import Budget from '@/model/models/budget';
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

      return insertedBudget;
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
  async updateBudgetBalancesForAccount(account: Account) {
    const budgets = await this.database
      .get<Budget>('budgets')
      .query(Q.where('account_id', account.id), Q.where('balance_source', BudgetBalanceSource.Account))
      .fetch();

    const currentBudgets = budgets.filter(budget => isDateBetween(budget.startDate, budget.endDate, new Date()));

    for (const budget of currentBudgets) {
      if (budget.accountBalanceSource === AccountBalanceSrouce.Current) {
        await budget.update(budget => {
          budget.balance = account.balanceCurrent;
        });
      } else if (budget.accountBalanceSource === AccountBalanceSrouce.Available) {
        await budget.update(budget => {
          budget.balance = account.balanceAvailable ?? 0;
        });
      } else {
        await budget.update(budget => {
          budget.balance = 0;
        });
      }
    }
  }
}
