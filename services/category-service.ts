import { Categories } from '@/api/gen/Categories';
import { Database } from '@nozbe/watermelondb';
import Category from '@/model/models/category';

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
        const existingCategory = categoriesFromDatabase.find(c => c.name === category.name);

        console.log('existingCategory', existingCategory);
        console.log('category', category);
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
            await this.database.get<Category>('categories').create(record => {
              record.name = categoryData.name;
              record.primary = categoryData.primary;
              record.detailed = categoryData.detailed;
              record.description = categoryData.description;
              record.icon = categoryData.icon;
              record.color = categoryData.color;
              record.ignored = categoryData.ignored;
            });
          }
        });
      }
    } catch (error) {
      console.error('Error loading categories to database:', error);
      throw error;
    }
  }
}
