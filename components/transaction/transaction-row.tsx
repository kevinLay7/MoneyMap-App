import React, { useMemo } from 'react';
import { View, Pressable } from 'react-native';
import { ThemedText } from '@/components/shared';
import IconCircle from '@/components/ui/icon-circle';
import { useMoneyFormatter } from '@/hooks/format-money';
import { withObservables } from '@nozbe/watermelondb/react';
import { switchMap } from 'rxjs/operators';
import { of } from 'rxjs';
import Transaction from '@/model/models/transaction';
import Account from '@/model/models/account';
import Category from '@/model/models/category';
import Item from '@/model/models/item';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import { FontAwesome6 } from '@expo/vector-icons';

export interface TransactionRowProps {
  readonly transaction: Transaction;
  readonly category?: Category;
  readonly account?: Account;
  readonly item?: Item;
}

function RightAction() {
  return (
    <View className="bg-warning w-20 h-full items-center justify-center">
      <FontAwesome6 name="check" size={24} color="white" />
      <ThemedText type="default">Cleared</ThemedText>
    </View>
  );
}

export function TransactionRow({ transaction, category, account, item }: TransactionRowProps) {
  const formatMoney = useMoneyFormatter();

  const isNegative = transaction.amount < 0;
  const amountColor = isNegative ? 'text-red-500' : 'text-green-500';

  const icon = useMemo(() => {
    return (
      transaction.logoUrl ??
      item?.institutionLogo ??
      category?.icon ??
      transaction.merchantName?.[0] ??
      transaction.name[0] ??
      '?'
    );
  }, [transaction, item, category]);

  return (
    <ReanimatedSwipeable
      overshootRight={false}
      friction={2}
      enableTrackpadTwoFingerGesture
      rightThreshold={40}
      renderRightActions={RightAction}
    >
      <Pressable
        className="flex-row bg-background-tertiary border-t-background-secondary h-16"
        style={{ borderTopWidth: 1 }}
      >
        <View className="w-full flex-row items-center px-3">
          <View className="mr-3">
            <IconCircle input={icon} size={32} borderSize={1} />
          </View>
          <View className="flex-1 flex-col justify-center mr-2">
            <ThemedText type="defaultSemiBold" numberOfLines={1} ellipsizeMode="tail">
              {transaction.name}
            </ThemedText>
            <ThemedText type="subText" numberOfLines={1} ellipsizeMode="tail">
              {category?.name ?? 'Uncategorized'}
              {transaction.pending && ' • Pending'}
            </ThemedText>
          </View>
          <View className="items-end">
            <ThemedText type="defaultSemiBold" className={amountColor}>
              {formatMoney(transaction.amount)}
            </ThemedText>
            {account && (
              <ThemedText type="subText" numberOfLines={1} ellipsizeMode="tail">
                {account.name}
              </ThemedText>
            )}
          </View>
        </View>
      </Pressable>
    </ReanimatedSwipeable>
  );
}

const enhancedTransactionRow = withObservables(['transaction'], ({ transaction }: { transaction: Transaction }) => ({
  transaction,
  category: transaction.category,
  account: transaction.account,
  item: transaction.account.observe().pipe(switchMap(account => (account ? account.item.observe() : of(undefined)))),
}));

export const EnhancedTransactionRow = enhancedTransactionRow(TransactionRow);
