import { Model } from "@nozbe/watermelondb";
import { date, field, readonly } from "@nozbe/watermelondb/decorators";

export default class Category extends Model {
  static table = "categories";

  @field("name") name!: string;
  @field("primary") primary!: string;
  @field("detailed") detailed!: string;
  @field("description") description!: string;
  @field("icon") icon?: string;
  @field("color") color?: string;
  @field("ignored") ignored!: boolean;
  @field("children") children?: string;

  @readonly @date("created_at") createdAt!: Date;
  @readonly @date("updated_at") updatedAt!: Date;
}
