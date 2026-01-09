import { View } from 'react-native';
import { Card } from '../../ui/card';
import { ThemedText } from '../../shared/themed-text';
import { FontAwesome6 } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { useDependency } from '@/context/dependencyContext';
import { create, LinkExit, LinkLogLevel, LinkSuccess, open } from 'react-native-plaid-link-sdk';
import { ContentType } from '@/api/gen/http-client';
import { Button } from '../../ui/button';
import { LoadingOverlay } from '../../ui/loading-overlay';
import { useState, useEffect, useMemo } from 'react';
import database from '@/model/database';
import Account from '@/model/models/account';
import Item from '@/model/models/item';
import { PlaidService } from '@/services/plaid-service';
import { useFilteredAccounts } from '@/hooks/use-filtered-accounts';
import { AccountGroupRow } from './account-group-row';
import { AddAccountModal } from './add-account-modal';
import { logger } from '@/services/logging-service';
import { LogType } from '@/types/logging';

interface AccountsGroupCardProps {
  readonly title?: string;
}

export function AccountsGroupCard({ title = 'Accounts' }: AccountsGroupCardProps) {
  const { plaidApi } = useDependency();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [showAddAccountModal, setShowAddAccountModal] = useState(false);
  const [isLinkingAccount, setIsLinkingAccount] = useState(false);

  useEffect(() => {
    const accountsSubscription = database
      .get<Account>('accounts')
      .query()
      .observe()
      .subscribe(accounts => {
        setAccounts(accounts);
      });

    const itemsSubscription = database
      .get<Item>('items')
      .query()
      .observe()
      .subscribe(items => {
        setItems(items);
      });

    return () => {
      accountsSubscription.unsubscribe();
      itemsSubscription.unsubscribe();
    };
  }, []);

  const { creditAccounts, checkingAccounts, savingsAccounts, loanAccounts, investmentAccounts } =
    useFilteredAccounts(accounts);

  const handleAddAccount = () => {
    if (items.length > 0) {
      setShowAddAccountModal(true);
    } else {
      createLinkToken();
    }
  };

  const createLinkToken = async (plaidItemId?: string) => {
    try {
      const response = await plaidApi.plaidControllerCreateLinkToken(
        plaidItemId
          ? ({
              body: { plaidItemId },
              type: ContentType.Json,
            } as any)
          : {}
      );

      if (!response?.data) {
        logger.error(LogType.Plaid, 'No response received from Plaid API');
        return;
      }

      const linkToken = response.data?.linkToken || response.data;

      if (!linkToken || typeof linkToken !== 'string' || !linkToken.startsWith('link-')) {
        logger.error(LogType.Plaid, 'Invalid link token received', { response: response.data });
        return;
      }

      create({ token: linkToken, logLevel: LinkLogLevel.DEBUG });

      const plaidService = new PlaidService(plaidApi, database);

      open({
        onSuccess: async (success: LinkSuccess) => {
          setIsLinkingAccount(true);
          try {
            await plaidService.handlePlaidLinkSuccess(
              success.publicToken,
              success.metadata.institution?.id ?? '',
              plaidItemId
            );
          } finally {
            setIsLinkingAccount(false);
          }
        },
        onExit: (linkExit: LinkExit) => {
          if (linkExit.error) {
            logger.error(LogType.Plaid, 'Plaid Link exit error', { error: linkExit.error });
          }
        },
      });
    } catch (error) {
      logger.error(LogType.Plaid, 'Failed to create Plaid Link token', { error });
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
      <LoadingOverlay visible={isLinkingAccount} />
      <AddAccountModal
        isVisible={showAddAccountModal}
        onClose={() => setShowAddAccountModal(false)}
        items={items}
        onSelectItem={item => createLinkToken(item.plaidItemId)}
        onAddNew={() => createLinkToken()}
      />

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

        <View className="flex-row items-center">
          <View className="w-1/2 ml-auto mr-auto">
            <Button
              title=" Add Account"
              color="negative"
              size="sm"
              iconLeft={<FontAwesome6 name="plus" size={14} color={Colors.dark.text} />}
              onPress={handleAddAccount}
            />
          </View>
        </View>
      </View>
    </Card>
  );
}
