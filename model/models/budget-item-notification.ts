import { Model } from '@nozbe/watermelondb';
import { date, field, readonly, relation } from '@nozbe/watermelondb/decorators';
import BudgetItem from './budget-item';

export default class BudgetItemNotification extends Model {
  static table = 'budget_item_notifications';
  static associations = {
    budget_items: { type: 'belongs_to', key: 'budget_item_id' },
  } as const;

  @field('budget_item_id') budgetItemId!: string;
  @field('notification_id') notificationId!: string;
  @field('scheduled_for') scheduledFor!: number; // Timestamp when notification will fire
  @field('days_before') daysBefore!: number; // 0 for due date, 1 for day before
  @field('bill_due_date') billDueDate!: number; // Bill's due date when scheduled

  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;

  @relation('budget_items', 'budget_item_id') budgetItem!: BudgetItem;
}
