import React, { useEffect } from 'react';
import { Colors } from '@/constants/theme';
import { NativeTabs, Icon, Label } from 'expo-router/unstable-native-tabs';
import { useBackgroundTasks } from '@/hooks/use-background-tasks';
import { useDependency } from '@/context/dependencyContext';
import { CateogryService } from '@/services/category-service';
import database from '@/model/database';

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
