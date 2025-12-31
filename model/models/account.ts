import { Model } from '@nozbe/watermelondb';
import { field, relation, children, readonly, date, lazy } from '@nozbe/watermelondb/decorators';
import { catchError, map, shareReplay } from 'rxjs';
import { of } from '@nozbe/watermelondb/utils/rx';
import Item from './item';
import Transaction from './transaction';

/**
 * Computed state emitted by Account.computedState$
 * Provides derived account data that updates reactively
 */
export interface AccountState {
  /** Primary display balance (available if exists, otherwise current) */
  displayBalance: number;
  /** Current balance from the account */
  currentBalance: number;
  /** Available balance from the account */
  availableBalance: number | undefined;
  /** Transactions that are still pending */
  pendingTransactions: Transaction[];
  /** Count of pending transactions */
  pendingCount: number;
  /** Most recent 10 transactions */
  recentTransactions: Transaction[];
  /** Total transaction count */
  totalTransactionCount: number;
  /** Warning flag for low balance */
  hasLowBalance: boolean;
}

export default class Account extends Model {
  static table = 'accounts';
  static associations = {
    items: { type: 'belongs_to', key: 'item_id' },
    transactions: { type: 'has_many', foreignKey: 'account_id' },
  } as const;

  @field('account_id') accountId!: string;
  @field('item_id') itemId!: string;
  @field('name') name!: string;
  @field('official_name') officialName?: string;
  @field('type') type!: string;
  @field('subtype') subtype!: string;
  @field('mask') mask?: string;
  @field('balance_current') balanceCurrent!: number;
  @field('balance_available') balanceAvailable?: number;
  @field('iso_currency_code') isoCurrencyCode?: string;
  @field('unofficial_currency_code') unofficialCurrencyCode?: string;

  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;

  @relation('items', 'item_id') item!: Item;
  @children('transactions') transactions!: Transaction[];

  /**
   * Computed observable that emits AccountState whenever
   * the account or its transactions change.
   *
   * Usage: const accountState = useComputedState(account.computedState$)
   */
  @lazy computedState$ = this.transactions.observe().pipe(
    catchError(() => of([])),
    map((transactions): AccountState => {
      const pending = transactions.filter(t => t.pending);
      const sorted = [...transactions].sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        return dateB - dateA;
      });
      const recent = sorted.slice(0, 10);

      return {
        displayBalance: this.balanceAvailable ?? this.balanceCurrent,
        currentBalance: this.balanceCurrent,
        availableBalance: this.balanceAvailable,
        pendingTransactions: pending,
        pendingCount: pending.length,
        recentTransactions: recent,
        totalTransactionCount: transactions.length,
        hasLowBalance: this.balanceCurrent < 100,
      };
    }),
    shareReplay(1)
  );
}
