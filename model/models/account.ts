import { Model } from "@nozbe/watermelondb";
import {
  field,
  children,
  readonly,
  date,
} from "@nozbe/watermelondb/decorators";

export default class Account extends Model {
  static table = "accounts";

  @field("account_id") accountId!: string;
  @field("name") name!: string;
  @field("official_name") officialName?: string;
  @field("type") type!: string;
  @field("subtype") subtype!: string;
  @field("mask") mask?: string;
  @field("balance_current") balanceCurrent!: number;
  @field("balance_available") balanceAvailable?: number;
  @field("iso_currency_code") isoCurrencyCode?: string;
  @field("unofficial_currency_code") unofficialCurrencyCode?: string;

  @readonly @date("created_at") createdAt!: Date;
  @readonly @date("updated_at") updatedAt!: Date;

  @children("transactions") transactions!: any;
}
