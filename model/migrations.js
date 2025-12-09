import { schemaMigrations } from "@nozbe/watermelondb/Schema/migrations";

// No migrations needed for version 1 - tables are created directly from schema
export default schemaMigrations({
  migrations: [],
});
