import { BudgetItemState } from '@/model/models/budget-item';

export const getBudgetItemIconInput = (item: BudgetItemState): string => {
  return item.merchant?.logoUrl ?? item.merchant?.name?.[0] ?? item.name?.[0] ?? '?';
};

export const getBudgetItemMerchantIconInput = (item: BudgetItemState): string => {
  if (!item.merchant) return '';
  return item.merchant.logoUrl ?? item.merchant.name?.[0] ?? '';
};
