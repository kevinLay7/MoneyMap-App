import { Model } from "@nozbe/watermelondb";
import {
  field,
  relation,
  readonly,
  date,
} from "@nozbe/watermelondb/decorators";

export default class Sync extends Model {
  static table = "syncs";
  static associations = {
    accounts: { type: 'belongs_to', key: 'account_id' },
    items: { type: 'belongs_to', key: 'plaid_item_id' },
  } as const;

  @field("account_id") accountId!: string;
  @field("user_id") userId!: string;
  @field("plaid_item_id") plaidItemId!: string;
  @field("action") action!: string;

  @readonly @date("created_at") createdAt!: Date;
  @readonly @date("updated_at") updatedAt!: Date;

  @relation("accounts", "account_id") account!: any;
  @relation("items", "plaid_item_id") item!: any;
}
