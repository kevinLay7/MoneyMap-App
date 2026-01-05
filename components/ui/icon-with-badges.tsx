import React from 'react';
import { View, StyleSheet } from 'react-native';
import { FontAwesome6 } from '@expo/vector-icons';
import IconCircle from './icon-circle';
import { BudgetItemTag } from '@/model/models/budget-item';
import { getBudgetItemTagColor } from '@/utils/budget-item-colors';

interface IconWithBadgesProps {
  readonly input: string;
  readonly size?: number;
  readonly backgroundColor?: string;
  readonly color?: string;
  readonly borderSize?: number;
  readonly borderColor?: string;
  readonly tags: BudgetItemTag[];
}

const getTagIcon = (tag: BudgetItemTag): string => {
  switch (tag) {
    case BudgetItemTag.Pending:
      return 'hourglass-half';
    case BudgetItemTag.Overdue:
      return 'exclamation';
    case BudgetItemTag.DueToday:
      return 'clock';
    case BudgetItemTag.AutoPay:
      return 'repeat';
    case BudgetItemTag.Paid:
      return 'check';
    case BudgetItemTag.Recurring:
      return 'arrows-rotate';
    default:
      return 'circle';
  }
};

const getTagPriority = (tag: BudgetItemTag): number => {
  // Higher priority = shown first/on top
  switch (tag) {
    case BudgetItemTag.Pending:
      return 6;
    case BudgetItemTag.Overdue:
      return 5;
    case BudgetItemTag.DueToday:
      return 4;
    case BudgetItemTag.Paid:
      return 3;
    case BudgetItemTag.AutoPay:
      return 2;
    case BudgetItemTag.Recurring:
      return 1;
    default:
      return 0;
  }
};

export function IconWithBadges({
  input,
  size = 36,
  backgroundColor,
  color,
  borderSize,
  borderColor,
  tags,
}: IconWithBadgesProps) {
  // Sort tags by priority (highest first) and get only the highest priority tag
  const highestPriorityTag = [...tags].sort((a, b) => getTagPriority(b) - getTagPriority(a))[0];

  const badgeSize = Math.max(20, size * 0.5);
  const iconSize = badgeSize * 0.5;
  const badgeOffset = size * 0.15;

  return (
    <View style={styles.container}>
      <IconCircle
        input={input}
        size={size}
        backgroundColor={backgroundColor}
        color={color}
        borderSize={borderSize}
        borderColor={borderColor}
      />
      {highestPriorityTag && (
        <View
          style={[
            styles.badge,
            {
              width: badgeSize,
              height: badgeSize,
              borderRadius: badgeSize / 2,
              backgroundColor: getBudgetItemTagColor(highestPriorityTag),
              borderWidth: 1,
              top: -badgeOffset,
              right: -badgeOffset,
            },
          ]}
        >
          <FontAwesome6 name={getTagIcon(highestPriorityTag) as any} size={iconSize} color="white" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
