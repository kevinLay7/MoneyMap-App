import { useEffect } from 'react';
import { useDependency } from '@/context/dependencyContext';
import database from '@/model/database';
import { CateogryService } from '@/services/category-service';

export function useLoadCategories() {
  const { categoryApi } = useDependency();

  useEffect(() => {
    const categoryService = new CateogryService(categoryApi, database);

    async function fetchCategories() {
      await categoryService.loadCategoriesToDatabase();
    }
    fetchCategories();
  }, [categoryApi]);
}

