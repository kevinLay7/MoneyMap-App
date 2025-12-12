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

      for (const category of categoriesFromServer) {
        const existingCategory = categoriesFromDatabase.find(c => c.name === category.name);

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
          await this.database.write(async () => {
            await existingCategory.update(record => {
              record.name = category.name;
              record.primary = category.primary;
              record.detailed = category.detailed;
              record.description = category.description;
              record.icon = category.icon;
              record.color = category.color;
              record.ignored = category.ignored;
            });
          });

          continue;
        }

        await this.database.write(async () => {
          await this.database.get<Category>('categories').create(record => {
            record.name = category.name;
            record.primary = category.primary;
            record.detailed = category.detailed;
            record.description = category.description;
            record.icon = category.icon;
            record.color = category.color;
            record.ignored = category.ignored;
          });
        });
      }
    } catch (error) {
      console.error('Error loading categories to database:', error);
      throw error;
    }
  }
}
