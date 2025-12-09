import { Pressable, View } from 'react-native';
import { ThemedText } from '../shared/themed-text';
import Account from '@/model/models/account';
import { useMoneyFormatter } from '@/hooks/format-money';
import IconCircle from '../ui/icon-circle';
import { useModelWithRelations } from '@/hooks/use-model-with-relations';
import Item from '@/model/models/item';

interface AccountRowProps {
  account: Account;
  onPress: () => void;
}

export function AccountRow({ account, onPress }: AccountRowProps) {
  const formatMoney = useMoneyFormatter();
  const { model: observedAccount, relations } = useModelWithRelations(account, ['item']);
  const item = relations.item as Item | undefined;

  const hasError = item?.status === 'ERROR';
  const institutionLogo = item?.institutionLogo ?? observedAccount.name[0];

  return (
    <View className="flex-row border-t-background-tertiary  h-16" style={{ borderTopWidth: 1 }}>
      <Pressable onPress={onPress} className="h-full w-full justify-center">
        <View className="w-full flex-row">
          <View className="w-2/12">
            <IconCircle input={institutionLogo} size={30} borderSize={1} />
          </View>
          <View className="w-5/12 flex-shrink">
            <View className="flex-col">
              <ThemedText type="defaultSemiBold" numberOfLines={1} ellipsizeMode="tail">
                {observedAccount.name}
              </ThemedText>
              <ThemedText type="subText" numberOfLines={1} ellipsizeMode="tail">
                {hasError
                  ? `Connection Error - ${item?.status}`
                  : (observedAccount.subtype?.toUpperCase().slice(0, 8) ?? '') + ' (...' + observedAccount.mask + ')'}
              </ThemedText>
            </View>
          </View>
          <View className="w-4/12 justify-end items-end space-x-2">
            <View className="flex-col">
              <ThemedText numberOfLines={1} className="font-semibold text-right">
                {formatMoney(observedAccount.balanceCurrent ?? 0)}
              </ThemedText>
              <ThemedText type="subText" className="text-typography-500 font-body text-right">
                {item?.lastSuccessfulUpdate ? `${item.calcTimeSinceLastSync()} ago` : 'Updating'}
              </ThemedText>
            </View>
          </View>
        </View>
      </Pressable>
    </View>
  );
}
