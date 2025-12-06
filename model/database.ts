import { Database } from "@nozbe/watermelondb";
import SQLiteAdapter from "@nozbe/watermelondb/adapters/sqlite";
import { Platform } from "react-native";

import { schema } from "./schema";
import migrations from "./migrations";
import Account from "./models/account";
import Transaction from "./models/transaction";
import Item from "./models/item";
import Sync from "./models/sync";
import Category from "./models/category";
import TransactionSync from "./models/transaction-sync";

// First, create the adapter to the underlying database:
const adapter = new SQLiteAdapter({
  schema,
  // (You might want to comment it out for development purposes -- see Migrations documentation)
  migrations,
  // (optional database name or file system path)
  // dbName: 'myapp',
  // (recommended option, should work flawlessly out of the box on iOS. On Android,
  // additional installation steps have to be taken - disable if you run into issues...)
  // JSI enabled for better performance (requires native rebuild)
  jsi: Platform.OS === 'ios',
  // (optional, but you should implement this method)
  onSetUpError: (error) => {
    // Database failed to load -- offer the user to reload the app or log out
    console.error("Database setup error:", error);
  },
});

// Then, make a Watermelon database from it!
const database = new Database({
  adapter,
  modelClasses: [
    Account,
    Transaction,
    Item,
    Sync,
    Category,
    TransactionSync,
  ],
});

export default database;

