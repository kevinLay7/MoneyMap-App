import { Alert } from 'react-native';
import { Database } from '@nozbe/watermelondb';
import { Plaid } from '@/api/gen/Plaid';
import {
  PlaidAccountDto,
  TransactionsSyncResponseDto,
  PlaidItemCombinedResponseDto,
  PlaidApiItemResponseDto,
} from '@/api/gen/data-contracts';
import Item from '@/model/models/item';
import Account from '@/model/models/account';
import { TransactionService } from './transaction-service';
import { DailyBalanceService } from './daily-balance-service';
import { WriterInterface } from '@nozbe/watermelondb/Database/WorkQueue';

export class PlaidService {
  private readonly transactionService: TransactionService;
  private readonly dailyBalanceService: DailyBalanceService;

  constructor(
    private readonly plaidApi: Plaid,
    private readonly database: Database
  ) {
    this.transactionService = new TransactionService(database);
    this.dailyBalanceService = new DailyBalanceService(database);
  }

  /**
   * Handles the complete Plaid Link success flow:
   * 1. Exchange public token for Plaid item
   * 2. Store item in database
   * 3. Fetch and store accounts
   * 4. Fetch and store transactions (with pagination)
   * 5. Alert user on success/error
   * @param publicToken - The public token from Plaid Link
   * @param institutionId - The institution ID from Plaid Link metadata
   * @param existingPlaidItemId - Optional. If provided, this is an update flow for an existing item
   */
  async handlePlaidLinkSuccess(
    publicToken: string,
    institutionId: string,
    existingPlaidItemId?: string
  ): Promise<void> {
    try {
      // Step 0: Check if the item already exists (only for new items, not updates)
      if (!existingPlaidItemId) {
        const existingItems = await this.database.get<Item>('items').query().fetch();
        const existingItem = existingItems.find(item => item.institutionId === institutionId);
        if (existingItem) {
          throw new Error('Item already exists');
        }
      }

      // Step 1: Exchange public token
      const exchangeResponse = await this.plaidApi.plaidControllerExchangePublicToken({
        publicToken,
      });

      if (!exchangeResponse?.data) {
        throw new Error('No response received from Plaid API');
      }

      const plaidItem: PlaidApiItemResponseDto = exchangeResponse.data;

      await this.fetchAndStoreItem(plaidItem.item_id);

      await this.fetchAndStoreAccounts(plaidItem.item_id);

      await this.fetchAndStoreTransactions(plaidItem.item_id);

      // Step 5: Alert user on success
      const institutionName =
        typeof plaidItem.institution_name === 'string' ? plaidItem.institution_name : 'your institution';
      const successMessage = existingPlaidItemId
        ? `Successfully updated ${institutionName}!`
        : `Successfully connected ${institutionName}!`;
      Alert.alert('Success', successMessage, [{ text: 'OK' }]);
    } catch (error: any) {
      console.error('Failed to handle Plaid Link success:', error);
      const errorMessage =
        error?.response?.data?.message || error?.message || 'Failed to connect account. Please try again.';
      Alert.alert('Error', errorMessage, [{ text: 'OK' }]);
      throw error;
    }
  }

  public async refeshItem(plaidItemId: string): Promise<void> {
    // Check that the item exists in our database
    const items = await this.database.get<Item>('items').query().fetch();
    const existingItem = items.find(i => i.plaidItemId === plaidItemId);
    if (!existingItem) {
      throw new Error(`Item not found for plaidItemId: ${plaidItemId}`);
    }

    // Refresh the item
    await this.fetchAndStoreItem(plaidItemId);

    // Fetch and store accounts
    await this.fetchAndStoreAccounts(plaidItemId);

    // Fetch and store transactions
    await this.fetchAndStoreTransactions(plaidItemId);

    // Update lastLocalRefresh to now after successful refresh (local-only field)
    await this.database.write(async () => {
      const refreshedItems = await this.database.get<Item>('items').query().fetch();
      const itemToUpdate = refreshedItems.find(i => i.plaidItemId === plaidItemId);
      if (itemToUpdate) {
        await itemToUpdate.update(item => {
          item.lastLocalRefresh = new Date().toISOString();
        });
      }
    });
  }

  public async fetchAndStoreItem(plaidItemId: string): Promise<void> {
    const plaidItem = await this.plaidApi.plaidControllerGetPlaidItem(plaidItemId);
    await this.storeItem(plaidItem.data);
  }

  /**
   * Stores a Plaid item in the database
   */
  private async storeItem(plaidItem: PlaidItemCombinedResponseDto): Promise<void> {
    await this.database.write(async (writer: WriterInterface) => {
      // Check if item already exists
      const existingItems = await this.database.get<Item>('items').query().fetch();

      const existingItem = existingItems.find(item => item.plaidItemId === plaidItem.databaseModel.plaid_item_id);

      if (existingItem) {
        // Update existing item
        await existingItem.update(item => {
          item.accountId = plaidItem.databaseModel.account_id;
          item.itemApiId = plaidItem.databaseModel.id || undefined;
          item.institutionId = plaidItem.databaseModel.institution_id;
          item.institutionName = plaidItem.databaseModel.institution_name;
          item.institutionLogo = plaidItem.databaseModel.institution_logo
            ? JSON.stringify(plaidItem.databaseModel.institution_logo)
            : undefined;
          item.institutionPrimaryColor = plaidItem.databaseModel.institution_primary_color
            ? JSON.stringify(plaidItem.databaseModel.institution_primary_color)
            : undefined;
          item.institutionUrl = plaidItem.databaseModel.institution_url
            ? JSON.stringify(plaidItem.databaseModel.institution_url)
            : undefined;
          item.status = plaidItem.databaseModel.status;
          item.lastSuccessfulUpdate = plaidItem.databaseModel.last_successful_update || undefined;
          item.isActive = plaidItem.databaseModel.is_active;
        });
      } else {
        // Create new item
        await this.database.get<Item>('items').create(item => {
          item.accountId = plaidItem.databaseModel.account_id;
          item.plaidItemId = plaidItem.databaseModel.plaid_item_id;
          item.itemApiId = plaidItem.databaseModel.id || undefined;
          item.institutionId = plaidItem.databaseModel.institution_id;
          item.institutionName = plaidItem.databaseModel.institution_name;
          item.institutionLogo = plaidItem.databaseModel.institution_logo
            ? JSON.stringify(plaidItem.databaseModel.institution_logo)
            : undefined;
          item.institutionPrimaryColor = plaidItem.databaseModel.institution_primary_color
            ? JSON.stringify(plaidItem.databaseModel.institution_primary_color)
            : undefined;
          item.institutionUrl = plaidItem.databaseModel.institution_url
            ? JSON.stringify(plaidItem.databaseModel.institution_url)
            : undefined;
          item.status = plaidItem.databaseModel.status;
          item.lastSuccessfulUpdate = plaidItem.databaseModel.last_successful_update || undefined;
          item.isActive = plaidItem.databaseModel.is_active;
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

        // Import AccountService
        const { AccountService } = await import('@/services/account-service');
        const accountService = new AccountService(this.database);

        // Process each account
        for (const accountDto of accounts) {
          const existingAccount = existingAccounts.find(acc => acc.accountId === accountDto.account_id);

          if (existingAccount) {
            // Update existing account using AccountService
            await accountService.updateAccountFromPlaid(existingAccount, accountDto, item.id, true);
          } else {
            // Create new account using AccountService
            await accountService.createAccountFromPlaid(accountDto, item.id, true);
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
      let transactionsFetched = false;

      while (hasMore) {
        const transactionsResponse = await this.plaidApi.plaidControllerGetTransactions(plaidItemId, {
          cursor: cursor || '',
        });

        if (!transactionsResponse?.data) {
          console.warn('No transactions data received for item:', plaidItemId);
          break;
        }

        const transactionsData: TransactionsSyncResponseDto = transactionsResponse.data;

        // Store transactions
        await this.transactionService.storeAddedTransactions(transactionsData.added);
        await this.transactionService.storeModifiedTransactions(transactionsData.modified);
        await this.transactionService.storeRemovedTransactions(transactionsData.removed);

        // Track if we got any transactions
        if (
          transactionsData.added.length > 0 ||
          transactionsData.modified.length > 0 ||
          transactionsData.removed.length > 0
        ) {
          transactionsFetched = true;
        }

        // Update cursor for next iteration
        cursor = transactionsData.next_cursor;
        hasMore = transactionsData.has_more;

        // If no more transactions, break
        if (!hasMore) {
          break;
        }
      }

      // Calculate daily balances in background after transactions are stored
      if (transactionsFetched) {
        setImmediate(async () => {
          try {
            console.log('Calculating daily balances after transaction fetch');
            await this.dailyBalanceService.calculateAllAccountBalances();
            console.log('Daily balance calculation completed');
          } catch (error) {
            console.error('Failed to calculate daily balances:', error);
          }
        });
      }
    } catch (error) {
      console.error('Failed to fetch and store transactions:', error);
      throw error;
    }
  }
}
