import { Alert } from 'react-native';
import { Database } from '@nozbe/watermelondb';
import { Plaid } from '@/api/gen/Plaid';
import {
  PlaidItemResponseDto,
  PlaidAccountDto,
  TransactionDto,
  TransactionsSyncResponseDto,
} from '@/api/gen/data-contracts';
import Item from '@/model/models/item';
import Account from '@/model/models/account';
import Transaction from '@/model/models/transaction';

export class PlaidService {
  constructor(
    private plaidApi: Plaid,
    private database: Database
  ) {}

  /**
   * Handles the complete Plaid Link success flow:
   * 1. Exchange public token for Plaid item
   * 2. Store item in database
   * 3. Fetch and store accounts
   * 4. Fetch and store transactions (with pagination)
   * 5. Alert user on success/error
   */
  async handlePlaidLinkSuccess(publicToken: string): Promise<void> {
    try {
      // Step 1: Exchange public token
      const exchangeResponse = await this.plaidApi.plaidControllerExchangePublicToken({
        publicToken,
      });

      if (!exchangeResponse?.data) {
        throw new Error('No response received from Plaid API');
      }

      const plaidItem: PlaidItemResponseDto = exchangeResponse.data;

      console.log(plaidItem);

      // Step 2: Store item in database
      await this.storeItem(plaidItem);

      // Step 3: Fetch and store accounts
      await this.fetchAndStoreAccounts(plaidItem.plaid_item_id);

      // Step 4: Fetch and store transactions (with pagination)
      await this.fetchAndStoreTransactions(plaidItem.plaid_item_id);

      // Step 5: Alert user on success
      Alert.alert('Success', `Successfully connected ${plaidItem.institution_name}!`, [{ text: 'OK' }]);
    } catch (error: any) {
      console.error('Failed to handle Plaid Link success:', error);
      const errorMessage =
        error?.response?.data?.message || error?.message || 'Failed to connect account. Please try again.';
      Alert.alert('Error', errorMessage, [{ text: 'OK' }]);
      throw error;
    }
  }

  /**
   * Stores a Plaid item in the database
   */
  private async storeItem(plaidItem: PlaidItemResponseDto): Promise<void> {
    await this.database.write(async () => {
      // Check if item already exists
      const existingItems = await this.database.get<Item>('items').query().fetch();

      const existingItem = existingItems.find(item => item.plaidItemId === plaidItem.plaid_item_id);

      console.log(plaidItem.institution_logo);
      console.log(plaidItem.institution_primary_color);
      console.log(plaidItem.institution_url);

      if (existingItem) {
        // Update existing item
        await existingItem.update(item => {
          item.accountId = plaidItem.account_id;
          item.itemApiId = plaidItem.id || undefined;
          item.institutionId = plaidItem.institution_id;
          item.institutionName = plaidItem.institution_name;
          item.institutionLogo = plaidItem.institution_logo ? JSON.stringify(plaidItem.institution_logo) : undefined;
          item.institutionPrimaryColor = plaidItem.institution_primary_color
            ? JSON.stringify(plaidItem.institution_primary_color)
            : undefined;
          item.institutionUrl = plaidItem.institution_url ? JSON.stringify(plaidItem.institution_url) : undefined;
          item.status = plaidItem.status;
          item.lastSuccessfulUpdate = plaidItem.last_successful_update || undefined;
          item.isActive = plaidItem.is_active;
        });
      } else {
        // Create new item
        await this.database.get<Item>('items').create(item => {
          item.accountId = plaidItem.account_id;
          item.plaidItemId = plaidItem.plaid_item_id;
          item.itemApiId = plaidItem.id || undefined;
          item.institutionId = plaidItem.institution_id;
          item.institutionName = plaidItem.institution_name;
          item.institutionLogo = plaidItem.institution_logo ? JSON.stringify(plaidItem.institution_logo) : undefined;
          item.institutionPrimaryColor = plaidItem.institution_primary_color
            ? JSON.stringify(plaidItem.institution_primary_color)
            : undefined;
          item.institutionUrl = plaidItem.institution_url ? JSON.stringify(plaidItem.institution_url) : undefined;
          item.status = plaidItem.status;
          item.lastSuccessfulUpdate = plaidItem.last_successful_update || undefined;
          item.isActive = plaidItem.is_active;
        });
      }
    });
  }

  /**
   * Fetches accounts for a Plaid item and stores them in the database
   */
  async fetchAndStoreAccounts(plaidItemId: string): Promise<void> {
    try {
      const accountsResponse = await this.plaidApi.plaidControllerGetAccounts(plaidItemId);

      if (!accountsResponse?.data) {
        console.warn('No accounts data received for item:', plaidItemId);
        return;
      }

      const accounts: PlaidAccountDto[] = accountsResponse.data.flat();

      await this.database.write(async () => {
        // Find the Item record by plaidItemId
        const items = await this.database.get<Item>('items').query().fetch();
        const item = items.find(i => i.plaidItemId === plaidItemId);

        if (!item) {
          throw new Error(`Item not found for plaidItemId: ${plaidItemId}`);
        }

        // Get existing accounts to check for updates
        const existingAccounts = await this.database.get<Account>('accounts').query().fetch();

        // Process each account
        for (const accountDto of accounts) {
          const existingAccount = existingAccounts.find(acc => acc.accountId === accountDto.account_id);
          // Extract balance values (API returns objects, need to convert)
          const balanceCurrent = this.extractBalanceValue(accountDto.balances.current);
          const balanceAvailable = this.extractBalanceValue(accountDto.balances.available);

          if (existingAccount) {
            // Update existing account
            await existingAccount.update(account => {
              account.itemId = item.id;
              account.name = accountDto.name;
              account.officialName =
                accountDto.official_name && typeof accountDto.official_name === 'string'
                  ? accountDto.official_name
                  : undefined;
              account.type = accountDto.type;
              account.subtype = accountDto.subtype;
              account.mask = accountDto.mask && typeof accountDto.mask === 'string' ? accountDto.mask : undefined;
              account.balanceCurrent = balanceCurrent;
              account.balanceAvailable = balanceAvailable;
              account.isoCurrencyCode =
                accountDto.balances.iso_currency_code && typeof accountDto.balances.iso_currency_code === 'string'
                  ? accountDto.balances.iso_currency_code
                  : accountDto.balances.iso_currency_code && typeof accountDto.balances.iso_currency_code === 'object'
                    ? String(accountDto.balances.iso_currency_code)
                    : undefined;
              account.unofficialCurrencyCode =
                accountDto.balances.unofficial_currency_code &&
                typeof accountDto.balances.unofficial_currency_code === 'string'
                  ? accountDto.balances.unofficial_currency_code
                  : accountDto.balances.unofficial_currency_code &&
                      typeof accountDto.balances.unofficial_currency_code === 'object'
                    ? String(accountDto.balances.unofficial_currency_code)
                    : undefined;
            });
          } else {
            // Create new account
            await this.database.get<Account>('accounts').create(account => {
              account.accountId = accountDto.account_id;
              account.itemId = item.id;
              account.name = accountDto.name;
              account.officialName =
                accountDto.official_name && typeof accountDto.official_name === 'string'
                  ? accountDto.official_name
                  : undefined;
              account.type = accountDto.type;
              account.subtype = accountDto.subtype;
              account.mask = accountDto.mask && typeof accountDto.mask === 'string' ? accountDto.mask : undefined;
              account.balanceCurrent = balanceCurrent;
              account.balanceAvailable = balanceAvailable;
              account.isoCurrencyCode =
                accountDto.balances.iso_currency_code && typeof accountDto.balances.iso_currency_code === 'string'
                  ? accountDto.balances.iso_currency_code
                  : accountDto.balances.iso_currency_code && typeof accountDto.balances.iso_currency_code === 'object'
                    ? String(accountDto.balances.iso_currency_code)
                    : undefined;
              account.unofficialCurrencyCode =
                accountDto.balances.unofficial_currency_code &&
                typeof accountDto.balances.unofficial_currency_code === 'string'
                  ? accountDto.balances.unofficial_currency_code
                  : accountDto.balances.unofficial_currency_code &&
                      typeof accountDto.balances.unofficial_currency_code === 'object'
                    ? String(accountDto.balances.unofficial_currency_code)
                    : undefined;
            });
          }
        }
      });
    } catch (error) {
      console.error('Failed to fetch and store accounts:', error);
      throw error;
    }
  }

  /**
   * Fetches transactions for a Plaid item with pagination and stores them in the database
   */
  async fetchAndStoreTransactions(plaidItemId: string): Promise<void> {
    try {
      let cursor = '';
      let hasMore = true;

      while (hasMore) {
        const transactionsResponse = await this.plaidApi.plaidControllerGetTransactions(plaidItemId, {
          cursor: cursor || '0',
        });

        if (!transactionsResponse?.data) {
          console.warn('No transactions data received for item:', plaidItemId);
          break;
        }

        const transactionsData: TransactionsSyncResponseDto = transactionsResponse.data;

        // Store transactions
        await this.storeTransactions(transactionsData.added, transactionsData.modified, transactionsData.removed);

        // Update cursor for next iteration
        cursor = transactionsData.next_cursor;
        hasMore = transactionsData.has_more;

        // If no more transactions, break
        if (!hasMore) {
          break;
        }
      }
    } catch (error) {
      console.error('Failed to fetch and store transactions:', error);
      throw error;
    }
  }

  /**
   * Stores transactions in the database (added, modified, and removed)
   */
  private async storeTransactions(
    added: TransactionDto[],
    modified: TransactionDto[],
    removed: { transaction_id: string; account_id: string }[]
  ): Promise<void> {
    await this.database.write(async () => {
      // Get existing transactions
      const existingTransactions = await this.database.get<Transaction>('transactions').query().fetch();

      // Process added transactions
      for (const transactionDto of added) {
        const existingTransaction = existingTransactions.find(t => t.transactionId === transactionDto.transaction_id);

        if (!existingTransaction) {
          await this.database.get<Transaction>('transactions').create(transaction => {
            this.mapTransactionDtoToModel(transaction, transactionDto);
          });
        }
      }

      // Process modified transactions
      for (const transactionDto of modified) {
        const existingTransaction = existingTransactions.find(t => t.transactionId === transactionDto.transaction_id);

        if (existingTransaction) {
          await existingTransaction.update(transaction => {
            this.mapTransactionDtoToModel(transaction, transactionDto);
          });
        } else {
          // If not found, create it
          await this.database.get<Transaction>('transactions').create(transaction => {
            this.mapTransactionDtoToModel(transaction, transactionDto);
          });
        }
      }

      // Process removed transactions
      for (const removedTransaction of removed) {
        const existingTransaction = existingTransactions.find(
          t => t.transactionId === removedTransaction.transaction_id
        );

        if (existingTransaction) {
          await existingTransaction.markAsDeleted();
        }
      }
    });
  }

  /**
   * Maps a TransactionDto to a Transaction model
   */
  private mapTransactionDtoToModel(transaction: Transaction, dto: TransactionDto): void {
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
  }

  /**
   * Extracts numeric value from balance field (API may return numbers or objects)
   */
  private extractBalanceValue(value: unknown): number {
    if (typeof value === 'number') {
      return value;
    }
    if (typeof value === 'string') {
      const parsed = parseFloat(value);
      return isNaN(parsed) ? 0 : parsed;
    }
    if (value === null || value === undefined) {
      return 0;
    }
    // Handle case where API returns object (though typically it's a number)
    if (value && typeof value === 'object') {
      const obj = value as Record<string, unknown>;
      // Try common property names
      const numValue = obj.value ?? obj.amount ?? obj.balance ?? obj.current ?? obj.available;
      if (typeof numValue === 'number') {
        return numValue;
      }
      if (typeof numValue === 'string') {
        const parsed = parseFloat(numValue);
        return isNaN(parsed) ? 0 : parsed;
      }
    }
    return 0;
  }
}
