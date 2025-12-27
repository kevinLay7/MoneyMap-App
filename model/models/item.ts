import { Model } from '@nozbe/watermelondb';
import { field, relation, children, readonly, date } from '@nozbe/watermelondb/decorators';
import dayjs from '@/helpers/dayjs';

export default class Item extends Model {
  static table = 'items';
  static associations = {
    accounts: { type: 'belongs_to', key: 'account_id' },
    syncs: { type: 'has_many', foreignKey: 'plaid_item_id' },
    transaction_syncs: { type: 'has_many', foreignKey: 'plaid_item_id' },
  } as const;

  @field('account_id') accountId!: string;
  @field('plaid_item_id') plaidItemId!: string;
  @field('item_api_id') itemApiId?: string;
  @field('institution_id') institutionId!: string;
  @field('institution_name') institutionName!: string;
  @field('institution_logo') institutionLogo?: string;
  @field('institution_primary_color') institutionPrimaryColor?: string;
  @field('institution_url') institutionUrl?: string;
  @field('status') status!: string;
  @field('last_successful_update') lastSuccessfulUpdate?: string;
  @field('last_local_refresh') lastLocalRefresh?: string;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;
  @field('is_active') isActive!: boolean;

  @relation('accounts', 'account_id') account!: any;
  @children('syncs') syncs!: any;
  @children('transaction_syncs') transactionSyncs!: any;

  calcTimeSinceLastSync(): string {
    if (!this.lastSuccessfulUpdate) {
      return 'Never';
    }

    const now = dayjs();
    const lastSync = dayjs(this.lastSuccessfulUpdate);

    const diff = Math.abs(now.diff(lastSync, 'millisecond'));
    const diffDays = Math.ceil(diff / (1000 * 3600 * 24));

    if (diffDays <= 1) {
      const diffHours = Math.ceil(diff / (1000 * 3600));

      if (diffHours <= 1) {
        const diffMinutes = Math.ceil(diff / (1000 * 60));

        return diffMinutes > 1 ? `${diffMinutes} minutes` : `${diffMinutes} minute`;
      }

      return diffHours > 1 ? `${diffHours} hours` : `${diffHours} hour`;
    }

    return diffDays > 1 ? `${diffDays} days` : `${diffDays} day`;
  }
}
