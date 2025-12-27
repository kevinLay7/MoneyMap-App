import { Model } from '@nozbe/watermelondb';
import { field, relation, readonly, date } from '@nozbe/watermelondb/decorators';
import Account from './account';

export default class AccountDailyBalance extends Model {
  static table = 'account_daily_balances';
  static associations = {
    accounts: { type: 'belongs_to', key: 'account_id' },
  } as const;

  @field('account_id') accountId!: string;
  @field('item_id') itemId!: string;
  @field('balance') balance!: number;
  @field('date') date!: string;

  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;

  @relation('accounts', 'account_id') account!: Account;
}
