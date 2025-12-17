import { AccountBalanceSrouce, BudgetBalanceSource, BudgetDuration } from '@/types/budget';
import { Model } from '@nozbe/watermelondb';
import { children, date, field, readonly, relation } from '@nozbe/watermelondb/decorators';
import Account from './account';
import BudgetItem from './budget-item';

export default class Budget extends Model {
  static table = 'budgets';

  @date('start_date') startDate!: Date;
  @date('end_date') endDate!: Date;
  @field('balance') balance!: number;
  @field('total_remaining') totalRemaining!: number;
  @field('total_spent') totalSpent!: number;
  @field('balance_source') balanceSource!: BudgetBalanceSource;
  @field('account_balance_source') accountBalanceSource!: AccountBalanceSrouce;
  @field('account_id') accountId!: string | null;
  @field('duration') duration!: BudgetDuration;

  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;

  @relation('accounts', 'account_id') account!: Account | null;
  @children('budget_items') budgetItems!: BudgetItem[];
}
