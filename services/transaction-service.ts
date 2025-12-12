import Category from '@/model/models/category';
import Transaction from '@/model/models/transaction';
import { Database, Q } from '@nozbe/watermelondb';
import { Observable } from '@nozbe/watermelondb/utils/rx';
import { TransactionDto } from '@/api/gen/data-contracts';
import { TransactionSource } from '@/types/transaction';

export class TransactionService {
  constructor(private database: Database) {}

  async fetchUncategorizedTransactions(): Promise<Transaction[]> {
    const transactions = await this.database.get<Transaction>('transactions').query().fetch();

    const lowConfidenceTransactions = transactions.filter(
      transaction => transaction.personalFinanceCategoryConfidenceLevel === 'LOW'
    );

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
   */
  async categorizeTransaction(transaction: Transaction, category?: Category): Promise<void> {
    if (category) {
      await this.database.write(async () => {
        await transaction.update(t => {
          t.category = category.name;
          t.categoryId = category.id;
          t.personalFinanceCategoryConfidenceLevel = 'HIGH';
        });
      });

      return;
    }

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
      await this.database.write(async () => {
        await transaction.update(t => {
          t.category = newCategory.name;
          t.categoryId = newCategory.id;
          t.personalFinanceCategoryConfidenceLevel = 'HIGH';
        });
      });
    }
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

      await this.categorizeTransaction(insertedTransaction);
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
        await this.categorizeTransaction(updatedTransaction);
        return updatedTransaction;
      } else {
        // If not found, create it
        const insertedTransaction = await this.database.get<Transaction>('transactions').create(transaction => {
          this.mapTransactionDtoToModel(transaction, transactionDto, TransactionSource.Plaid);
        });
        await this.categorizeTransaction(insertedTransaction);
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
    transaction.category = dto.category && Array.isArray(dto.category) ? dto.category.join(', ') : undefined;
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
