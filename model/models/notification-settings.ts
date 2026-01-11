import { Model } from '@nozbe/watermelondb';
import { field, readonly, date } from '@nozbe/watermelondb/decorators';

export default class NotificationSettings extends Model {
  static table = 'notification_settings';

  @field('bill_reminders_enabled') billRemindersEnabled!: boolean;
  @field('reminder_time_hour') reminderTimeHour!: number; // 0-23
  @field('reminder_time_minute') reminderTimeMinute!: number; // 0-59
  @field('notify_on_due_date') notifyOnDueDate!: boolean;
  @field('notify_one_day_before') notifyOneDayBefore!: boolean;
  @field('push_token') pushToken?: string | null;

  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;

  // Computed property for display
  get reminderTimeDisplay(): string {
    const hour = this.reminderTimeHour;
    const minute = this.reminderTimeMinute;
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    const displayMinute = minute.toString().padStart(2, '0');
    return `${displayHour}:${displayMinute} ${period}`;
  }
}
