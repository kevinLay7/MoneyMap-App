import { Model, Relation } from '@nozbe/watermelondb';
import { field, relation, readonly, date } from '@nozbe/watermelondb/decorators';
import { TransactionSource } from '@/types/transaction';
import Category from './category';
import Account from './account';
import Merchant from './merchant';

export default class Transaction extends Model {
  static table = 'transactions';
  static associations = {
    accounts: { type: 'belongs_to', key: 'account_id' },
    categories: { type: 'belongs_to', key: 'category_id' },
    merchants: { type: 'belongs_to', key: 'merchant_id' },
  } as const;

  @field('transaction_id') transactionId!: string;
  @field('account_id') accountId!: string;
  @field('merchant_id') merchantId?: string;
  @field('amount') amount!: number;
  @field('iso_currency_code') isoCurrencyCode?: string;
  @field('unofficial_currency_code') unofficialCurrencyCode?: string;
  @field('category_id') categoryId?: string;
  @field('check_number') checkNumber?: string;
  @field('date') date!: string;
  @field('authorized_date') authorizedDate?: string;
  @field('authorized_datetime') authorizedDatetime?: string;
  @field('datetime') datetime?: string;
  @field('payment_channel') paymentChannel!: string;
  @field('personal_finance_category_primary')
  personalFinanceCategoryPrimary?: string;
  @field('personal_finance_category_detailed')
  personalFinanceCategoryDetailed?: string;
  @field('personal_finance_category_confidence_level')
  personalFinanceCategoryConfidenceLevel?: string;
  @field('personal_finance_category_icon_url')
  personalFinanceCategoryIconUrl?: string;
  @field('name') name!: string;
  @field('merchant_name') merchantName?: string;
  @field('merchant_entity_id') merchantEntityId?: string;
  @field('logo_url') logoUrl?: string;
  @field('website') website?: string;
  @field('pending') pending!: boolean;
  @field('transaction_code') transactionCode?: string;
  @field('counterparties') counterparties?: string;
  @field('source') source?: TransactionSource;

  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;

  @relation('accounts', 'account_id') account!: Account;
  @relation('categories', 'category_id') category!: Category;
  @relation('merchants', 'merchant_id') merchant!: Merchant;
}
