import { Model } from "@nozbe/watermelondb";
import {
  date,
  field,
  readonly,
  relation,
} from "@nozbe/watermelondb/decorators";

export default class TransactionSync extends Model {
  static table = "transaction_syncs";
  static associations = {
    items: { type: 'belongs_to', key: 'plaid_item_id' },
  } as const;

  @field("plaid_item_id") plaidItemId!: string;
  @field("transactions_update_status") transactionsUpdateStatus!: string;
  @field("next_cursor") nextCursor!: string;
  @field("has_more") hasMore!: boolean;
  @field("request_id") requestId!: string;

  @readonly @date("created_at") createdAt!: Date;
  @readonly @date("updated_at") updatedAt!: Date;

  @relation("items", "plaid_item_id") item!: any;
}
