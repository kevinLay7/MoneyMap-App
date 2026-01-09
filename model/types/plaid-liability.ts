export interface PlaidApr {
  apr_type: string;
  apr_percentage: number;
  balance_subject_to_apr: number | null;
  interest_charge_amount: number | null;
}

export interface PlaidLiability {
  account_id: string;
  aprs: PlaidApr[];
  is_overdue: boolean;
  last_payment_date: string | null;
  last_payment_amount: number | null;
  next_payment_due_date: string | null;
  last_statement_balance: number | null;
  minimum_payment_amount: number | null;
  last_statement_issue_date: string | null;
}
