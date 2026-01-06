import { AccountBalanceSrouce, BudgetBalanceSource, BudgetDuration } from '@/types/budget';
import { Model, Query } from '@nozbe/watermelondb';
import { children, date, field, lazy, readonly, relation } from '@nozbe/watermelondb/decorators';
import { of } from '@nozbe/watermelondb/utils/rx';
import { catchError, combineLatest, map, shareReplay, switchMap } from 'rxjs';
import dayjs from '@/helpers/dayjs';
import Account from './account';
import BudgetItem, { BudgetItemType, BudgetItemState, BudgetItemStatus } from './budget-item';

export enum BudgetStatus {
  Active = 'active',
  Completed = 'completed',
}

export enum BudgetComputedStatus {
  Upcoming = 'upcoming',
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
  /** Derived status based on the budget date range */
  computedStatus: BudgetComputedStatus;
  /** Start date of the budget */
  startDate: Date;
  /** End date of the budget */
  endDate: Date;
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
  /** All expense-type budget items (computed states) */
  expenseItems: BudgetItemState[];
  /** Expense items funded from the linked account only (computed states) */
  accountOnlyExpenseItems: BudgetItemState[];
  /** All budget items (computed states) */
  allItems: BudgetItemState[];
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

  @relation('accounts', 'account_id') account!: Query<Account>;
  @children('budget_items') budgetItems!: Query<BudgetItem>;

  /**
   * Computed observable that emits BudgetState whenever the budget,
   * its linked account, or budget items change.
   *
   * Usage: const budgetState = useComputedState(budget.computedState$)
   */
  @lazy computedState$ = combineLatest({
    account: this.account.observe().pipe(catchError(() => of(null))),
    items: this.budgetItems.observe().pipe(
      switchMap(items => {
        if (items.length === 0) {
          return of([]);
        }
        // Get computedState$ for each budget item and combine them
        return combineLatest(items.map(item => item.computedState$));
      }),
      catchError(() => of([]))
    ),
  }).pipe(
    map(({ account, items }): BudgetState => {
      const expenseItems = items.filter(
        i =>
          [BudgetItemType.Expense, BudgetItemType.Category, BudgetItemType.BalanceTracking].includes(i.type) &&
          i.status !== BudgetItemStatus.COMPLETED
      );
      const accountOnlyExpenseItems = expenseItems.filter(i => i.fundingAccountId === this.accountId);
      const totalExpenses = expenseItems.reduce((sum, i) => sum + i.remaining, 0);
      const totalAccountOnlyExpenses = accountOnlyExpenseItems.reduce((sum, i) => sum + i.remaining, 0);

      // account is an array from Query.observe(), get first item or null
      const accountRecord = Array.isArray(account) ? (account[0] ?? null) : account;
      const effectiveBalance = this.getEffectiveBalance(accountRecord);

      return {
        budgetId: this.id,
        startDate: this.startDate,
        endDate: this.endDate,
        balance: this.balance,
        computedStatus: this.getComputedStatus(),
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
        account: accountRecord,
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

  /**
   * Computes the status based on the budget date range.
   */
  private getComputedStatus(): BudgetComputedStatus {
    const today = dayjs().startOf('day');
    const startDate = dayjs(this.startDate).startOf('day');
    const endDate = dayjs(this.endDate).startOf('day');

    if (today.isBefore(startDate)) {
      return BudgetComputedStatus.Upcoming;
    }

    if (today.isAfter(endDate)) {
      return BudgetComputedStatus.Completed;
    }

    return BudgetComputedStatus.Active;
  }
}
