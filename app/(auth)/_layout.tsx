import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { useDependency } from '@/context/dependencyContext';
import { CateogryService } from '@/services/category-service';
import database from '@/model/database';

export default function AuthLayout() {
  const { categoryApi } = useDependency();

  useEffect(() => {
    async function loadCategories() {
      if (categoryApi) {
        const categoryService = new CateogryService(categoryApi, database);
        await categoryService.loadCategoriesToDatabase();
      }
    }

    loadCategories();
  }, []);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="create-budget" options={{ headerShown: false }} />
      {__DEV__ && <Stack.Screen name="debug-data" options={{ headerShown: false }} />}
    </Stack>
  );
}
