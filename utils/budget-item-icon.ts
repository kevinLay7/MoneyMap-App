import { BudgetItemState } from '@/model/models/budget-item';

export const getBudgetItemIconInput = (item: BudgetItemState): string => {
  if (item.isCategory && item.category?.icon) {
    return item.category.icon;
  }
  return item.merchant?.logoUrl ?? item.merchant?.name?.[0] ?? item.name?.[0] ?? '?';
};

export const getBudgetItemMerchantIconInput = (item: BudgetItemState): string => {
  if (item.isCategory && item.category?.icon) {
    return item.category.icon;
  }
  if (!item.merchant) return '';
  return item.merchant.logoUrl ?? item.merchant.name?.[0] ?? '';
};
