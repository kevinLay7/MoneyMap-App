import { Alert } from 'react-native';
import { Database } from '@nozbe/watermelondb';
import { Plaid } from '@/api/gen/Plaid';
import { PlaidItemResponseDto, PlaidAccountDto, TransactionsSyncResponseDto } from '@/api/gen/data-contracts';
import Item from '@/model/models/item';
import Account from '@/model/models/account';
import { TransactionService } from './transaction-service';
import { WriterInterface } from '@nozbe/watermelondb/Database/WorkQueue';

export class PlaidService {
  private transactionService: TransactionService;

  constructor(
    private plaidApi: Plaid,
    private database: Database
  ) {
    this.transactionService = new TransactionService(database);
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

      const plaidItem: PlaidItemResponseDto = exchangeResponse.data;

      // Step 2: Store item in database
      await this.storeItem(plaidItem);

      // Step 3: Fetch and store accounts
      await this.fetchAndStoreAccounts(plaidItem.plaid_item_id);

      // Step 4: Fetch and store transactions (with pagination)
      await this.fetchAndStoreTransactions(plaidItem.plaid_item_id);

      // Step 5: Alert user on success
      const successMessage = existingPlaidItemId
        ? `Successfully updated ${plaidItem.institution_name}!`
        : `Successfully connected ${plaidItem.institution_name}!`;
      Alert.alert('Success', successMessage, [{ text: 'OK' }]);
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
    await this.database.write(async (writer: WriterInterface) => {
      // Check if item already exists
      const existingItems = await this.database.get<Item>('items').query().fetch();

      const existingItem = existingItems.find(item => item.plaidItemId === plaidItem.plaid_item_id);

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
