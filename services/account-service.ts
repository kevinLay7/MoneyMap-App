import { Database } from '@nozbe/watermelondb';
import Account from '@/model/models/account';
import { BudgetService } from './budget-service';
import { executeInWriteContext } from '@/helpers/database-helpers';
import { PlaidAccountDto } from '@/api/gen/data-contracts';

export class AccountService {
  constructor(private readonly database: Database) {}

  /**
   * Updates the balance of an account and triggers budget balance updates.
   * @param accountId - The account_id (not WatermelonDB id) of the account to update.
   * @param currentBalance - The new current balance.
   * @param availableBalance - The new available balance.
   * @param inWriteContext - If true, assumes we're already in a write context.
   */
  async updateBalance(
    accountId: string,
    currentBalance: number,
    availableBalance: number,
    inWriteContext: boolean = false
  ) {
    await executeInWriteContext(
      this.database,
      async () => {
        // Find account by account_id (not WatermelonDB id)
        const accounts = await this.database.get<Account>('accounts').query().fetch();
        const account = accounts.find(a => a.accountId === accountId);

        if (!account) {
          throw new Error(`Account with account_id ${accountId} not found`);
        }

        await account.update(account => {
          account.balanceCurrent = currentBalance;
          account.balanceAvailable = availableBalance;
        });

        // Side effect: Update all budgets that depend on this account balance
        const budgetService = new BudgetService(this.database);
        await budgetService.updateBudgetBalancesForAccount(account);
      },
      inWriteContext
    );
  }

  /**
   * Updates the balance of an account by WatermelonDB id and triggers budget balance updates.
   * @param account - The account model instance to update.
   * @param currentBalance - The new current balance.
   * @param availableBalance - The new available balance.
   * @param inWriteContext - If true, assumes we're already in a write context.
   */
  async updateBalanceByAccount(
    account: Account,
    currentBalance: number,
    availableBalance: number,
    inWriteContext: boolean = false
  ) {
    await executeInWriteContext(
      this.database,
      async () => {
        await account.update(account => {
          account.balanceCurrent = currentBalance;
          account.balanceAvailable = availableBalance;
        });

        // Side effect: Update all budgets that depend on this account balance
        const budgetService = new BudgetService(this.database);
        await budgetService.updateBudgetBalancesForAccount(account);
      },
      inWriteContext
    );
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

  /**
   * Creates a new account from Plaid account data.
   * @param accountDto - The Plaid account data.
   * @param itemId - The WatermelonDB id of the Item this account belongs to.
   * @param inWriteContext - If true, assumes we're already in a write context.
   * @returns The created account.
   */
  async createAccountFromPlaid(
    accountDto: PlaidAccountDto,
    itemId: string,
    inWriteContext: boolean = false
  ): Promise<Account> {
    return await executeInWriteContext(
      this.database,
      async () => {
        const balanceCurrent = this.extractBalanceValue(accountDto.balances.current);
        const balanceAvailable = this.extractBalanceValue(accountDto.balances.available);

        const account = await this.database.get<Account>('accounts').create(account => {
          account.accountId = accountDto.account_id;
          account.itemId = itemId;
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

        // Side effect: Update all budgets that depend on this account balance
        const budgetService = new BudgetService(this.database);
        await budgetService.updateBudgetBalancesForAccount(account);

        return account;
      },
      inWriteContext
    );
  }

  /**
   * Updates an existing account from Plaid account data.
   * @param account - The existing account model instance to update.
   * @param accountDto - The Plaid account data.
   * @param itemId - The WatermelonDB id of the Item this account belongs to.
   * @param inWriteContext - If true, assumes we're already in a write context.
   */
  async updateAccountFromPlaid(
    account: Account,
    accountDto: PlaidAccountDto,
    itemId: string,
    inWriteContext: boolean = false
  ): Promise<void> {
    await executeInWriteContext(
      this.database,
      async () => {
        const balanceCurrent = this.extractBalanceValue(accountDto.balances.current);
        const balanceAvailable = this.extractBalanceValue(accountDto.balances.available);

        // Update account fields (excluding balance)
        await account.update(account => {
          account.itemId = itemId;
          account.name = accountDto.name;
          account.officialName =
            accountDto.official_name && typeof accountDto.official_name === 'string'
              ? accountDto.official_name
              : undefined;
          account.type = accountDto.type;
          account.subtype = accountDto.subtype;
          account.mask = accountDto.mask && typeof accountDto.mask === 'string' ? accountDto.mask : undefined;
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

        // Update balance separately to trigger budget updates
        await this.updateBalanceByAccount(account, balanceCurrent, balanceAvailable, true);
      },
      inWriteContext
    );
  }
}
