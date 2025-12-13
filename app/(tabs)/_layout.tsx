import React from 'react';
import { Colors } from '@/constants/theme';
import { NativeTabs, Icon, Label } from 'expo-router/unstable-native-tabs';

export default function TabLayout() {
  return (
    <NativeTabs tintColor={Colors.primary}>
      <NativeTabs.Trigger name="index">
        <Label hidden />
        <Icon sf={{ default: 'house', selected: 'house.fill' }} />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="transactions">
        <Label hidden />
        <Icon
          sf={{
            default: 'list.bullet.rectangle',
            selected: 'list.bullet.rectangle.fill',
          }}
        />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="budgets">
        <Label hidden />
        <Icon
          sf={{
            default: 'map',
            selected: 'map.fill',
          }}
        />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="recurring">
        <Label hidden />
        <Icon
          sf={{
            default: 'calendar',
            selected: 'calendar',
          }}
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
