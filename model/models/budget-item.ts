import { Model, Q } from '@nozbe/watermelondb';
import { date, readonly, field, lazy, relation } from '@nozbe/watermelondb/decorators';
import { of } from '@nozbe/watermelondb/utils/rx';
import { catchError, combineLatest, map, shareReplay, switchMap } from 'rxjs';
import Budget from './budget';
import Category from './category';
import Merchant from './merchant';
import Transaction from './transaction';
import dayjs from '@/helpers/dayjs';

export enum BudgetItemType {
  Income = 'income',
  Expense = 'expense',
  BalanceTracking = 'balance_tracking',
  Category = 'category',
}

export enum BudgetItemStatus {
  ACTIVE = 'ACTIVE',
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  CANCELED = 'CANCELED',
}

export enum BalanceTrackingMode {
  Delta = 'delta',
  Absolute = 'absolute',
}

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
  categorySpending: number;
  /** For category items: percentage of budget used (0-100, can exceed 100) */
  categorySpendingPercentage: number;
  /** For category items: true if spending exceeds budget amount */
  isOverBudget: boolean;
}

export default class BudgetItem extends Model {
  static table = 'budget_items';
  static associations = {
    budgets: { type: 'belongs_to', key: 'budget_id' },
    merchants: { type: 'belongs_to', key: 'merchant_id' },
    categories: { type: 'belongs_to', key: 'category_id' },
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

  /**
   * Computed observable that emits BudgetItemState whenever the budget item
   * or its related records (budget, merchant, category) change.
   *
   * Usage: const itemState = useComputedState(budgetItem.computedState$)
   */
  @lazy computedState$ = combineLatest({
    budget: this.budget.observe().pipe(catchError(() => of(null))),
    merchant: this.merchant.observe().pipe(catchError(() => of(null))),
    category: this.category.observe().pipe(catchError(() => of(null))),
  }).pipe(
    switchMap(({ budget, merchant, category }) => {
      // For category items, observe transactions within budget period
      if (this.type === BudgetItemType.Category && this.categoryId && budget) {
        const startDate = dayjs(budget.startDate).startOf('day').toISOString();
        const endDate = dayjs(budget.endDate).endOf('day').toISOString();

        const transactionsQuery = this.database
          .get<Transaction>('transactions')
          .query(
            Q.where('category_id', this.categoryId),
            Q.where('date', Q.gte(startDate)),
            Q.where('date', Q.lte(endDate)),
            Q.where('pending', false)
          );

        return transactionsQuery.observe().pipe(
          map(transactions => {
            const spending = transactions.reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
            return { budget, merchant, category, spending };
          }),
          catchError(() => of({ budget, merchant, category, spending: 0 }))
        );
      }

      return of({ budget, merchant, category, spending: 0 });
    }),
    map(({ budget, merchant, category, spending }): BudgetItemState => {
      const now = new Date();
      const dueDate = this.dueDate;
      const daysUntilDue = dueDate ? Math.floor((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;
      const isOverdue = dueDate ? daysUntilDue !== null && daysUntilDue < 0 : false;

      const categorySpending = this.type === BudgetItemType.Category ? spending : 0;
      const categorySpendingPercentage =
        this.type === BudgetItemType.Category && this.amount > 0 ? (categorySpending / this.amount) * 100 : 0;
      const isOverBudget = this.type === BudgetItemType.Category && categorySpending > this.amount;

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
        categorySpending,
        categorySpendingPercentage,
        isOverBudget,
      };
    }),
    shareReplay(1)
  );
}
