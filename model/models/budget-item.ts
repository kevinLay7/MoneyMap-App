import { Model, Q, Query } from '@nozbe/watermelondb';
import { date, readonly, field, lazy, relation, children } from '@nozbe/watermelondb/decorators';
import { of } from '@nozbe/watermelondb/utils/rx';
import { catchError, combineLatest, map, Observable, shareReplay, switchMap } from 'rxjs';
import Budget from './budget';
import Category from './category';
import Merchant from './merchant';
import Account from './account';
import Transaction from './transaction';
import BudgetItemNotification from './budget-item-notification';
import dayjs from '@/helpers/dayjs';
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
export {
  BudgetItemType,
  BudgetItemStatus,
  BalanceTrackingMode,
  BudgetItemDisplayStatus,
  BudgetItemTag,
} from './budget-item-enums';

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
  /** Balance tracking metrics (null when not applicable) */
  balanceTrackingStartingBalance: number | null;
  balanceTrackingCurrentBalance: number | null;
  balanceTrackingCredits: number | null;
  balanceTrackingAmountSpent: number | null;
  balanceTrackingNetChange: number | null;

  remaining: number;
  /** Display status for UI (income, paid, overdue, due today, auto pay, upcoming) */
  displayStatus: BudgetItemDisplayStatus;
  /** Status color for UI display (dot color, border color, etc.) */
  statusColor: string;
  /** Tags for filtering and categorization */
  tags: BudgetItemTag[];
}

export default class BudgetItem extends Model {
  static readonly table = 'budget_items';
  static readonly associations = {
    budgets: { type: 'belongs_to', key: 'budget_id' },
    merchants: { type: 'belongs_to', key: 'merchant_id' },
    categories: { type: 'belongs_to', key: 'category_id' },
    transactions: { type: 'has_many', foreignKey: 'budget_item_id' },
    budget_item_notifications: { type: 'has_many', foreignKey: 'budget_item_id' },
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
  @children('budget_item_notifications') notificationRecords!: Query<BudgetItemNotification>;

  /**
   * Computed observable that emits BudgetItemState whenever the budget item
   * or its related records (budget, merchant, category) change.
   *
   * Usage: const itemState = useComputedState(budgetItem.computedState$)
   */
  @lazy computedState$: Observable<BudgetItemState> = combineLatest({
    item: this.observe().pipe(catchError(() => of(this))),
    budget: this.budget.observe().pipe(catchError(() => of(null))),
    merchant: this.merchant.observe().pipe(catchError(() => of(null))),
    category: this.category.observe().pipe(catchError(() => of(null))),
    linkedTransactions: this.linkedTransactions.observe().pipe(catchError(() => of([]))),
  }).pipe(
    switchMap(({ item, budget, merchant, category, linkedTransactions }) => {
      const categorySpending$ =
        item.type === BudgetItemType.Category && item.categoryId && budget
          ? this.database
              .get<Transaction>('transactions')
              .query(Q.where('budget_item_id', this.id))
              .observe()
              .pipe(
                map(transactions => transactions.reduce((sum, tx) => sum + Math.abs(tx.amount), 0)),
                catchError(() => of(0))
              )
          : of(0);

      const fundingAccount$ = item.fundingAccountId
        ? this.database
            .get<Account>('accounts')
            .findAndObserve(item.fundingAccountId)
            .pipe(catchError(() => of(null)))
        : of(null);

      return combineLatest({
        item: of(item),
        budget: of(budget),
        merchant: of(merchant),
        category: of(category),
        linkedTransactions: of(linkedTransactions),
        categorySpending: categorySpending$,
        fundingAccount: fundingAccount$,
      }).pipe(
        switchMap(({ item, budget, merchant, category, linkedTransactions, categorySpending, fundingAccount }) => {
          const accountTransactions$ =
            item.type === BudgetItemType.BalanceTracking && fundingAccount && budget
              ? this.database
                  .get<Transaction>('transactions')
                  .query(
                    Q.where('account_id', fundingAccount.accountId),
                    Q.where('date', Q.gte(dayjs(budget.startDate).startOf('day').toISOString())),
                    Q.where('date', Q.lte(dayjs(budget.endDate).endOf('day').toISOString()))
                  )
                  .observe()
                  .pipe(catchError(() => of([])))
              : of([]);

          return combineLatest({
            item: of(item),
            budget: of(budget),
            merchant: of(merchant),
            category: of(category),
            linkedTransactions: of(linkedTransactions),
            categorySpending: of(categorySpending),
            fundingAccount: of(fundingAccount),
            accountTransactions: accountTransactions$,
          });
        })
      );
    }),
    map(
      ({
        item,
        budget,
        merchant,
        category,
        linkedTransactions,
        categorySpending,
        fundingAccount,
        accountTransactions,
      }): BudgetItemState => {
        const dueDate = item.dueDate;
      const daysUntilDue = dueDate ? Math.round(dayjs(dueDate).diff(dayjs(), 'day', true)) : null;
      const isOverdue = dueDate ? daysUntilDue !== null && daysUntilDue < 0 : false;

      const totalSpending =
        item.type === BudgetItemType.Category
          ? categorySpending
          : linkedTransactions.reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
      const spendingPercentage = item.amount > 0 ? (totalSpending / item.amount) * 100 : 0;
      const isOverBudget = totalSpending > item.amount;

      let balanceTrackingCredits: number | null = null;
      let balanceTrackingAmountSpent: number | null = null;
      let balanceTrackingNetChange: number | null = null;
      let balanceTrackingCurrentBalance: number | null = null;
      let balanceTrackingStartingBalance: number | null = null;

      if (item.type === BudgetItemType.BalanceTracking && fundingAccount) {
        // In Plaid: positive = charges/spending, negative = payments/credits
        // For credit cards: positive increases balance (new charges), negative decreases balance (payments)
        balanceTrackingAmountSpent = accountTransactions.reduce(
          (sum, tx) => (tx.amount > 0 ? sum + tx.amount : sum),
          0
        );
        balanceTrackingCredits = accountTransactions.reduce(
          (sum, tx) => (tx.amount < 0 ? sum + Math.abs(tx.amount) : sum),
          0
        );
        balanceTrackingNetChange = balanceTrackingAmountSpent - balanceTrackingCredits;
        balanceTrackingCurrentBalance = fundingAccount.balanceCurrent;
        balanceTrackingStartingBalance = balanceTrackingCurrentBalance - balanceTrackingNetChange;
      }

      // Compute display status using centralized logic
      const displayStatus = determineBudgetItemDisplayStatus(
        item.type,
        item.status,
        isOverdue,
        dueDate || undefined,
        item.isAutoPay
      );

      // Compute status color using centralized logic
      const statusColor = getBudgetItemStatusColor(displayStatus);

      // Compute tags using centralized logic
      const tags = determineBudgetItemTags(item.type, item.status, isOverdue, dueDate || undefined, item.isAutoPay);

      return {
        itemId: item.id,
        budgetId: item.budgetId,
        fundingAccountId: item.fundingAccountId ?? null,
        merchantId: item.merchantId ?? null,
        categoryId: item.categoryId ?? null,
        name: item.name,
        amount: item.amount,
        type: item.type,
        status: item.status,
        trackingMode: item.trackingMode ?? null,
        dueDate: item.dueDate ?? null,
        isAutoPay: item.isAutoPay ?? false,
        excludeFromBalance: item.excludeFromBalance ?? false,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        budget,
        merchant,
        category,
        isOverdue,
        daysUntilDue,
        isExpense: item.type === BudgetItemType.Expense,
        isIncome: item.type === BudgetItemType.Income,
        isBalanceTracking: item.type === BudgetItemType.BalanceTracking,
        isCategory: item.type === BudgetItemType.Category,
        isCompleted: item.status === BudgetItemStatus.COMPLETED,
        spending: totalSpending,
        spendingPercentage,
        isOverBudget,
        linkedTransactions: linkedTransactions || [],
        balanceTrackingStartingBalance,
        balanceTrackingCurrentBalance,
        balanceTrackingCredits,
        balanceTrackingAmountSpent,
        balanceTrackingNetChange,
        remaining: item.amount - Math.min(totalSpending, item.amount),
        displayStatus,
        statusColor,
        tags,
      };
      }
    ),
    shareReplay(1)
  );
}
