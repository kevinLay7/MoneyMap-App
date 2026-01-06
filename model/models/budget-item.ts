import { Model, Q, Query } from '@nozbe/watermelondb';
import { date, readonly, field, lazy, relation, children } from '@nozbe/watermelondb/decorators';
import { of } from '@nozbe/watermelondb/utils/rx';
import { catchError, combineLatest, map, shareReplay, switchMap } from 'rxjs';
import Budget from './budget';
import Category from './category';
import Merchant from './merchant';
import Transaction from './transaction';
import dayjs, { isSameDate } from '@/helpers/dayjs';
import {
  getBudgetItemStatusColor,
  determineBudgetItemDisplayStatus,
  determineBudgetItemTags,
} from '@/utils/budget-item-colors';

import {
  BudgetItemType,
  BudgetItemStatus,
  BalanceTrackingMode,
  BudgetItemDisplayStatus,
  BudgetItemTag,
} from './budget-item-enums';

// Re-export enums for convenience
export { BudgetItemType, BudgetItemStatus, BalanceTrackingMode, BudgetItemDisplayStatus, BudgetItemTag };

/**
 * Computed state emitted by BudgetItem.computedState$
 */
export interface BudgetItemState {
  /** Budget item record ID */
  itemId: string;
  /** All basic fields from the budget item */
  budgetId: string;
  fundingAccountId: string | null;
  merchantId: string | null;
  categoryId: string | null;
  name: string;
  amount: number;
  type: BudgetItemType;
  status: BudgetItemStatus;
  trackingMode: BalanceTrackingMode | null;
  dueDate: Date | null;
  isAutoPay: boolean;
  excludeFromBalance: boolean;
  createdAt: Date;
  updatedAt: Date;
  /** Related budget (observable) */
  budget: Budget | null;
  /** Related merchant (observable) */
  merchant: Merchant | null;
  /** Related category (observable) */
  category: Category | null;
  /** True if dueDate exists and is in the past */
  isOverdue: boolean;
  /** Days until due date (null if no due date, negative if overdue) */
  daysUntilDue: number | null;
  /** Convenience flags for item type */
  isExpense: boolean;
  isIncome: boolean;
  isBalanceTracking: boolean;
  isCategory: boolean;
  /** True if item is completed */
  isCompleted: boolean;
  /** For category items: total spending within budget period */
  spending: number;
  /** For category items: percentage of budget used (0-100, can exceed 100) */
  spendingPercentage: number;
  /** For category items: true if spending exceeds budget amount */
  isOverBudget: boolean;
  /** Linked transactions for this budget item */
  linkedTransactions: Transaction[];

  remaining: number;
  /** Display status for UI (income, paid, overdue, due today, auto pay, upcoming) */
  displayStatus: BudgetItemDisplayStatus;
  /** Status color for UI display (dot color, border color, etc.) */
  statusColor: string;
  /** Tags for filtering and categorization */
  tags: BudgetItemTag[];
}

export default class BudgetItem extends Model {
  static table = 'budget_items';
  static associations = {
    budgets: { type: 'belongs_to', key: 'budget_id' },
    merchants: { type: 'belongs_to', key: 'merchant_id' },
    categories: { type: 'belongs_to', key: 'category_id' },
    transactions: { type: 'has_many', foreignKey: 'budget_item_id' },
  } as const;

  @field('budget_id') budgetId!: string;
  /**
   * Used to track which account the budget item is funded from.
   */
  @field('funding_account_id') fundingAccountId?: string | null;
  @field('merchant_id') merchantId?: string | null;
  @field('category_id') categoryId?: string | null;

  @field('name') name!: string;
  @field('amount') amount!: number;
  @field('type') type!: BudgetItemType;
  @field('status') status!: BudgetItemStatus;
  /**
   * Only used for BalanceTracking type.
   * Delta: Track change in balance since budget period start.
   * Absolute: Track current balance against budget.
   */
  @field('tracking_mode') trackingMode?: BalanceTrackingMode | null;

  /**
   * Due date for Expense type items (bills).
   */
  @date('due_date') dueDate?: Date | null;

  /**
   * Whether this expense is set to auto-pay.
   */
  @field('is_auto_pay') isAutoPay?: boolean;

  /**
   * For BalanceTracking: exclude this balance from budget calculations.
   */
  @field('exclude_from_balance') excludeFromBalance?: boolean;

  @readonly
  @date('created_at')
  createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;

  @relation('budgets', 'budget_id') budget!: Budget;
  @relation('merchants', 'merchant_id') merchant!: Merchant;
  @relation('categories', 'category_id') category!: Category;
  @children('transactions') linkedTransactions!: Query<Transaction>;

  /**
   * Computed observable that emits BudgetItemState whenever the budget item
   * or its related records (budget, merchant, category) change.
   *
   * Usage: const itemState = useComputedState(budgetItem.computedState$)
   */
  @lazy computedState$ = combineLatest({
    item: this.observe().pipe(catchError(() => of(this))),
    budget: this.budget.observe().pipe(catchError(() => of(null))),
    merchant: this.merchant.observe().pipe(catchError(() => of(null))),
    category: this.category.observe().pipe(catchError(() => of(null))),
    linkedTransactions: this.linkedTransactions.observe().pipe(catchError(() => of([]))),
  }).pipe(
    switchMap(({ budget, merchant, category, linkedTransactions }) => {
      // For category items, observe transactions within budget period
      if (this.type === BudgetItemType.Category && this.categoryId && budget) {
        const transactionsQuery = this.database
          .get<Transaction>('transactions')
          .query(Q.where('budget_item_id', this.id));

        return transactionsQuery.observe().pipe(
          map(transactions => {
            const spending = transactions.reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
            return { budget, merchant, category, spending, linkedTransactions };
          }),
          catchError(() => {
            console.error('Error fetching linked transactions');
            return of({ budget, merchant, category, spending: 0, linkedTransactions });
          })
        );
      }

      return of({ budget, merchant, category, spending: 0, linkedTransactions });
    }),
    map(({ budget, merchant, category, spending, linkedTransactions }): BudgetItemState => {
      const dueDate = this.dueDate;
      const daysUntilDue = dueDate ? Math.round(dayjs(dueDate).diff(dayjs(), 'day', true)) : null;
      const isOverdue = dueDate ? daysUntilDue !== null && daysUntilDue < 0 : false;

      const totalSpending = linkedTransactions.reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
      const spendingPercentage = (totalSpending / this.amount) * 100;
      const isOverBudget = totalSpending > this.amount;

      // Compute display status using centralized logic
      const displayStatus = determineBudgetItemDisplayStatus(
        this.type,
        this.status,
        isOverdue,
        dueDate || undefined,
        this.isAutoPay
      );

      // Compute status color using centralized logic
      const statusColor = getBudgetItemStatusColor(displayStatus);

      // Compute tags using centralized logic
      const tags = determineBudgetItemTags(this.status, isOverdue, dueDate || undefined, this.isAutoPay);

      return {
        itemId: this.id,
        budgetId: this.budgetId,
        fundingAccountId: this.fundingAccountId ?? null,
        merchantId: this.merchantId ?? null,
        categoryId: this.categoryId ?? null,
        name: this.name,
        amount: this.amount,
        type: this.type,
        status: this.status,
        trackingMode: this.trackingMode ?? null,
        dueDate: this.dueDate ?? null,
        isAutoPay: this.isAutoPay ?? false,
        excludeFromBalance: this.excludeFromBalance ?? false,
        createdAt: this.createdAt,
        updatedAt: this.updatedAt,
        budget,
        merchant,
        category,
        isOverdue,
        daysUntilDue,
        isExpense: this.type === BudgetItemType.Expense,
        isIncome: this.type === BudgetItemType.Income,
        isBalanceTracking: this.type === BudgetItemType.BalanceTracking,
        isCategory: this.type === BudgetItemType.Category,
        isCompleted: this.status === BudgetItemStatus.COMPLETED,
        spending: totalSpending,
        spendingPercentage,
        isOverBudget,
        linkedTransactions: linkedTransactions || [],
        remaining: this.amount - Math.min(totalSpending, this.amount),
        displayStatus,
        statusColor,
        tags,
      };
    }),
    shareReplay(1)
  );
}
