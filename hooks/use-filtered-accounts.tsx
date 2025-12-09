import { useMemo } from "react";
import Account from "@/model/models/account";

/**
 * Filters the accounts based on the type and subType
 * @param accounts - The accounts to filter
 * @returns The filtered accounts
 */
export function useFilteredAccounts(accounts: Account[] | undefined) {
  return useMemo(
    () => ({
      creditAccounts: accounts?.filter((item) => item.type === "credit") ?? [],
      checkingAccounts:
        accounts?.filter(
          (item) => item.type === "depository" && item.subtype === "checking"
        ) ?? [],
      savingsAccounts:
        accounts?.filter(
          (item) =>
            item.subtype === "savings" ||
            (item.type === "depository" && item.subtype !== "checking")
        ) ?? [],
      loanAccounts: accounts?.filter((item) => item.type === "loan") ?? [],
      investmentAccounts:
        accounts?.filter((item) => item.type === "investment") ?? [],
    }),
    [accounts]
  );
}
