/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/*
 * ---------------------------------------------------------------
 * ## THIS FILE WAS GENERATED VIA SWAGGER-TYPESCRIPT-API        ##
 * ##                                                           ##
 * ## AUTHOR: acacode                                           ##
 * ## SOURCE: https://github.com/acacode/swagger-typescript-api ##
 * ---------------------------------------------------------------
 */

export interface CreateUserDto {
  /** User Auth0 ID */
  auth0_id: string;
  /** User first name */
  first_name: string;
  /** User last name */
  last_name: string;
  /** User email address */
  email: string;
  /** Account encryption password */
  encryption_password: string;
  /** Account encryption password salt */
  salt: string;
}

export interface AccountResponseDto {
  /**
   * The unique identifier for the account
   * @format uuid
   */
  id: string;
  /**
   * The creation timestamp
   * @format date-time
   */
  created_at: string;
  /**
   * The last update timestamp
   * @format date-time
   */
  updated_at: string;
  /** Whether the account is active */
  is_active: boolean;
  /** The salt used for encryption password hashing */
  salt: string;
}

export interface UserResponseDto {
  /**
   * The unique identifier for the user
   * @format uuid
   */
  id: string;
  /**
   * The account ID for the user
   * @format uuid
   */
  account_id: string;
  /** User email address */
  email: string;
  /** User first name */
  first_name: string;
  /** User last name */
  last_name: string;
  /**
   * User role in the account
   * @default "member"
   */
  role: UserResponseDtoRoleEnum;
  /**
   * The creation timestamp
   * @format date-time
   */
  created_at: string;
  /**
   * The last update timestamp
   * @format date-time
   */
  updated_at: string;
  /** Whether the user is active */
  is_active: boolean;
  /** The account information */
  account: AccountResponseDto | null;
}

export interface CreateLinkTokenDto {
  /**
   * Optional: The Plaid item ID (database UUID or Plaid item ID) to update. If not provided, a new item will be created.
   * @example "123e4567-e89b-12d3-a456-426614174000"
   */
  plaidItemId?: string;
}

export interface PublicTokenDto {
  /**
   * The public token received from Plaid Link
   * @example "public-sandbox-123xyz"
   */
  publicToken: string;
}

export interface PlaidApiItemResponseDto {
  /**
   * The Plaid Item ID
   * @example "item_1234567890"
   */
  item_id: string;
  /**
   * The Plaid Institution ID associated with the Item
   * @example "ins_123"
   */
  institution_id: object | null;
  /**
   * The name of the institution associated with the Item
   * @example "Chase Bank"
   */
  institution_name: object | null;
  /**
   * The URL registered to receive webhooks for the Item
   * @example "https://api.example.com/webhooks/plaid"
   */
  webhook: object | null;
  /** The authentication method used for the Item */
  auth_method: PlaidApiItemResponseDtoAuthMethodEnum;
  /** Error information for the Item */
  error: object | null;
  /**
   * A list of products available for the Item that have not yet been accessed
   * @example ["transactions","identity"]
   */
  available_products: string[];
  /**
   * A list of products that have been billed for the Item
   * @example ["transactions"]
   */
  billed_products: string[];
  /**
   * A list of products added to the Item
   * @example ["transactions"]
   */
  products?: string[];
  /**
   * A list of products that the user has consented to for the Item
   * @example ["transactions"]
   */
  consented_products?: string[];
  /**
   * The date and time at which the Item's access consent will expire, in ISO 8601 format
   * @example "2024-12-31T23:59:59Z"
   */
  consent_expiration_time: object | null;
  /**
   * Indicates whether an Item requires user interaction to be updated
   * @example "background"
   */
  update_type: PlaidApiItemResponseDtoUpdateTypeEnum;
  /**
   * The date and time when the Item was created, in ISO 8601 format
   * @example "2024-01-01T00:00:00Z"
   */
  created_at?: string;
}

export interface PlaidItemResponseDto {
  /**
   * The unique identifier for the Plaid item
   * @format uuid
   */
  id: string;
  /**
   * The account ID for the Plaid item
   * @format uuid
   */
  account_id: string;
  /** The unique identifier for the Plaid item (Returned by Plaid) */
  plaid_item_id: string;
  /** The unique identifier for the institution (Returned by Plaid) */
  institution_id: string;
  /** The name of the institution (Returned by Plaid) */
  institution_name: string;
  /** Base64 encoded logo of the institution (152x152 PNG). May be null if not available. */
  institution_logo: object | null;
  /**
   * Primary brand color of the institution in hexadecimal format. May be null if not available.
   * @example "#1A1A1A"
   */
  institution_primary_color: object | null;
  /** Homepage URL of the institution. May be null if not available. */
  institution_url: object | null;
  /** The status of the Plaid item */
  status: PlaidItemResponseDtoStatusEnum;
  /**
   * The last successful update for the Plaid item
   * @format date-time
   */
  last_successful_update: string;
  /**
   * The creation timestamp
   * @format date-time
   */
  created_at: string;
  /**
   * The last update timestamp
   * @format date-time
   */
  updated_at: string;
  /** Whether the Plaid item is active */
  is_active: boolean;
}

export interface PlaidItemCombinedResponseDto {
  /** The database PlaidItem entity with our stored metadata */
  databaseModel: PlaidItemResponseDto;
  /** The raw Plaid API Item object from Plaid */
  plaidItem: PlaidApiItemResponseDto;
}

export interface AccountBalanceDto {
  /**
   * The total amount of funds in the account
   * @example 1000.5
   */
  available: object;
  /**
   * The total amount of funds in the account, less any pending transactions
   * @example 950.25
   */
  current: object;
  /**
   * The ISO-4217 currency code of the balance
   * @example "USD"
   */
  iso_currency_code: object;
  /**
   * The unofficial currency code associated with the balance
   * @example null
   */
  unofficial_currency_code: object;
  /**
   * The total amount of funds in the account, including any pending transactions
   * @example 1000.5
   */
  limit: object;
}

export interface PlaidAccountDto {
  /**
   * Plaid's unique identifier for the account
   * @example "vzeNDwK7KQIm4yEog683Ql4wZ6MQvEIoW3Ql6"
   */
  account_id: string;
  /** Account balance information */
  balances: AccountBalanceDto;
  /**
   * The last 2-4 alphanumeric characters of either the account's displayed mask or the account's official account number
   * @example "0000"
   */
  mask: object | null;
  /**
   * The name of the account, either assigned by the user or by the financial institution itself
   * @example "Plaid Checking"
   */
  name: string;
  /**
   * The official name of the account as given by the financial institution
   * @example "Plaid Gold Standard 0% Interest Checking"
   */
  official_name: object | null;
  /**
   * The type of account
   * @example "depository"
   */
  type: PlaidAccountDtoTypeEnum;
  /**
   * The subtype of the account
   * @example "checking"
   */
  subtype: PlaidAccountDtoSubtypeEnum;
}

export interface PersonalFinanceCategoryDto {
  /**
   * A high level category that communicates the broad category of the transaction
   * @example "GENERAL_MERCHANDISE"
   */
  primary: string;
  /**
   * A granular category conveying the transaction's intent. This field can also be used as a unique identifier for the category
   * @example "GENERAL_MERCHANDISE_OTHER_GENERAL_MERCHANDISE"
   */
  detailed: string;
  /**
   * A description of how confident we are that the provided categories accurately describe the transaction intent
   * @example "HIGH"
   */
  confidence_level: PersonalFinanceCategoryDtoConfidenceLevelEnum;
}

export interface TransactionDto {
  /**
   * The ID of the account in which this transaction occurred
   * @example "vzeNDwK7KQIm4yEog683Ql4wZ6MQvEIoW3Ql6"
   */
  account_id: string;
  /**
   * The settled value of the transaction, denominated in the transaction's currency
   * @example -25.5
   */
  amount: number;
  /**
   * The ISO-4217 currency code of the transaction
   * @example "USD"
   */
  iso_currency_code: object | null;
  /**
   * The unofficial currency code associated with the transaction
   * @example null
   */
  unofficial_currency_code: object | null;
  /**
   * A hierarchical array of the categories to which this transaction belongs (deprecated)
   * @example ["Shops","Food and Drink","Restaurants"]
   */
  category: string[] | null;
  /**
   * The ID of the category to which this transaction belongs (deprecated)
   * @example "13005043"
   */
  category_id: object | null;
  /**
   * The check number of the transaction
   * @example "1234"
   */
  check_number: object | null;
  /**
   * The date that the transaction occurred or posted in ISO 8601 format (YYYY-MM-DD)
   * @example "2023-01-15"
   */
  date: string;
  /**
   * The date that the transaction was authorized in ISO 8601 format (YYYY-MM-DD)
   * @example "2023-01-14"
   */
  authorized_date: object | null;
  /**
   * Date and time when a transaction was authorized in ISO 8601 format (YYYY-MM-DDTHH:mm:ssZ)
   * @example "2023-01-14T10:30:00Z"
   */
  authorized_datetime: object | null;
  /**
   * Date and time when a transaction was posted in ISO 8601 format (YYYY-MM-DDTHH:mm:ssZ)
   * @example "2023-01-15T08:00:00Z"
   */
  datetime: object | null;
  /**
   * The channel used to make a payment
   * @example "online"
   */
  payment_channel: TransactionDtoPaymentChannelEnum;
  /** Personal finance category information */
  personal_finance_category: PersonalFinanceCategoryDto | null;
  /**
   * The URL of an icon associated with the primary personal finance category
   * @example "https://plaid-category-icons.plaid.com/PFC_GENERAL_MERCHANDISE.png"
   */
  personal_finance_category_icon_url: string | null;
  /**
   * The merchant or transaction name
   * @example "Uber 063015 SF**POOL**"
   */
  name: string;
  /**
   * The merchant name, as extracted by Plaid from the raw description
   * @example "Uber"
   */
  merchant_name: object | null;
  /**
   * The merchant entity name on the network
   * @example "Uber Technologies, Inc."
   */
  merchant_entity_id: object | null;
  /**
   * The logo URL for the merchant
   * @example "https://pics.avs.io/200/200/UB.png"
   */
  logo_url: object | null;
  /**
   * The website associated with this merchant
   * @example "https://www.uber.com"
   */
  website: object | null;
  /**
   * Indicates if the transaction is pending
   * @example false
   */
  pending: boolean;
  /**
   * The ID of the transaction
   * @example "vzeNDwK7KQIm4yEog683Ql4wZ6MQvEIoW3Ql6"
   */
  transaction_id: string;
  /**
   * The transaction code
   * @example "direct_debit"
   */
  transaction_code: object | null;
  /**
   * The counterparties present in the transaction
   * @example [{"name":"Uber","type":"merchant"}]
   */
  counterparties: object[] | null;
}

export interface RemovedTransactionDto {
  /**
   * The ID of the removed transaction
   * @example "vzeNDwK7KQIm4yEog683Ql4wZ6MQvEIoW3Ql6"
   */
  transaction_id: string;
  /**
   * The ID of the account of the removed transaction
   * @example "vzeNDwK7KQIm4yEog683Ql4wZ6MQvEIoW3Ql6"
   */
  account_id: string;
}

export interface TransactionsSyncResponseDto {
  /**
   * The update status for transaction pulls of an Item
   * @example "HISTORICAL_UPDATE_COMPLETE"
   */
  transactions_update_status: TransactionsSyncResponseDtoTransactionsUpdateStatusEnum;
  /** An array of accounts at a financial institution associated with the transactions in this response */
  accounts: PlaidAccountDto[];
  /** Transactions that have been added to the Item since cursor ordered by ascending last modified time */
  added: TransactionDto[];
  /** Transactions that have been modified on the Item since cursor ordered by ascending last modified time */
  modified: TransactionDto[];
  /** Transactions that have been removed from the Item since cursor ordered by ascending last modified time */
  removed: RemovedTransactionDto[];
  /**
   * Cursor used for fetching any future updates after the latest update provided in this response
   * @example "eyJjdXJzb3IiOiI1NTQyMjU0Zi1hYzIxLTRjNjEtYjQ2YS1iYzQyYzQyYzQyYzQy"
   */
  next_cursor: string;
  /**
   * Represents if more than requested count of transaction updates exist
   * @example false
   */
  has_more: boolean;
  /**
   * A unique identifier for the request, which can be used for troubleshooting
   * @example "vzeNDwK7KQIm4yEog683Ql4wZ6MQvEIoW3Ql6"
   */
  request_id: string;
}

export interface CreditCardLiabilityDto {
  /** The ID of the account */
  account_id: string;
  /** The various interest rates that apply to the account */
  aprs: string[];
  /** Whether the account is overdue or not */
  is_overdue: object | null;
  /** The amount of the last payment */
  last_payment_amount: object | null;
  /** The date of the last payment in ISO 8601 format */
  last_payment_date: object | null;
  /** The date of the last statement in ISO 8601 format */
  last_statement_issue_date: object | null;
  /** The minimum payment due for the next billing cycle */
  minimum_payment_amount: object | null;
  /** The due date for the next payment in ISO 8601 format */
  next_payment_due_date: object | null;
}

export interface MortgageLiabilityDto {
  /** The ID of the account */
  account_id: string;
  /** The account number */
  account_number: object | null;
  /** The current outstanding amount charged for late payment */
  current_late_fee: object | null;
  /** Total amount held in escrow to pay taxes and insurance */
  escrow_balance: object | null;
  /** Whether the borrower has private mortgage insurance in effect */
  has_pmi: object | null;
  /** Whether the borrower will pay a prepayment penalty */
  has_prepayment_penalty: object | null;
  /** The interest rate on the loan */
  interest_rate: object;
  /** The amount of the last payment */
  last_payment_amount: object | null;
  /** The date of the last payment */
  last_payment_date: object | null;
  /** The type of loan */
  loan_type_description: object | null;
  /** The original principal amount of the mortgage */
  origination_principal_amount: object | null;
  /** The amount of principal paid year-to-date */
  ytd_principal_paid: object | null;
}

export interface StudentLoanLiabilityDto {
  /** The ID of the account */
  account_id: string;
  /** The account number */
  account_number: object | null;
  /** The dates of each payment */
  disbursement_dates: object | null;
  /** The date the loan is expected to be paid off */
  expected_payoff_date: object | null;
  /** The guarantor of the loan */
  guarantor: object | null;
  /** The interest rate on the loan */
  interest_rate_percentage: number;
  /** Whether the loan is overdue */
  is_overdue: object | null;
  /** The amount of the last payment */
  last_payment_amount: object | null;
  /** The date of the last payment */
  last_payment_date: object | null;
  /** The date of the last statement */
  last_statement_issue_date: object | null;
  /** The ID of the loan */
  loan_name: object | null;
  /** The status of the loan */
  loan_status: object | null;
  /** The minimum payment amount */
  minimum_payment_amount: object | null;
  /** The due date for the next payment */
  next_payment_due_date: object | null;
  /** The date on which the loan was initially lent */
  origination_date: object | null;
  /** The original principal amount of the loan */
  origination_principal_amount: object | null;
  /** The outstanding interest amount */
  outstanding_interest_amount: object | null;
  /** The payment reference number */
  payment_reference_number: object | null;
  /** Information about the student loan repayment plan */
  repayment_plan: object | null;
  /** The sequence number of the loan */
  sequence_number: object | null;
  /** The servicer of the loan */
  servicer_address: object | null;
  /** Year-to-date interest paid on the loan */
  ytd_interest_paid: object | null;
  /** Year-to-date principal paid on the loan */
  ytd_principal_paid: object | null;
}

export interface LiabilitiesObjectDto {
  /** Credit card liabilities */
  credit: CreditCardLiabilityDto[] | null;
  /** Mortgage liabilities */
  mortgage: MortgageLiabilityDto[] | null;
  /** Student loan liabilities */
  student: StudentLoanLiabilityDto[] | null;
}

export interface LiabilitiesGetResponseDto {
  /** An array of accounts associated with the Item */
  accounts: PlaidAccountDto[];
  /** Metadata about the Item */
  item: object;
  /** An object containing liability accounts */
  liabilities: LiabilitiesObjectDto;
  /** A unique identifier for the request */
  request_id: string;
}

export interface PlaidSyncDto {
  /**
   * The ID of the Plaid sync
   * @example "123"
   */
  id: string;
  /**
   * The account ID of the Plaid sync
   * @example "123"
   */
  account_id: string;
  /**
   * The user ID of the Plaid sync
   * @example "123"
   */
  user_id: string;
  /**
   * The Plaid item ID of the Plaid sync
   * @example "123"
   */
  plaid_item_id: string;
  /**
   * The action of the Plaid sync
   * @example "update"
   */
  action: string;
  /**
   * The creation timestamp of the Plaid sync
   * @format date-time
   * @example "2021-01-01"
   */
  created_at: string;
}

export interface Category {
  /** The unique identifier of the category */
  id: number;
  /**
   * The name of the category
   * @maxLength 255
   */
  name: string;
  /**
   * The primary category value
   * @maxLength 255
   */
  primary: string;
  /**
   * Detailed category information
   * @maxLength 255
   */
  detailed: string;
  /**
   * Description of the category
   * @maxLength 255
   */
  description: string;
  /** Icon representing the category */
  icon?: string;
  /** Color representing the category */
  color?: string;
  /** Whether the category is ignored */
  ignored: boolean;
  /** Child categories */
  children?: any[][];
}

export interface MigrationDto {
  /** Previous schema version (local schema at time of last sync) */
  from: number;
  /** Current schema version */
  to: number;
  /** Tables added since last sync (whitelisted) */
  tables: string[];
  /** Columns added since last sync, grouped by table (whitelisted) */
  columns: Record<string, string[]>;
}

export interface PullChangesDto {
  /**
   * Last pulled timestamp in milliseconds since epoch (null or 0 for first sync)
   * @example 1640995200000
   */
  lastPulledAt: object;
  /** Migration information for schema versioning */
  migration: MigrationDto;
}

export interface PushChangesDto {
  /** Changes grouped by table name */
  changes: Record<
    string,
    {
      created?: any[];
      updated?: any[];
      deleted?: any[];
    }
  >;
  /** Last pulled timestamp before this push */
  lastPulledAt: string;
  /**
   * Schema version/migration number
   * @default 0
   */
  migrations: number;
}

/**
 * User role in the account
 * @default "member"
 */
export enum UserResponseDtoRoleEnum {
  Owner = "owner",
  Admin = "admin",
  Member = "member",
}

/** The authentication method used for the Item */
export enum PlaidApiItemResponseDtoAuthMethodEnum {
  Automatic = "automatic",
  Instant = "instant",
  Manual = "manual",
}

/**
 * Indicates whether an Item requires user interaction to be updated
 * @example "background"
 */
export enum PlaidApiItemResponseDtoUpdateTypeEnum {
  Background = "background",
  UserPresentRequired = "user_present_required",
}

/** The status of the Plaid item */
export enum PlaidItemResponseDtoStatusEnum {
  Active = "active",
  Inactive = "inactive",
  Error = "error",
  Pending = "pending",
}

/**
 * The type of account
 * @example "depository"
 */
export enum PlaidAccountDtoTypeEnum {
  Depository = "depository",
  Credit = "credit",
  Loan = "loan",
  Investment = "investment",
  Other = "other",
}

/**
 * The subtype of the account
 * @example "checking"
 */
export enum PlaidAccountDtoSubtypeEnum {
  Checking = "checking",
  Savings = "savings",
  Hsa = "hsa",
  Cd = "cd",
  MoneyMarket = "money_market",
  Paypal = "paypal",
  Prepaid = "prepaid",
  CashManagement = "cash_management",
  Ebt = "ebt",
  CreditCard = "credit_card",
  Paypal1 = "paypal",
  Auto = "auto",
  Business = "business",
  Commercial = "commercial",
  Construction = "construction",
  Consumer = "consumer",
  HomeEquity = "home_equity",
  Loan = "loan",
  Mortgage = "mortgage",
  LineOfCredit = "line_of_credit",
  Student = "student",
  Other = "other",
}

/**
 * A description of how confident we are that the provided categories accurately describe the transaction intent
 * @example "HIGH"
 */
export enum PersonalFinanceCategoryDtoConfidenceLevelEnum {
  VERY_HIGH = "VERY_HIGH",
  HIGH = "HIGH",
  MEDIUM = "MEDIUM",
  LOW = "LOW",
  UNKNOWN = "UNKNOWN",
}

/**
 * The channel used to make a payment
 * @example "online"
 */
export enum TransactionDtoPaymentChannelEnum {
  Online = "online",
  InStore = "in store",
  Other = "other",
}

/**
 * The update status for transaction pulls of an Item
 * @example "HISTORICAL_UPDATE_COMPLETE"
 */
export enum TransactionsSyncResponseDtoTransactionsUpdateStatusEnum {
  TRANSACTIONS_UPDATE_STATUS_UNKNOWN = "TRANSACTIONS_UPDATE_STATUS_UNKNOWN",
  NOT_READY = "NOT_READY",
  INITIAL_UPDATE_COMPLETE = "INITIAL_UPDATE_COMPLETE",
  HISTORICAL_UPDATE_COMPLETE = "HISTORICAL_UPDATE_COMPLETE",
}
