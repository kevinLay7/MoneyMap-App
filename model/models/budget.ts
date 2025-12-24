import { AccountBalanceSrouce, BudgetBalanceSource, BudgetDuration } from '@/types/budget';
import { Model } from '@nozbe/watermelondb';
import { children, date, field, readonly, relation } from '@nozbe/watermelondb/decorators';
import Account from './account';
import BudgetItem, { BudgetItemType } from './budget-item';

export enum BudgetStatus {
  Active = 'active',
  Completed = 'completed',
}

export default class Budget extends Model {
  static table = 'budgets';
  static associations = {
    budget_items: { type: 'has_many', foreignKey: 'budget_id' },
    accounts: { type: 'belongs_to', key: 'account_id' },
  } as const;

  @date('start_date') startDate!: Date;
  @date('end_date') endDate!: Date;

  /**
   * If balanceSource is Manual, this value is entered manually by the user.
   * If balanceSource is Account, this value is the balance of the account via a @action updateBalance.
   */
  @field('balance') balance!: number;

  @field('balance_source') balanceSource!: BudgetBalanceSource;
  @field('account_balance_source') accountBalanceSource!: AccountBalanceSrouce;
  @field('account_id') accountId!: string | null;
  @field('duration') duration!: BudgetDuration;
  @field('status') status!: BudgetStatus;

  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;

  @relation('accounts', 'account_id') account!: Account | null;
  @children('budget_items') budgetItems!: BudgetItem[];
}
