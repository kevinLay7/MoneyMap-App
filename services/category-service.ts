import { Categories } from '@/api/gen/Categories';
import { Database } from '@nozbe/watermelondb';
import Category from '@/model/models/category';
import { logger } from '@/services/logging-service';
import { LogType } from '@/types/logging';

export class CateogryService {
  constructor(
    private categoryApi: Categories,
    private database: Database
  ) {}

  async fetchCategories() {
    return this.database.get<Category>('categories').query().fetch();
  }

  async clearCategoriesFromDatabase() {
    await this.database.write(async () => {
      await this.database
        .get<Category>('categories')
        .query()
        .fetch()
        .then(categories => categories.map(category => category.destroyPermanently()));
    });
  }

  async loadCategoriesToDatabase() {
    try {
      const categoriesFromServer = (await this.categoryApi.categoriesControllerFindAll()).data;

      const categoriesFromDatabase = await this.fetchCategories();

      if (categoriesFromDatabase.length >= categoriesFromServer.length) {
        return;
      }

      const categoriesToUpdate: { category: Category; data: (typeof categoriesFromServer)[0] }[] = [];
      const categoriesToCreate: (typeof categoriesFromServer)[0][] = [];

      for (const category of categoriesFromServer) {
        const existingCategory = categoriesFromDatabase.find(c => c.id === 'sys_' + category.id);

        if (
          existingCategory &&
          existingCategory.primary === category.primary &&
          existingCategory.detailed === category.detailed &&
          existingCategory.description === category.description &&
          existingCategory.icon === category.icon &&
          existingCategory.color === category.color &&
          existingCategory.ignored === category.ignored
        ) {
          continue;
        }

        if (existingCategory) {
          categoriesToUpdate.push({ category: existingCategory, data: category });
        } else {
          categoriesToCreate.push(category);
        }
      }

      // Batch all updates and creates in a single write operation
      if (categoriesToUpdate.length > 0 || categoriesToCreate.length > 0) {
        await this.database.write(async () => {
          // Update existing categories
          for (const { category, data } of categoriesToUpdate) {
            await category.update(record => {
              record.name = data.name;
              record.primary = data.primary;
              record.detailed = data.detailed;
              record.description = data.description;
              record.icon = data.icon;
              record.color = data.color;
              record.ignored = data.ignored;
            });
          }

          // Create new categories
          for (const categoryData of categoriesToCreate) {
            const category = this.database.get<Category>('categories').prepareCreateFromDirtyRaw({
              id: 'sys_' + categoryData.id,
              name: categoryData.name,
              primary: categoryData.primary,
              detailed: categoryData.detailed,
              description: categoryData.description,
              icon: categoryData.icon || null,
              color: categoryData.color || null,
              ignored: categoryData.ignored,
              children: categoryData.children || null,
              created_at: Date.now(),
              updated_at: Date.now(),
            });

            await this.database.batch([category]);
          }
        });
      }
    } catch (error) {
      logger.error(LogType.Database, 'Error loading categories to database', { error });
      throw error;
    }
  }
}
