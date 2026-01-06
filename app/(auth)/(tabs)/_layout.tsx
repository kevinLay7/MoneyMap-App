import React, { useEffect } from 'react';
import { NativeTabs, Icon, Label } from 'expo-router/unstable-native-tabs';
import { useBackgroundTasks } from '@/hooks/use-background-tasks';
import { useDependency } from '@/context/dependencyContext';
import { CateogryService } from '@/services/category-service';
import database from '@/model/database';
import { Colors } from '@/constants/colors';

const TAB_ICON_COLOR = Colors.primary;

export default function TabLayout() {
  const { categoryApi } = useDependency();

  // Initialize background tasks when user is authenticated
  useBackgroundTasks();

  useEffect(() => {
    async function loadCategories() {
      if (categoryApi) {
        const categoryService = new CateogryService(categoryApi, database);

        await categoryService.loadCategoriesToDatabase();
      }
    }

    loadCategories();
  }, [categoryApi]);

  return (
    <NativeTabs
      blurEffect="systemUltraThinMaterial"
      backgroundColor={null}
      shadowColor="rgba(0, 0, 0, 0.2)"
      disableTransparentOnScrollEdge
    >
      <NativeTabs.Trigger name="index" options={{ iconColor: TAB_ICON_COLOR, selectedIconColor: TAB_ICON_COLOR }}>
        <Label hidden />
        <Icon sf={{ default: 'house', selected: 'house.fill' }} />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger
        name="budgets"
        options={{ iconColor: TAB_ICON_COLOR, selectedIconColor: TAB_ICON_COLOR }}
      >
        <Label hidden />
        <Icon
          sf={{
            default: 'map',
            selected: 'map.fill',
          }}
        />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger
        name="transactions"
        options={{ iconColor: TAB_ICON_COLOR, selectedIconColor: TAB_ICON_COLOR }}
      >
        <Label hidden />
        <Icon
          sf={{
            default: 'list.bullet.rectangle',
            selected: 'list.bullet.rectangle.fill',
          }}
        />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger
        name="recurring"
        options={{ iconColor: TAB_ICON_COLOR, selectedIconColor: TAB_ICON_COLOR }}
      >
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
