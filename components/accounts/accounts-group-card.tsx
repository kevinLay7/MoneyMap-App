import { View } from 'react-native';
import { Card } from '../ui/card';
import { ThemedText } from '../shared/themed-text';
import { FontAwesome6 } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { useDependency } from '@/context/dependencyContext';
import { create, LinkExit, LinkLogLevel, LinkSuccess, open } from 'react-native-plaid-link-sdk';
import { Button } from '../ui/button';
import { useState, useEffect, useMemo } from 'react';
import database from '@/model/database';
import Account from '@/model/models/account';
import { PlaidService } from '@/services/plaid-service';
import { useFilteredAccounts } from '@/hooks/use-filtered-accounts';
import { AccountGroupRow } from './account-group-row';

export function AccountsGroupCard() {
  const { plaidApi } = useDependency();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const subscription = database
      .get<Account>('accounts')
      .query()
      .observe()
      .subscribe(accounts => {
        setAccounts(accounts);
      });

    return () => subscription.unsubscribe();
  }, []);

  const { creditAccounts, checkingAccounts, savingsAccounts, loanAccounts, investmentAccounts } =
    useFilteredAccounts(accounts);

  const createLinkToken = async () => {
    try {
      const response = await plaidApi.plaidControllerCreateLinkToken();

      if (!response?.data) {
        console.error('No response received from Plaid API');
        return;
      }

      const linkToken = response.data?.linkToken || response.data;

      if (!linkToken || typeof linkToken !== 'string' || !linkToken.startsWith('link-')) {
        console.error('Invalid link token received:', response.data);
        return;
      }

      create({ token: linkToken, logLevel: LinkLogLevel.DEBUG });

      const plaidService = new PlaidService(plaidApi, database);

      open({
        onSuccess: async (success: LinkSuccess) => {
          await plaidService.handlePlaidLinkSuccess(success.publicToken);
        },
        onExit: (linkExit: LinkExit) => {
          if (linkExit.error) {
            console.error('Plaid Link exit error:', linkExit.error);
          }
        },
      });
    } catch (error) {
      console.error('Failed to create Plaid Link token:', error);
    }
  };

  const accountGroups = useMemo(
    () =>
      [
        {
          type: 'Checking',
          icon: '🏛️',
          accounts: checkingAccounts,
        },
        {
          type: 'Savings',
          icon: '💵',
          accounts: savingsAccounts,
        },
        {
          type: 'Credit Cards',
          icon: '💳',
          accounts: creditAccounts,
        },
        {
          type: 'Loans',
          icon: '📉',
          accounts: loanAccounts,
        },
        {
          type: 'Investments',
          icon: '📈',
          accounts: investmentAccounts,
        },
      ].filter(group => group.accounts.length > 0),
    [checkingAccounts, savingsAccounts, creditAccounts, loanAccounts, investmentAccounts]
  );

  return (
    <Card variant="elevated" rounded="xl" backgroundColor="secondary">
      <View className="flex-row justify-between items-center">
        <ThemedText type="subtitle">Accounts</ThemedText>

        <Button
          onPress={createLinkToken}
          title={<FontAwesome6 name="plus" size={18} color={Colors.dark.text} />}
          color="background"
          circular
          size="sm"
          hapticWeight="light"
        />
      </View>

      <View>
        {accounts.length === 0 ? (
          <View className="items-center py-4">
            <FontAwesome6 name="building-columns" size={36} color="white" className="mb-4" />
            <ThemedText className="mb-2">No accounts linked</ThemedText>
            <ThemedText type="subText" className="text-center">
              Connect your accounts to track your finances and get insights into your spending patterns.
            </ThemedText>
          </View>
        ) : (
          accountGroups.map((group, index) => (
            <AccountGroupRow
              key={index}
              group={group}
              isExpanded={expandedGroups[group.type] || false}
              onToggle={() => {
                setExpandedGroups(prev => ({
                  [group.type]: !prev[group.type],
                }));
              }}
            />
          ))
        )}
      </View>
    </Card>
  );
}
