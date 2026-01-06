import { useQuery } from '@tanstack/react-query';
import { useDependency } from '@/context/dependencyContext';
import { CateogryService } from '@/services/category-service';
import database from '@/model/database';

export function useLoadCategories() {
  const { categoryApi } = useDependency();

  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      if (!categoryApi) {
        return null;
      }
      const categoryService = new CateogryService(categoryApi, database);
      await categoryService.loadCategoriesToDatabase();
      return null;
    },
    enabled: !!categoryApi,
    staleTime: Infinity, // Categories are static, so they don't need to be refetched
  });
}
