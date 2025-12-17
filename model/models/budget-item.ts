import { Model } from '@nozbe/watermelondb';
import { date, readonly, field, relation } from '@nozbe/watermelondb/decorators';
import Budget from './budget';

export default class BudgetItem extends Model {
  static table = 'budget_items';

  @field('budget_id') budgetId!: string;
  @field('name') name!: string;

  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;

  @relation('budgets', 'budget_id') budget!: Budget;
}
