import Transaction from '@/model/models/transaction';
import { Database, Q } from '@nozbe/watermelondb';
import { Observable } from '@nozbe/watermelondb/utils/rx';

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
}
