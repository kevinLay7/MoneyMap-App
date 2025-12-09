import Animated, { interpolate, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import IconCircle from '../ui/icon-circle';
import { useNavigation } from '@react-navigation/native';
import { useMoneyFormatter } from '@/hooks/format-money';
import { ThemedText } from '../shared/themed-text';
import { View, Pressable } from 'react-native';
import { Fragment, useState, useEffect } from 'react';
import { FontAwesome6 } from '@expo/vector-icons';
import Account from '@/model/models/account';
import { AccountRow } from './account-row';

export function AccountGroupRow({
  group,
  isExpanded,
  onToggle,
}: {
  group: { type: string; icon: string; accounts: Account[] };
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const formatMoney = useMoneyFormatter();
  const navigation = useNavigation();
  const [contentHeight, setContentHeight] = useState(0);
  const totalBalance = group.accounts.reduce((acc, item) => acc + (item.balanceCurrent ?? 0), 0);
  const rotateAnimation = useSharedValue(0);

  const chevronStyle = useAnimatedStyle(() => {
    const rotation = interpolate(rotateAnimation.value, [0, 1], [0, 180]);
    return {
      transform: [{ rotate: `${rotation}deg` }],
    };
  });

  const height = useSharedValue(0);

  useEffect(() => {
    // Update rotation value when expanded state changes
    rotateAnimation.value = withTiming(isExpanded ? 1 : 0, {
      duration: 300,
    });
    // animate the height of the component
    height.value = withTiming(isExpanded ? contentHeight : 0, {
      duration: 500,
    });
  }, [isExpanded, contentHeight, rotateAnimation, height]);

  const animatedStyles = useAnimatedStyle(() => {
    return {
      height: height.value,
    };
  });

  return (
    <Fragment key={group.type}>
      <Pressable onPress={onToggle}>
        <View className="flex-row h-16 items-center">
          <View className="items-start px-3 justify-center">
            <IconCircle input={group.icon} size={30} borderSize={0} backgroundColor="transparent" />
          </View>
          <View className="w-5/12 items-start justify-center">
            <ThemedText type="defaultSemiBold">{group.type}</ThemedText>
          </View>
          <View className="w-4/12 justify-end items-end space-x-2">
            <ThemedText type="defaultBold">{formatMoney(totalBalance ?? 0)}</ThemedText>
          </View>
          <View className="w-1/12 items-end justify-end px-2">
            <Animated.View style={chevronStyle}>
              <FontAwesome6 name="chevron-down" size={16} color="gray" className="" />
            </Animated.View>
          </View>
        </View>

        <Animated.View
          className="w-full overflow-hidden"
          style={{
            ...animatedStyles,
          }}
        >
          <View className="absolute w-full bg-myColors-Colors-dark-backgroundTertiary">
            <View
              onLayout={event => {
                const { height } = event.nativeEvent.layout;
                setContentHeight(height);
              }}
            >
              {group.accounts.map(account => (
                <AccountRow key={account.id} account={account} onPress={() => {}} />
              ))}
            </View>
          </View>
        </Animated.View>
      </Pressable>
    </Fragment>
  );
}
