import { Colors } from '@/constants/colors';
import { BudgetItemDisplayStatus, BudgetItemTag, BudgetItemStatus, BudgetItemType } from '@/model/models/budget-item';

/**
 * Centralized budget item color and status logic
 * All functions for determining colors and statuses should be located here
 */

/**
 * Determines the color for a budget item based on its display status
 */
export const getBudgetItemStatusColor = (status: BudgetItemDisplayStatus): string => {
  switch (status) {
    case BudgetItemDisplayStatus.Income:
      return Colors.limeGreen;
    case BudgetItemDisplayStatus.Paid:
      return Colors.success;
    case BudgetItemDisplayStatus.Overdue:
      return Colors.error;
    case BudgetItemDisplayStatus.DueToday:
      return Colors.alert;
    case BudgetItemDisplayStatus.AutoPay:
      return Colors.secondary;
    case BudgetItemDisplayStatus.Upcoming:
    default:
      return Colors.tertiary;
  }
};

/**
 * Determines the color for a budget item tag
 */
export const getBudgetItemTagColor = (tag: BudgetItemTag): string => {
  switch (tag) {
    case BudgetItemTag.Pending:
      return Colors.pending;
    case BudgetItemTag.Overdue:
      return Colors.error;
    case BudgetItemTag.DueToday:
      return Colors.alert;
    case BudgetItemTag.AutoPay:
      return Colors.secondary;
    case BudgetItemTag.Paid:
      return Colors.success;
    case BudgetItemTag.Recurring:
      return Colors.tertiary;
    default:
      return Colors.tertiary;
  }
};

/**
 * Determines the progress bar color for category spending
 */
export const getBudgetItemProgressColor = (isOverBudget: boolean, spendingPercentage: number): string => {
  if (isOverBudget) {
    return Colors.error;
  }
  if (spendingPercentage > 55) {
    return Colors.warning;
  }
  return Colors.success;
};

/**
 * Determines the display status for a budget item based on its properties
 * Priority order: Income > Paid > Overdue > Due Today > Auto Pay > Upcoming
 */
export const determineBudgetItemDisplayStatus = (
  type: BudgetItemType,
  status: BudgetItemStatus,
  isOverdue: boolean,
  dueDate?: Date,
  isAutoPay?: boolean
): BudgetItemDisplayStatus => {
  if (type === BudgetItemType.Income) {
    return BudgetItemDisplayStatus.Income;
  }

  if (status === BudgetItemStatus.COMPLETED) {
    return BudgetItemDisplayStatus.Paid;
  }

  if (isOverdue) {
    return BudgetItemDisplayStatus.Overdue;
  }

  if (dueDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDateNormalized = new Date(dueDate);
    dueDateNormalized.setHours(0, 0, 0, 0);

    if (dueDateNormalized.getTime() === today.getTime()) {
      return BudgetItemDisplayStatus.DueToday;
    }
  }

  if (isAutoPay) {
    return BudgetItemDisplayStatus.AutoPay;
  }

  return BudgetItemDisplayStatus.Upcoming;
};

/**
 * Determines the tags for a budget item based on its properties
 * Multiple tags can apply to a single item
 */
export const determineBudgetItemTags = (
  status: BudgetItemStatus,
  isOverdue: boolean,
  dueDate?: Date,
  isAutoPay?: boolean
): BudgetItemTag[] => {
  const tags: BudgetItemTag[] = [];

  if (status === BudgetItemStatus.PENDING) {
    tags.push(BudgetItemTag.Pending);
  }

  if (isOverdue) {
    tags.push(BudgetItemTag.Overdue);
  }

  if (dueDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDateNormalized = new Date(dueDate);
    dueDateNormalized.setHours(0, 0, 0, 0);

    if (dueDateNormalized.getTime() === today.getTime()) {
      tags.push(BudgetItemTag.DueToday);
    }
  }

  if (isAutoPay) {
    tags.push(BudgetItemTag.AutoPay);
  }

  if (status === BudgetItemStatus.COMPLETED) {
    tags.push(BudgetItemTag.Paid);
  }

  return tags;
};

/**
 * Determines background color class for budget item rows
 */
export const getBudgetItemBackgroundColor = (isCompleted: boolean): string => {
  return isCompleted ? 'bg-background-secondary' : 'bg-background-tertiary';
};

/**
 * Determines color for budget summary indicators
 */
export const getBudgetSummaryColor = (
  isNegativeBalance: boolean
): {
  tintColor: string;
  colorName: string;
} => {
  return {
    tintColor: isNegativeBalance ? Colors.warning : Colors.success,
    colorName: isNegativeBalance ? 'warning' : 'success',
  };
};

/**
 * Button configuration for budget item actions based on status and type
 */
export interface ButtonConfig {
  label: string;
  icon: string;
  bgColor: string;
  status: BudgetItemStatus;
}

export const getBudgetItemActionButtons = (
  currentStatus: BudgetItemStatus,
  itemType: BudgetItemType
): ButtonConfig[] => {
  const buttonMap: Record<string, ButtonConfig[]> = {
    [`${BudgetItemStatus.ACTIVE}-${BudgetItemType.Expense}`]: [
      { label: 'Paid', icon: 'check', bgColor: 'bg-success', status: BudgetItemStatus.COMPLETED },
      { label: 'Pending', icon: 'clock', bgColor: 'bg-secondary', status: BudgetItemStatus.PENDING },
    ],
    [`${BudgetItemStatus.ACTIVE}-${BudgetItemType.Income}`]: [
      { label: 'Unpaid', icon: 'xmark', bgColor: 'bg-warning', status: BudgetItemStatus.ACTIVE },
    ],
    [`${BudgetItemStatus.PENDING}-${BudgetItemType.Expense}`]: [
      { label: 'Paid', icon: 'check', bgColor: 'bg-success', status: BudgetItemStatus.COMPLETED },
      { label: 'Active', icon: 'play', bgColor: 'bg-tertiary', status: BudgetItemStatus.ACTIVE },
    ],
    [`${BudgetItemStatus.PENDING}-${BudgetItemType.Income}`]: [
      { label: 'Paid', icon: 'check', bgColor: 'bg-success', status: BudgetItemStatus.COMPLETED },
    ],
    [`${BudgetItemStatus.COMPLETED}-${BudgetItemType.Expense}`]: [
      { label: 'Active', icon: 'play', bgColor: 'bg-tertiary', status: BudgetItemStatus.ACTIVE },
      { label: 'Pending', icon: 'clock', bgColor: 'bg-secondary', status: BudgetItemStatus.PENDING },
    ],
    [`${BudgetItemStatus.COMPLETED}-${BudgetItemType.Income}`]: [
      { label: 'Unpaid', icon: 'xmark', bgColor: 'bg-warning', status: BudgetItemStatus.ACTIVE },
    ],
  };

  const key = `${currentStatus}-${itemType}`;
  return buttonMap[key] || [];
};
