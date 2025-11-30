import { Model } from "@nozbe/watermelondb";
import {
  field,
  relation,
  children,
  readonly,
  date,
} from "@nozbe/watermelondb/decorators";

export default class Item extends Model {
  static table = "items";

  @field("account_id") accountId!: string;
  @field("plaid_item_id") plaidItemId!: string;
  @field("institution_id") institutionId!: string;
  @field("institution_name") institutionName!: string;
  @field("status") status!: string;
  @field("last_successful_update") lastSuccessfulUpdate?: string;
  @readonly @date("created_at") createdAt!: Date;
  @readonly @date("updated_at") updatedAt!: Date;
  @field("is_active") isActive!: boolean;

  @relation("accounts", "account_id") account!: any;
  @children("syncs") syncs!: any;
  @children("transaction_syncs") transactionSyncs!: any;
}
