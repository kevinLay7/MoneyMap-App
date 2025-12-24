import { Header, ThemedText } from '@/components/shared';
import AnimatedScrollView from '@/components/ui/animated-scrollview';
import { BackgroundContainer } from '@/components/ui/background-container';
import { Card } from '@/components/ui/card';
import IconCircle from '@/components/ui/icon-circle';
import { Colors } from '@/constants/colors';
import { useModelWithRelations } from '@/hooks/use-model-with-relations';
import { useObservable } from '@/hooks/use-observable';
import database from '@/model/database';
import Account from '@/model/models/account';
import { useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { View } from 'react-native';
import { useAnimatedRef, useScrollOffset } from 'react-native-reanimated';

export default function AccountDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const animatedRef = useAnimatedRef<any>();
  const scrollOffset = useScrollOffset(animatedRef);

  const accountObservable = useMemo(() => (id ? database.get<Account>('accounts').findAndObserve(id) : null), [id]);
  const account = useObservable(accountObservable);

  if (!account) {
    return (
      <BackgroundContainer>
        <Header
          leftIcon="arrow-left"
          scrollOffset={scrollOffset}
          backgroundHex={Colors.quaternary}
          centerComponent={<ThemedText type="subtitle">Loading...</ThemedText>}
        />
      </BackgroundContainer>
    );
  }

  return <AccountDetailsContent account={account} />;
}

function AccountDetailsContent({ account }: { account: Account }) {
  const animatedRef = useAnimatedRef<any>();
  const scrollOffset = useScrollOffset(animatedRef);

  const { model: observedAccount, relations } = useModelWithRelations(account, ['item'] as const);
  const item = relations.item;

  return (
    <BackgroundContainer>
      <Header
        leftIcon="arrow-left"
        scrollOffset={scrollOffset}
        backgroundHex={Colors.quaternary}
        centerComponent={
          <View className="flex-row items-center">
            <IconCircle input={item?.institutionLogo ?? account?.name?.[0] ?? ''} color="white" size={28} />
            <ThemedText type="subtitle" className="font-semibold text-typography-900 ml-1">
              {account?.name}
            </ThemedText>
          </View>
        }
      />

      <AnimatedScrollView animatedRef={animatedRef}>
        <View className="p-4">
          <Card padding="lg" rounded="lg" backgroundColor="secondary">
            <ThemedText type="subtitle" className="mb-4">
              {observedAccount.officialName}
            </ThemedText>
            <View className="flex-row items-center my-2">
              <ThemedText type="defaultSemiBold">Current Balance</ThemedText>
              <ThemedText type="default" className="ml-auto">
                ${observedAccount.balanceCurrent?.toFixed(2)}
              </ThemedText>
            </View>

            <View className="flex-row items-center my-2">
              <ThemedText type="defaultSemiBold">Available Balance</ThemedText>
              <ThemedText type="default" className="ml-auto">
                ${observedAccount.balanceAvailable?.toFixed(2)}
              </ThemedText>
            </View>

            <View className="flex-row items-center my-2">
              <ThemedText type="defaultSemiBold">Type</ThemedText>
              <ThemedText type="default" className="ml-auto">
                {observedAccount.subtype}
              </ThemedText>
            </View>

            <View className="flex-row items-center my-2">
              <ThemedText type="defaultSemiBold">Last Synced</ThemedText>
              <ThemedText type="default" className="ml-auto">
                {item?.lastSuccessfulUpdate ? `${item.calcTimeSinceLastSync()} ago` : 'Updating'}
              </ThemedText>
            </View>
          </Card>
        </View>
      </AnimatedScrollView>
    </BackgroundContainer>
  );
}
