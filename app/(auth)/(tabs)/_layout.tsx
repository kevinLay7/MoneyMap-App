import React, { useEffect } from 'react';
import { NativeTabs, Icon, Label } from 'expo-router/unstable-native-tabs';
import { useBackgroundTasks } from '@/hooks/use-background-tasks';
import { useDependency } from '@/context/dependencyContext';
import { CateogryService } from '@/services/category-service';
import database from '@/model/database';
import { Colors } from '@/constants/colors';

const TAB_COLORS = {
  home: Colors.primary,
  budgets: Colors.secondary,
  transactions: Colors.tertiary,
  recurring: Colors.quaternary,
} as const;

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
    <NativeTabs>
      <NativeTabs.Trigger name="index" options={{ iconColor: TAB_COLORS.home, selectedIconColor: TAB_COLORS.home }}>
        <Label hidden />
        <Icon sf={{ default: 'house', selected: 'house.fill' }} />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger
        name="budgets"
        options={{ iconColor: TAB_COLORS.budgets, selectedIconColor: TAB_COLORS.budgets }}
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
        options={{ iconColor: TAB_COLORS.transactions, selectedIconColor: TAB_COLORS.transactions }}
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
        options={{ iconColor: TAB_COLORS.recurring, selectedIconColor: TAB_COLORS.recurring }}
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
