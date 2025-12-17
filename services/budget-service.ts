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

  async getLatestBudget(): Promise<Budget | null> {
    const latestBudget = await this.database
      .get<Budget>('budgets')
      .query(Q.sortBy('created_at', Q.desc), Q.take(1))
      .fetch();

    return latestBudget?.[0] ?? null;
  }
}
