import Budget from '../models/budget';
import BudgetItem, { BudgetItemType } from '../models/budget-item';
import Account from '../models/account';

export class BudgetViewModel {
  constructor(
    public readonly budget: Budget,
    public readonly budgetItems: BudgetItem[],
    public readonly account: Account | undefined
  ) {}

  /**
   * Gets the total remaining balance for the budget.
   * @param budget - The budget to get the total remaining balance for.
   * @param budgetItems - The budget items to get the total remaining balance for.
   * @param accountOnlyExpenses - Whether to only include expense items that are funded from the account.
   * @returns The total remaining balance.
   */
  getTotalRemaining(accountOnlyExpenses: boolean = false) {
    const totalExpenses = this.getExpenseItems(accountOnlyExpenses).reduce((acc, item) => acc + item.amount, 0);

    return this.budget.balance - totalExpenses;
  }

  /**
   * Gets the expense items for the budget.
   * @param budget - The budget to get the expense items for.
   * @param budgetItems - The budget items to get the expense items for.
   * @param accountOnlyExpenses - Whether to only include expense items that are funded from the account.
   * @returns The expense items.
   */
  getExpenseItems(accountOnlyExpenses: boolean = false) {
    return this.budgetItems.filter(
      item =>
        item.type === BudgetItemType.Expense &&
        (accountOnlyExpenses ? item.fundingAccountId === this.budget?.accountId : true)
    );
  }
}
