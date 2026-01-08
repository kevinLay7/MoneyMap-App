import { isDateBetween } from '@/helpers/dayjs';
import Account from '@/model/models/account';
import Budget, { BudgetStatus } from '@/model/models/budget';
import BudgetItem from '@/model/models/budget-item';
import Transaction from '@/model/models/transaction';
import { BudgetItemType, BalanceTrackingMode, BudgetItemStatus } from '@/model/models/budget-item-enums';
import { AccountBalanceSrouce, BudgetBalanceSource, BudgetDuration } from '@/types/budget';
import { TransactionService } from './transaction-service';
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

export interface CreateBudgetItemDto {
  budgetId: string;
  name: string;
  amount: number;
  type: BudgetItemType;
  trackingMode?: BalanceTrackingMode;
  fundingAccountId?: string;
  merchantId?: string;
  categoryId?: string;
  dueDate?: Date;
  isAutoPay?: boolean;
  excludeFromBalance?: boolean;
}

export interface UpdateBudgetItemDto {
  budgetItemId: string;
  budgetId?: string;
  name?: string;
  amount?: number;
  trackingMode?: BalanceTrackingMode | null;
  fundingAccountId?: string | null;
  merchantId?: string | null;
  categoryId?: string | null;
  dueDate?: Date | null;
  isAutoPay?: boolean;
  excludeFromBalance?: boolean;
}

export class BudgetService {
  constructor(private readonly database: Database) {}

  /**
   * Creates a new budget.
   * @param createBudgetDto - The data to create a new budget.
   * @returns The created budget.
   */
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
        budget.status = BudgetStatus.Active;
      });

      if (insertedBudget.balanceSource === BudgetBalanceSource.Account) {
        await this.updateBudgetBalancesForAccount(insertedBudget.accountId!);
      }

      return insertedBudget;
    });
  }

  /**
   * Creates a new budget item.
   * @param dto - The data to create a new budget item.
   * @returns The created budget item.
   */
  async createBudgetItem(dto: CreateBudgetItemDto): Promise<BudgetItem> {
    const budget = await this.database.get<Budget>('budgets').find(dto.budgetId);
    if (!budget) {
      throw new Error('Budget not found');
    }
    const newBudgetItem = await this.database.write(async () => {
      const budgetItem = await this.database.get<BudgetItem>('budget_items').create(item => {
        item.budgetId = dto.budgetId;
        item.name = dto.name;
        item.amount = dto.amount;
        item.type = dto.type;
        item.status = BudgetItemStatus.ACTIVE;
        if (dto.trackingMode) {
          item.trackingMode = dto.trackingMode;
        }
        if (dto.fundingAccountId) {
          item.fundingAccountId = dto.fundingAccountId;
        }
        if (dto.merchantId) {
          item.merchantId = dto.merchantId;
        }
        if (dto.categoryId) {
          item.categoryId = dto.categoryId;
        }
        if (dto.dueDate) {
          item.dueDate = dto.dueDate;
        }
        if (dto.isAutoPay !== undefined) {
          item.isAutoPay = dto.isAutoPay;
        }
        if (dto.excludeFromBalance !== undefined) {
          item.excludeFromBalance = dto.excludeFromBalance;
        } else if (dto.type === BudgetItemType.BalanceTracking) {
          item.excludeFromBalance = true;
        }
      });

      return budgetItem;
    });

    // if the type is category, we need to find any transactions that are linked to this budget item and update the category id
    // Find transactions that should be linked to this budget item
    if (dto.type === BudgetItemType.Category) {
      const transactionService = new TransactionService(this.database);
      const transactionsToLink = await transactionService.findTransactionsForCategory(
        dto.categoryId!,
        budget.startDate,
        budget.endDate
      );

      for (const transaction of transactionsToLink) {
        await transactionService.linkTransactionToBudgetItem(transaction, newBudgetItem);
      }
    }

    return newBudgetItem;
  }

  /**
   * Deletes a budget item and unlinks any associated transactions.
   * @param budgetItemId - The id of the budget item to delete.
   */
  async deleteBudgetItem(budgetItemId: string): Promise<void> {
    await this.database.write(async () => {
      const budgetItem = await this.database.get<BudgetItem>('budget_items').find(budgetItemId);

      // Unlink all transactions associated with this budget item
      const linkedTransactions = await this.database
        .get<Transaction>('transactions')
        .query(Q.where('budget_item_id', budgetItemId))
        .fetch();

      for (const transaction of linkedTransactions) {
        await transaction.update(t => {
          t.budgetItemId = null;
        });
      }

      // Delete the budget item
      await budgetItem.markAsDeleted();
    });
  }

  /**
   * Updates a budget item.
   * @param dto - The data to update a budget item.
   * @returns The updated budget item.
   */
  async updateBudgetItem(dto: UpdateBudgetItemDto): Promise<BudgetItem> {
    return await this.database.write(async () => {
      const budgetItem = await this.database.get<BudgetItem>('budget_items').find(dto.budgetItemId);
      await budgetItem.update(item => {
        if (dto.budgetId) {
          item.budgetId = dto.budgetId;
        }
        if (dto.name !== undefined) {
          item.name = dto.name;
        }
        if (dto.amount !== undefined) {
          item.amount = dto.amount;
        }
        if (dto.trackingMode !== undefined) {
          item.trackingMode = dto.trackingMode ?? null;
        }
        if ('fundingAccountId' in dto) {
          item.fundingAccountId = dto.fundingAccountId ?? null;
        }
        if ('merchantId' in dto) {
          item.merchantId = dto.merchantId ?? null;
        }
        if ('categoryId' in dto) {
          item.categoryId = dto.categoryId ?? null;
        }
        if ('dueDate' in dto) {
          item.dueDate = dto.dueDate ?? null;
        }
        if (dto.isAutoPay !== undefined) {
          item.isAutoPay = dto.isAutoPay;
        }
        if (dto.excludeFromBalance !== undefined) {
          item.excludeFromBalance = dto.excludeFromBalance;
        }
      });

      return budgetItem;
    });
  }

  /**
   * Deletes a budget and all its associated budget items.
   * @param budgetId - The id of the budget to delete.
   */
  async deleteBudget(budgetId: string) {
    await this.database.write(async () => {
      const budget = await this.database.get<Budget>('budgets').find(budgetId);
      if (budget) {
        await budget.markAsDeleted();
      }

      const budgetItems = await this.database
        .get<BudgetItem>('budget_items')
        .query(Q.where('budget_id', budgetId))
        .fetch();
      for (const budgetItem of budgetItems) {
        // Unlink transactions before deleting budget item
        const linkedTransactions = await this.database
          .get<Transaction>('transactions')
          .query(Q.where('budget_item_id', budgetItem.id))
          .fetch();

        for (const transaction of linkedTransactions) {
          await transaction.update(t => {
            t.budgetItemId = null;
          });
        }

        await budgetItem.markAsDeleted();
      }
    });
  }

  /**
   * Gets the latest budget.
   * @returns The latest budget.
   */
  async getLatestBudget(): Promise<Budget | null> {
    const latestBudget = await this.database
      .get<Budget>('budgets')
      .query(Q.sortBy('created_at', Q.desc), Q.take(1))
      .fetch();

    return latestBudget?.[0] ?? null;
  }

  /**
   * Finds a budget that contains the given date within its date range.
   * @param date - The date to search for.
   * @returns The budget that contains the date, or null if none found.
   */
  async findBudgetByDate(date: Date): Promise<Budget | null> {
    const allBudgets = await this.database.get<Budget>('budgets').query().fetch();

    for (const budget of allBudgets) {
      if (isDateBetween(date, budget.startDate, budget.endDate)) {
        return budget;
      }
    }

    return null;
  }

  /**
   * Gets the status of a budget.
   * @param budget - The budget to get the status for.
   * @returns The status of the budget.
   */
  private getBudgetStatus(budget: Budget): BudgetStatus {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endDate = new Date(budget.endDate);
    endDate.setHours(0, 0, 0, 0);
    return endDate < today ? BudgetStatus.Completed : BudgetStatus.Active;
  }

  /**
   * Completes any budget items for budgets whose end date has passed.
   */
  async completeExpiredBudgetsAndItems(): Promise<void> {
    const budgets = await this.database.get<Budget>('budgets').query().fetch();
    if (budgets.length === 0) {
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const expiredBudgets = budgets.filter(budget => {
      const endDate = new Date(budget.endDate);
      endDate.setHours(0, 0, 0, 0);
      return endDate < today;
    });

    if (expiredBudgets.length === 0) {
      return;
    }

    await this.database.write(async () => {
      for (const budget of expiredBudgets) {
        if (budget.status !== BudgetStatus.Completed) {
          await budget.update(record => {
            record.status = BudgetStatus.Completed;
          });
        }

        const budgetItems = await budget.budgetItems.fetch();
        for (const item of budgetItems) {
          if (item.status !== BudgetItemStatus.COMPLETED && item.status !== BudgetItemStatus.CANCELED) {
            await item.update(record => {
              record.status = BudgetItemStatus.COMPLETED;
            });
          }
        }
      }
    });
  }

  /**
   * Updates the balance of a budget.
   * @param budgetId - The id of the budget to update.
   * @param balance - The new balance value.
   */
  async updateBudgetBalance(budgetId: string, balance: number) {
    await this.database.write(async () => {
      const budget = await this.database.get<Budget>('budgets').find(budgetId);
      await budget.update(budget => {
        budget.balance = balance;
      });
    });
  }

  /**
   * Updates the status of a budget item.
   * @param budgetItemId - The id of the budget item to update.
   * @param status - The new status value.
   */
  async updateBudgetItemStatus(budgetItemId: string, status: BudgetItemStatus) {
    await this.database.write(async () => {
      const budgetItem = await this.database.get<BudgetItem>('budget_items').find(budgetItemId);
      await budgetItem.update(item => {
        item.status = status;
      });
    });
  }

  /**
   * Updates the balances for all budgets associated with an account.
   * @param account - The account to update the balances for.
   */
  async updateBudgetBalancesForAccount(account: Account | string) {
    const accountId = typeof account === 'string' ? account : account.accountId;
    if (!accountId) {
      return;
    }
    let internalAccount: Account | null = null;
    if (typeof account === 'string') {
      internalAccount = await this.database.get<Account>('accounts').find(accountId);
    } else {
      internalAccount = account;
    }

    const budgets: Budget[] = await this.database
      .get<Budget>('budgets')
      .query(
        Q.where('account_id', internalAccount?.id ?? ''),
        Q.where('balance_source', BudgetBalanceSource.Account),
        Q.where('status', BudgetStatus.Active)
      )
      .fetch();

    const currentBudgets = budgets.filter(budget => isDateBetween(new Date(), budget.startDate, budget.endDate));

    for (const budget of currentBudgets) {
      if (budget.accountBalanceSource === AccountBalanceSrouce.Current) {
        await budget.update(budget => {
          budget.status = this.getBudgetStatus(budget);
          budget.balance = internalAccount?.balanceCurrent ?? 0;
        });
      } else if (budget.accountBalanceSource === AccountBalanceSrouce.Available) {
        await budget.update(budget => {
          budget.status = this.getBudgetStatus(budget);
          budget.balance = internalAccount?.balanceAvailable ?? 0;
        });
      } else {
        await budget.update(budget => {
          budget.status = this.getBudgetStatus(budget);
          budget.balance = 0;
        });
      }
    }
  }
}
