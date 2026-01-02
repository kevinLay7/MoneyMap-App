import Category from '@/model/models/category';
import Transaction from '@/model/models/transaction';
import BudgetItem, { BudgetItemType, BudgetItemStatus } from '@/model/models/budget-item';
import Budget from '@/model/models/budget';
import { Database, Q } from '@nozbe/watermelondb';
import { Observable } from '@nozbe/watermelondb/utils/rx';
import { TransactionDto } from '@/api/gen/data-contracts';
import { TransactionSource } from '@/types/transaction';
import { executeInWriteContext } from '@/helpers/database-helpers';
import dayjs from '@/helpers/dayjs';

export class TransactionService {
  constructor(private readonly database: Database) {}

  async fetchUncategorizedTransactions(): Promise<Transaction[]> {
    const transactions = await this.database.get<Transaction>('transactions').query().fetch();

    const lowConfidenceTransactions = transactions.filter(
      transaction => transaction.personalFinanceCategoryConfidenceLevel === 'LOW'
    );

    // Fetch category relationships for each transaction
    // Collect unique category IDs and fetch them in batch to ensure they're available
    const categoryIds = new Set(
      lowConfidenceTransactions.map(t => t.categoryId).filter((id): id is string => id !== undefined)
    );

    if (categoryIds.size > 0) {
      await this.database
        .get<Category>('categories')
        .query(Q.where('id', Q.oneOf(Array.from(categoryIds))))
        .fetch();
    }

    return lowConfidenceTransactions;
  }

  fetchUncategorizedTransactionsObservable(): Observable<Transaction[]> {
    return this.database.get<Transaction>('transactions').query().observe();
  }

  /**
   * After a transaction has been added to the database, via Plaid sync, this will be called
   * to categorize the transaction.
   *
   * @param transaction - The transaction to categorize.
   * @param category - Optional category to assign directly.
   * @param inWriteContext - If true, assumes we're already in a write context and won't create a new one.
   */
  async categorizeTransaction(
    transaction: Transaction,
    category?: Category,
    inWriteContext: boolean = false
  ): Promise<void> {
    await executeInWriteContext(
      this.database,
      async () => {
        if (category) {
          await transaction.update(t => {
            t.categoryId = category.id;
            t.personalFinanceCategoryConfidenceLevel = 'HIGH';
          });
          // Don't return early - we still need to link to budget items below
        } else {
          const categories = await this.database.get<Category>('categories').query().fetch();

          const primaryCategory = transaction.personalFinanceCategoryPrimary
            ? transaction.personalFinanceCategoryPrimary.toLowerCase()
            : undefined;
          const detailedCategory = transaction.personalFinanceCategoryDetailed
            ? transaction.personalFinanceCategoryDetailed.toLowerCase()
            : undefined;

          let newCategory: Category | undefined;

          if (detailedCategory) {
            console.log('Detailed category found:', detailedCategory);
            newCategory = categories.find(c => c.detailed.toLowerCase() === detailedCategory);
          }

          if (!newCategory && primaryCategory) {
            console.log('Primary category found:', primaryCategory);
            newCategory = categories.find(c => c.primary.toLowerCase() === primaryCategory);
          }

          if (!newCategory) {
            console.log('No category found, using uncategorized');
            newCategory = categories.find(c => c.name.toLowerCase() === 'uncategorized');
          }

          if (newCategory) {
            await transaction.update(t => {
              t.categoryId = newCategory.id;
            });
          }
        }

        // Link transaction to budget items after categorization (or even if no category was set)
        // This handles both merchant-based (expense) and category-based linking
        await this.linkTransactionToBudgetItems(transaction, true);
      },
      inWriteContext
    );
  }

  /**
   * Adds a single transaction to the database
   */
  async addTransaction(transactionDto: TransactionDto, source: TransactionSource): Promise<Transaction> {
    return await this.database.write(async () => {
      const existingTransaction =
        (
          await this.database
            .get<Transaction>('transactions')
            .query(Q.where('transaction_id', transactionDto.transaction_id))
            .fetch()
        )[0] || undefined;

      if (existingTransaction) {
        throw new Error(`Transaction with id ${transactionDto.transaction_id} already exists`);
      }

      const insertedTransaction = await this.database.get<Transaction>('transactions').create(transaction => {
        this.mapTransactionDtoToModel(transaction, transactionDto, source);
      });

      await this.categorizeTransaction(insertedTransaction, undefined, true);
      // Linking happens inside categorizeTransaction
      return insertedTransaction;
    });
  }

  /**
   * Updates a single transaction in the database
   */
  async updateTransaction(transactionDto: TransactionDto): Promise<Transaction> {
    return await this.database.write(async () => {
      const existingTransaction =
        (
          await this.database
            .get<Transaction>('transactions')
            .query(Q.where('transaction_id', transactionDto.transaction_id))
            .fetch()
        )[0] || undefined;

      if (existingTransaction) {
        const updatedTransaction = await existingTransaction.update(transaction => {
          this.mapTransactionDtoToModel(transaction, transactionDto, TransactionSource.Plaid);
        });
        await this.categorizeTransaction(updatedTransaction, undefined, true);
        // Linking happens inside categorizeTransaction
        return updatedTransaction;
      } else {
        // If not found, create it
        const insertedTransaction = await this.database.get<Transaction>('transactions').create(transaction => {
          this.mapTransactionDtoToModel(transaction, transactionDto, TransactionSource.Plaid);
        });
        await this.categorizeTransaction(insertedTransaction, undefined, true);
        // Linking happens inside categorizeTransaction
        return insertedTransaction;
      }
    });
  }

  /**
   * Stores added transactions in the database
   */
  async storeAddedTransactions(added: TransactionDto[]): Promise<void> {
    for (const transactionDto of added) {
      try {
        await this.addTransaction(transactionDto, TransactionSource.Plaid);
      } catch (error: any) {
        // If transaction already exists, skip it (idempotent behavior)
        if (error?.message?.includes('already exists')) {
          continue;
        }
        throw error;
      }
    }
  }

  /**
   * Stores modified transactions in the database
   */
  async storeModifiedTransactions(modified: TransactionDto[]): Promise<void> {
    for (const transactionDto of modified) {
      await this.updateTransaction(transactionDto);
    }
  }

  /**
   * Removes transactions from the database
   */
  async storeRemovedTransactions(removed: { transaction_id: string; account_id: string }[]): Promise<void> {
    await this.database.write(async () => {
      for (const removedTransaction of removed) {
        const existingTransaction =
          (
            await this.database
              .get<Transaction>('transactions')
              .query(Q.where('transaction_id', removedTransaction.transaction_id))
              .fetch()
          )[0] || undefined;

        if (existingTransaction) {
          await existingTransaction.markAsDeleted();
        }
      }
    });
  }

  /**
   * Checks if a transaction date falls within a budget's period
   */
  private isTransactionInBudgetPeriod(transaction: Transaction, budget: Budget): boolean {
    const transactionDate = dayjs(transaction.date).startOf('day');
    const budgetStart = dayjs(budget.startDate).startOf('day');
    const budgetEnd = dayjs(budget.endDate).endOf('day');
    return transactionDate.isSameOrAfter(budgetStart) && transactionDate.isSameOrBefore(budgetEnd);
  }

  /**
   * Gets all child category IDs for a parent category
   * Parent categories have detailed === '' or detailed === null
   */
  private async getChildCategoryIds(parentCategory: Category): Promise<string[]> {
    // Check if this is a parent category (detailed is empty or null)
    const isParentCategory = !parentCategory.detailed || parentCategory.detailed === '';
    if (!isParentCategory) {
      // Not a parent category, return empty array
      return [];
    }

    const childCategories = await this.database
      .get<Category>('categories')
      .query(
        Q.where('primary', parentCategory.primary),
        Q.where('detailed', Q.notEq('')),
        Q.where('detailed', Q.notEq(null))
      )
      .fetch();

    return [parentCategory.id, ...childCategories.map(cat => cat.id)];
  }

  /**
   * Links a transaction to matching budget items based on merchant (expense) or category (category items)
   */
  async linkTransactionToBudgetItems(transaction: Transaction, inWriteContext: boolean = false): Promise<void> {
    await executeInWriteContext(
      this.database,
      async () => {
        // If transaction already has a budget item linked, check if it still matches
        if (transaction.budgetItemId) {
          const currentBudgetItem = await this.database.get<BudgetItem>('budget_items').find(transaction.budgetItemId);
          const budget = await this.database.get<Budget>('budgets').find(currentBudgetItem.budgetId);

          // Check if still matches
          let stillMatches = false;
          if (currentBudgetItem.type === BudgetItemType.Expense && currentBudgetItem.merchantId) {
            stillMatches = transaction.merchantId === currentBudgetItem.merchantId;
          } else if (currentBudgetItem.type === BudgetItemType.Category && currentBudgetItem.categoryId) {
            if (transaction.categoryId === currentBudgetItem.categoryId) {
              stillMatches = true;
            } else {
              // Check if transaction category is a child of budget item category
              const budgetItemCategory = await this.database
                .get<Category>('categories')
                .find(currentBudgetItem.categoryId);
              const childCategoryIds = await this.getChildCategoryIds(budgetItemCategory);
              stillMatches = transaction.categoryId ? childCategoryIds.includes(transaction.categoryId) : false;
            }
          }

          // Check if still in budget period
          if (stillMatches) {
            stillMatches = this.isTransactionInBudgetPeriod(transaction, budget);
          }

          if (!stillMatches) {
            // Unlink if no longer matches
            await transaction.update(t => {
              t.budgetItemId = null;
            });
          } else {
            // Still matches, no need to relink
            return;
          }
        }

        // Find all active budgets where transaction date falls within budget period
        const allBudgets = await this.database.get<Budget>('budgets').query().fetch();
        const matchingBudgets = allBudgets.filter(budget => this.isTransactionInBudgetPeriod(transaction, budget));

        if (matchingBudgets.length === 0) {
          return;
        }

        // Get all budget items from matching budgets
        const budgetIds = matchingBudgets.map(b => b.id);
        const budgetItems = await this.database
          .get<BudgetItem>('budget_items')
          .query(Q.where('budget_id', Q.oneOf(budgetIds)), Q.where('status', BudgetItemStatus.ACTIVE))
          .fetch();

        // Try to match expense items by merchant
        if (transaction.merchantId) {
          const expenseItems = budgetItems.filter(
            item => item.type === BudgetItemType.Expense && item.merchantId === transaction.merchantId
          );

          // Link to first matching expense item that doesn't already have a transaction
          for (const expenseItem of expenseItems) {
            const existingLinkedTransactions = await this.database
              .get<Transaction>('transactions')
              .query(Q.where('budget_item_id', expenseItem.id))
              .fetch();

            // Only link if no transaction is already linked (one-to-one for expenses)
            if (existingLinkedTransactions.length === 0) {
              await transaction.update(t => {
                t.budgetItemId = expenseItem.id;
              });
              return; // Only link to one expense item
            }
          }
        }

        // Try to match category items by category
        if (transaction.categoryId) {
          const categoryItems = budgetItems.filter(item => item.type === BudgetItemType.Category && item.categoryId);

          for (const categoryItem of categoryItems) {
            if (!categoryItem.categoryId) continue;
            const categoryItemCategory = await this.database.get<Category>('categories').find(categoryItem.categoryId);
            let shouldLink = false;

            // Direct match
            if (transaction.categoryId === categoryItem.categoryId) {
              shouldLink = true;
            } else {
              // Check if transaction category is a child of budget item category
              const childCategoryIds = await this.getChildCategoryIds(categoryItemCategory);
              shouldLink = childCategoryIds.includes(transaction.categoryId);
            }

            if (shouldLink) {
              // Link transaction to category item (one-to-many allowed)
              await transaction.update(t => {
                t.budgetItemId = categoryItem.id;
              });
              return; // Link to first matching category item
            }
          }
        }
      },
      inWriteContext
    );
  }

  /**
   * Manually unlinks a transaction from its budget item
   */
  async unlinkTransactionFromBudgetItem(transaction: Transaction, inWriteContext: boolean = false): Promise<void> {
    await executeInWriteContext(
      this.database,
      async () => {
        await transaction.update(t => {
          t.budgetItemId = null;
        });
      },
      inWriteContext
    );
  }

  /**
   * Manually links a transaction to a specific budget item
   */
  async linkTransactionToBudgetItem(
    transaction: Transaction,
    budgetItem: BudgetItem,
    inWriteContext: boolean = false
  ): Promise<void> {
    await executeInWriteContext(
      this.database,
      async () => {
        // Verify transaction date is within budget period
        const budget = await this.database.get<Budget>('budgets').find(budgetItem.budgetId);
        if (!this.isTransactionInBudgetPeriod(transaction, budget)) {
          throw new Error('Transaction date is not within budget period');
        }

        await transaction.update(t => {
          t.budgetItemId = budgetItem.id;
        });
      },
      inWriteContext
    );
  }

  /**
   * Finds all transactions for a category within a date range
   */
  async findTransactionsForCategory(categoryId: string, startDate: Date, endDate: Date): Promise<Transaction[]> {
    const transactionsForDateRange = await this.database
      .get<Transaction>('transactions')
      .query(Q.where('date', Q.gte(startDate.toISOString())), Q.where('date', Q.lte(endDate.toISOString())))
      .fetch();

    const category = await this.database.get<Category>('categories').find(categoryId);
    if (!category) {
      return [];
    }

    const childCategoryIds = await this.getChildCategoryIds(category);

    const transactionsToLink = transactionsForDateRange.filter(t => childCategoryIds.includes(t.categoryId || ''));
    return transactionsToLink;
  }

  /**
   * Maps a TransactionDto to a Transaction model
   */
  private mapTransactionDtoToModel(transaction: Transaction, dto: TransactionDto, source: TransactionSource): void {
    transaction.transactionId = dto.transaction_id;
    transaction.accountId = dto.account_id;
    transaction.amount = dto.amount;
    transaction.isoCurrencyCode =
      dto.iso_currency_code && typeof dto.iso_currency_code === 'string' ? dto.iso_currency_code : undefined;
    transaction.unofficialCurrencyCode =
      dto.unofficial_currency_code && typeof dto.unofficial_currency_code === 'string'
        ? dto.unofficial_currency_code
        : undefined;
    transaction.categoryId = dto.category_id && typeof dto.category_id === 'string' ? dto.category_id : undefined;
    transaction.checkNumber = dto.check_number && typeof dto.check_number === 'string' ? dto.check_number : undefined;
    transaction.date = dto.date;
    transaction.authorizedDate =
      dto.authorized_date && typeof dto.authorized_date === 'string' ? dto.authorized_date : undefined;
    transaction.authorizedDatetime =
      dto.authorized_datetime && typeof dto.authorized_datetime === 'string' ? dto.authorized_datetime : undefined;
    transaction.datetime = dto.datetime && typeof dto.datetime === 'string' ? dto.datetime : undefined;
    transaction.paymentChannel = dto.payment_channel;
    transaction.personalFinanceCategoryPrimary = dto.personal_finance_category?.primary || undefined;
    transaction.personalFinanceCategoryDetailed = dto.personal_finance_category?.detailed || undefined;
    transaction.personalFinanceCategoryConfidenceLevel = dto.personal_finance_category?.confidence_level || undefined;
    transaction.personalFinanceCategoryIconUrl = dto.personal_finance_category_icon_url || undefined;
    transaction.name = dto.name;
    transaction.merchantName =
      dto.merchant_name && typeof dto.merchant_name === 'string' ? dto.merchant_name : undefined;
    transaction.merchantEntityId =
      dto.merchant_entity_id && typeof dto.merchant_entity_id === 'string' ? dto.merchant_entity_id : undefined;
    transaction.logoUrl = dto.logo_url && typeof dto.logo_url === 'string' ? dto.logo_url : undefined;
    transaction.website = dto.website && typeof dto.website === 'string' ? dto.website : undefined;
    transaction.pending = dto.pending;
    transaction.transactionCode =
      dto.transaction_code && typeof dto.transaction_code === 'string' ? dto.transaction_code : undefined;
    transaction.counterparties =
      dto.counterparties && Array.isArray(dto.counterparties) ? JSON.stringify(dto.counterparties) : undefined;
    transaction.source = source;
  }
}
