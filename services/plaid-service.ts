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
import { logger } from '@/services/logging-service';
import { LogType } from '@/types/logging';

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
          Alert.alert(
            'Account already linked',
            'You already connected this institution. Please update the existing connection instead of adding a new one.',
            [{ text: 'OK' }]
          );
          return;
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
      logger.error(LogType.Plaid, 'Failed to handle Plaid Link success', { error });
      if (error?.message?.startsWith('Duplicate accounts detected')) {
        throw error;
      }
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
      logger.info(LogType.Plaid, 'Fetching accounts for item', { plaidItemId });
      const accountsResponse = await this.plaidApi.plaidControllerGetAccounts(plaidItemId);

      if (!accountsResponse?.data) {
        logger.warn(LogType.Plaid, 'No accounts data received for item', { plaidItemId });
        return;
      }

      const accounts: PlaidAccountDto[] = accountsResponse.data.flat();
      logger.info(LogType.Plaid, 'Received accounts', {
        plaidItemId,
        count: accounts.length,
        accountIds: accounts.map(account => account.account_id),
      });
      const items = await this.database.get<Item>('items').query().fetch();
      const item = items.find(i => i.plaidItemId === plaidItemId);

      if (!item) {
        throw new Error(`Item not found for plaidItemId: ${plaidItemId}`);
      }
      logger.info(LogType.Plaid, 'Matched item for accounts sync', {
        plaidItemId,
        itemId: item.id,
        institutionId: item.institutionId,
        institutionName: item.institutionName,
      });

      const existingAccounts = await this.database.get<Account>('accounts').query().fetch();
      logger.info(LogType.Plaid, 'Existing account records', {
        count: existingAccounts.length,
        accountIds: existingAccounts.map(account => account.accountId),
      });
      const seenAccountIds = new Set<string>();
      const duplicateAccounts: string[] = [];
      const duplicateExistingAccounts: string[] = [];

      const formatAccountLabel = (accountDto: PlaidAccountDto) => {
        const mask = accountDto.mask && typeof accountDto.mask === 'string' ? ` (...${accountDto.mask})` : '';
        return `${accountDto.name}${mask}`;
      };

      const existingAccountsById = existingAccounts.reduce<Record<string, Account[]>>((acc, account) => {
        const key = account.accountId;
        acc[key] = acc[key] ? [...acc[key], account] : [account];
        return acc;
      }, {});
      const preferredAccountById: Record<string, Account> = {};

      for (const [accountId, matches] of Object.entries(existingAccountsById)) {
        if (matches.length > 0) {
          preferredAccountById[accountId] = matches[0];
        }
        if (matches.length > 1) {
          duplicateExistingAccounts.push(accountId);
        }
      }
      if (duplicateExistingAccounts.length > 0) {
        logger.warn(LogType.Plaid, 'Found duplicate existing accounts', { duplicateExistingAccounts });
      }

      for (const accountDto of accounts) {
        const accountId = accountDto.account_id;

        if (seenAccountIds.has(accountId)) {
          duplicateAccounts.push(formatAccountLabel(accountDto));
          continue;
        }

        seenAccountIds.add(accountId);

        const hasCrossItemDuplicate = (existingAccountsById[accountId] ?? []).some(
          match => match.itemId !== item.id
        );
        if (hasCrossItemDuplicate) {
          duplicateAccounts.push(formatAccountLabel(accountDto));
        }
      }

      if (duplicateAccounts.length > 0) {
        const uniqueDuplicates = Array.from(new Set(duplicateAccounts));
        const preview = uniqueDuplicates.slice(0, 4).join(', ');
        const remainingCount = uniqueDuplicates.length - 4;
        const details = uniqueDuplicates.length <= 4 ? preview : `${preview} and ${remainingCount} more`;
        const institutionLabel = item.institutionName ?? 'this institution';
        Alert.alert(
          'Duplicate account detected',
          `We found duplicate account(s) for ${institutionLabel}: ${details}. Please update the existing connection instead of adding a new one.`,
          [{ text: 'OK' }]
        );
        throw new Error(`Duplicate accounts detected for ${institutionLabel}`);
      }

      await this.database.write(async () => {
        if (duplicateExistingAccounts.length > 0) {
          for (const accountId of duplicateExistingAccounts) {
            const matches = existingAccountsById[accountId] ?? [];
            const keepAccount =
              matches.find(match => match.itemId === item.id) ??
              matches.reduce((latest, current) =>
                current.updatedAt.getTime() > latest.updatedAt.getTime() ? current : latest
              );
            preferredAccountById[accountId] = keepAccount;
            for (const account of matches) {
              if (account.id !== keepAccount.id) {
                logger.warn(LogType.Plaid, 'Removing duplicate account record', {
                  accountId,
                  recordId: account.id,
                  keptRecordId: keepAccount.id,
                });
                await account.destroyPermanently();
              }
            }
          }
        }

        // Import AccountService
        const { AccountService } = await import('@/services/account-service');
        const accountService = new AccountService(this.database);

        // Process each account
        for (const accountDto of accounts) {
          const accountId = accountDto.account_id;
          const existingAccount = preferredAccountById[accountId];

          if (existingAccount) {
            logger.info(LogType.Plaid, 'Updating account from Plaid', {
              accountId,
              itemId: item.id,
              recordId: existingAccount.id,
              name: accountDto.name,
              mask: accountDto.mask,
            });
            // Update existing account using AccountService
            await accountService.updateAccountFromPlaid(existingAccount, accountDto, item.id, true);
          } else {
            logger.info(LogType.Plaid, 'Creating account from Plaid', {
              accountId,
              itemId: item.id,
              name: accountDto.name,
              mask: accountDto.mask,
            });
            // Create new account using AccountService
            await accountService.createAccountFromPlaid(accountDto, item.id, true);
          }
        }
      });

      const shouldFetchLiabilities = accounts.some(account => {
        const accountType = typeof account.type === 'string' ? account.type.toLowerCase() : '';
        return accountType === 'credit' || accountType === 'loan';
      });

      if (shouldFetchLiabilities) {
        await this.fetchAndStoreLiabilities(plaidItemId);
      }

      if (duplicateExistingAccounts.length > 0) {
        Alert.alert(
          'Duplicate accounts cleaned up',
          'We detected duplicate account records and consolidated them. If you continue to see duplicates, please relink the institution.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      logger.error(LogType.Plaid, 'Failed to fetch and store accounts', { error });
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
          logger.warn(LogType.Plaid, 'No transactions data received for item', { plaidItemId });
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
            logger.info(LogType.Plaid, 'Calculating daily balances after transaction fetch');
            await this.dailyBalanceService.calculateAllAccountBalances();
            logger.info(LogType.Plaid, 'Daily balance calculation completed');
          } catch (error) {
            logger.error(LogType.Plaid, 'Failed to calculate daily balances', { error });
          }
        });
      }
    } catch (error) {
      logger.error(LogType.Plaid, 'Failed to fetch and store transactions', { error });
      throw error;
    }
  }

  /**
   * Fetches liability data from Plaid API and stores it in the database
   * @param plaidItemId - The Plaid item ID to fetch liabilities for
   */
  async fetchAndStoreLiabilities(plaidItemId: string): Promise<void> {
    try {
      logger.info(LogType.Plaid, 'Fetching liabilities for item', { plaidItemId });

      const response = await this.plaidApi.plaidControllerGetLiabilities(plaidItemId);

      if (!response?.data) {
        logger.info(LogType.Plaid, 'No liability data returned', { plaidItemId });
        return;
      }

      // Log raw response to understand structure
      logger.info(LogType.Plaid, 'Raw liability response', {
        plaidItemId,
        responseType: typeof response.data,
        isArray: Array.isArray(response.data),
        data: response.data,
      });

      const liabilityGroups = response.data?.liabilities;
      if (!liabilityGroups) {
        logger.info(LogType.Plaid, 'No liability groups returned', { plaidItemId });
        return;
      }

      const liabilities = [
        ...(liabilityGroups.credit ?? []),
        ...(liabilityGroups.mortgage ?? []),
        ...(liabilityGroups.student ?? []),
      ];

      if (liabilities.length === 0) {
        logger.info(LogType.Plaid, 'No liabilities found for item', { plaidItemId });
        return;
      }

      await this.database.write(async () => {
        const accounts = await this.database.get<Account>('accounts').query().fetch();

        for (const liability of liabilities) {
          // Skip if liability doesn't have account_id
          if (!liability?.account_id) {
            logger.warn(LogType.Plaid, 'Liability missing account_id', { liability });
            continue;
          }

          const account = accounts.find(a => a.accountId === liability.account_id);
          if (account) {
            await account.update(acc => {
              acc.plaidLiability = JSON.stringify(liability);
            });
            logger.info(LogType.Plaid, 'Stored liability for account', {
              accountId: liability.account_id,
              accountName: account.name,
            });
          } else {
            logger.warn(LogType.Plaid, 'Account not found for liability', {
              accountId: liability.account_id,
            });
          }
        }
      });

      logger.info(LogType.Plaid, 'Successfully stored liabilities', {
        plaidItemId,
        count: liabilities.length,
      });
    } catch (error) {
      logger.error(LogType.Plaid, 'Failed to fetch liabilities', { plaidItemId, error });
      // Don't throw - liability fetch failure shouldn't block account linking
    }
  }
}
