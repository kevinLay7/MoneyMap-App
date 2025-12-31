import { Model, Query } from '@nozbe/watermelondb';
import { field, readonly, date, children } from '@nozbe/watermelondb/decorators';
import Transaction from './transaction';
import BudgetItem from './budget-item';

export default class Merchant extends Model {
  static table = 'merchants';
  static associations = {
    transactions: { type: 'has_many', foreignKey: 'merchant_id' },
    budget_items: { type: 'has_many', foreignKey: 'merchant_id' },
  } as const;

  @field('entity_id') entityId!: string;
  @field('name') name!: string;
  @field('logo_url') logoUrl?: string;
  @field('website') website?: string;

  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;

  @children('transactions') transactions!: Query<Transaction>;
  @children('budget_items') budgetItems!: Query<BudgetItem>;
}

