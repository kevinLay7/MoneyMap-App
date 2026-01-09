import { Model } from '@nozbe/watermelondb';
import { field, readonly, date } from '@nozbe/watermelondb/decorators';
import { LogLevel, LogType } from '@/types/logging';

export default class Log extends Model {
  static table = 'logs';

  @field('type') type!: LogType;
  @field('level') level!: LogLevel;
  @field('message') message!: string;
  @field('metadata') metadata?: string | null;

  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;
}
