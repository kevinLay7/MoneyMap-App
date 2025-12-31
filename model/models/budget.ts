import { AccountBalanceSrouce, BudgetBalanceSource, BudgetDuration } from '@/types/budget';
import { Model } from '@nozbe/watermelondb';
import { children, date, field, lazy, readonly, relation } from '@nozbe/watermelondb/decorators';
import { of } from '@nozbe/watermelondb/utils/rx';
import { catchError, combineLatest, map, shareReplay } from 'rxjs';
import Account from './account';
import BudgetItem, { BudgetItemType } from './budget-item';

export enum BudgetStatus {
  Active = 'active',
  Completed = 'completed',
}

/**
 * Computed state emitted by Budget.computedState$
 * This replaces BudgetViewModel as the single source of truth for budget calculations
 */
export interface BudgetState {
  /** Budget record ID */
  budgetId: string;
  /** Raw balance from the budget record */
  balance: number;
  /** Balance source type (Manual or Account) */
  balanceSource: BudgetBalanceSource;
  /** Account ID if linked */
  accountId: string | null;
  /** Balance adjusted for account type and balance source */
  effectiveBalance: number;
  /** Sum of all expense items */
  totalExpenses: number;
  /** Sum of expense items funded from the linked account only */
  totalAccountOnlyExpenses: number;
  /** effectiveBalance - totalExpenses */
  remainingSafeToSpend: number;
  /** effectiveBalance - totalAccountOnlyExpenses */
  remainingAccountOnly: number;
  /** True if expenses exceed effective balance */
  isOverBudget: boolean;
  /** All expense-type budget items */
  expenseItems: BudgetItem[];
  /** Expense items funded from the linked account only */
  accountOnlyExpenseItems: BudgetItem[];
  /** All budget items */
  allItems: BudgetItem[];
  /** Linked account (if balance source is Account) */
  account: Account | null;
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

  /**
   * Computed observable that emits BudgetState whenever the budget,
   * its linked account, or budget items change.
   *
   * Usage: const budgetState = useComputedState(budget.computedState$)
   */
  @lazy computedState$ = combineLatest({
    account: this.account.observe().pipe(catchError(() => of(null))),
    items: this.budgetItems.observe().pipe(catchError(() => of([]))),
  }).pipe(
    map(({ account, items }): BudgetState => {
      const expenseItems = items.filter(i => i.type === BudgetItemType.Expense);
      const accountOnlyExpenseItems = expenseItems.filter(i => i.fundingAccountId === this.accountId);
      const totalExpenses = expenseItems.reduce((sum, i) => sum + i.amount, 0);
      const totalAccountOnlyExpenses = accountOnlyExpenseItems.reduce((sum, i) => sum + i.amount, 0);
      const effectiveBalance = this.getEffectiveBalance(account);

      return {
        budgetId: this.id,
        balance: this.balance,
        balanceSource: this.balanceSource,
        accountId: this.accountId,
        effectiveBalance,
        totalExpenses,
        totalAccountOnlyExpenses,
        remainingSafeToSpend: effectiveBalance - totalExpenses,
        remainingAccountOnly: effectiveBalance - totalAccountOnlyExpenses,
        isOverBudget: totalExpenses > effectiveBalance,
        expenseItems,
        accountOnlyExpenseItems,
        allItems: items,
        account,
      };
    }),
    shareReplay(1)
  );

  /**
   * Calculates the effective balance based on balance source configuration
   */
  private getEffectiveBalance(account: Account | null): number {
    if (this.balanceSource === BudgetBalanceSource.Manual) {
      return this.balance;
    }
    if (!account) {
      return this.balance;
    }
    return this.accountBalanceSource === AccountBalanceSrouce.Available
      ? (account.balanceAvailable ?? 0)
      : account.balanceCurrent;
  }
}
