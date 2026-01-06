export enum BudgetItemType {
  Income = 'income',
  Expense = 'expense',
  BalanceTracking = 'balance_tracking',
  Category = 'category',
}

export enum BudgetItemStatus {
  ACTIVE = 'ACTIVE',
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  CANCELED = 'CANCELED',
}

export enum BalanceTrackingMode {
  Delta = 'delta',
  Absolute = 'absolute',
}

export enum BudgetItemDisplayStatus {
  Income = 'INCOME',
  Paid = 'PAID',
  Overdue = 'OVERDUE',
  DueToday = 'DUE_TODAY',
  AutoPay = 'AUTO_PAY',
  Upcoming = 'UPCOMING',
}

export enum BudgetItemTag {
  Pending = 'pending',
  Overdue = 'overdue',
  DueToday = 'due today',
  AutoPay = 'Auto pay',
  Paid = 'Paid',
  Recurring = 'Recurring',
}
