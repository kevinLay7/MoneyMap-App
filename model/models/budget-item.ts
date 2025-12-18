import { Model } from '@nozbe/watermelondb';
import { date, readonly, field, relation } from '@nozbe/watermelondb/decorators';
import Budget from './budget';

export enum BudgetItemType {
  Income = 'income',
  Expense = 'expense',
  Transfer = 'transfer',
  Recurring = 'recurring',
}

export default class BudgetItem extends Model {
  static table = 'budget_items';
  static associations = {
    budgets: { type: 'belongs_to', key: 'budget_id' },
  } as const;

  @field('budget_id') budgetId!: string;
  /**
   * Used to track which account the budget item is funded from.
   */
  @field('funding_account_id') fundingAccountId?: string | null;

  @field('name') name!: string;
  @field('amount') amount!: number;
  @field('type') type!: BudgetItemType;

  @readonly
  @date('created_at')
  createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;

  @relation('budgets', 'budget_id') budget!: Budget;
}
