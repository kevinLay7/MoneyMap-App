/**
 * Script to clean up duplicate accounts in the database.
 * Run this with: npx ts-node scripts/cleanup-duplicate-accounts.ts
 *
 * This script finds accounts with duplicate account_id values and keeps only
 * the most recently updated record, deleting the rest.
 */

import database from '../model/database';
import Account from '../model/models/account';
import { Q } from '@nozbe/watermelondb';

async function cleanupDuplicateAccounts() {
  console.log('Starting duplicate account cleanup...');

  const allAccounts = await database.get<Account>('accounts').query().fetch();
  console.log(`Total accounts in database: ${allAccounts.length}`);

  // Group accounts by account_id
  const accountsByAccountId = allAccounts.reduce<Record<string, Account[]>>((acc, account) => {
    const key = account.accountId;
    acc[key] = acc[key] ? [...acc[key], account] : [account];
    return acc;
  }, {});

  let duplicatesFound = 0;
  let duplicatesRemoved = 0;

  // Find and fix duplicates
  await database.write(async () => {
    for (const [accountId, accounts] of Object.entries(accountsByAccountId)) {
      if (accounts.length > 1) {
        duplicatesFound += accounts.length - 1;
        console.log(`\nFound ${accounts.length} duplicates for account_id: ${accountId}`);
        accounts.forEach((acc, idx) => {
          console.log(`  ${idx + 1}. WatermelonDB ID: ${acc.id}, Name: ${acc.name}, Mask: ${acc.mask}, Updated: ${acc.updatedAt.toISOString()}`);
        });

        // Keep the most recently updated account
        const sortedAccounts = [...accounts].sort((a, b) =>
          b.updatedAt.getTime() - a.updatedAt.getTime()
        );
        const keepAccount = sortedAccounts[0];
        const deleteAccounts = sortedAccounts.slice(1);

        console.log(`  Keeping: ${keepAccount.id} (${keepAccount.name})`);

        for (const account of deleteAccounts) {
          console.log(`  Deleting: ${account.id} (${account.name})`);
          await account.destroyPermanently();
          duplicatesRemoved++;
        }
      }
    }
  });

  console.log(`\n✅ Cleanup complete!`);
  console.log(`   Duplicates found: ${duplicatesFound}`);
  console.log(`   Duplicates removed: ${duplicatesRemoved}`);
  console.log(`   Accounts remaining: ${allAccounts.length - duplicatesRemoved}`);
}

cleanupDuplicateAccounts()
  .then(() => {
    console.log('\nDone!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error cleaning up duplicates:', error);
    process.exit(1);
  });
