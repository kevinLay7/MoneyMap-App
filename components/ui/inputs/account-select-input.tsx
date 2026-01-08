import { InputRow } from './base-input';
import { withObservables } from '@nozbe/watermelondb/react';
import Account from '@/model/models/account';
import database from '@/model/database';
import { BaseInputProps } from './types';
import { ThemedText } from '@/components/shared';
import { Colors } from '@/constants/colors';
import RNPickerSelect from 'react-native-picker-select';
import { useMemo } from 'react';

interface AccountSelectInputProps extends BaseInputProps {
  selectedAccountId: string | null;
  onChange: (accountId: string | null) => void;
  disabled?: boolean;
  infoText?: string;
  noBorder?: boolean;
}

function AccountSelectInputInternal({
  accounts,
  label = 'Account',
  icon = 'wallet',
  iconAlign,
  error,
  selectedAccountId,
  onChange,
  disabled = false,
  infoText,
  noBorder = false,
  required = false,
}: Readonly<{ accounts: Account[] } & AccountSelectInputProps>) {
  // Memoize the processed accounts to prevent unnecessary re-renders
  const items = useMemo(() => {
    if (!accounts) return [];
    return accounts.map(account => ({
      label: `${account.name} (...${account.mask})`,
      value: account.id,
    }));
  }, [accounts]);

  const getPickerSelectStyles = (theme: string) => ({
    inputIOS: {
      fontSize: 16,
      color: theme === 'light' ? Colors.light.text : Colors.dark.text,
      fontWeight: '500' as const,
      opacity: disabled ? 0.6 : 1,
    },
    inputAndroid: {
      fontSize: 16,
      paddingHorizontal: 10,
      paddingVertical: 8,
      color: theme === 'light' ? Colors.light.text : Colors.dark.text,
      paddingRight: 30,
      fontWeight: '500' as const,
      opacity: disabled ? 0.6 : 1,
    },
  });

  const selectedAccount = accounts?.find(a => a.id === selectedAccountId);

  const displayText = selectedAccount ? `${selectedAccount.name} (...${selectedAccount.mask})` : 'Select an account';

  return (
    <InputRow
      icon={icon}
      label={label}
      iconAlign={iconAlign}
      infoText={infoText}
      disabled={disabled}
      required={required}
      error={error}
      noBorder={noBorder}
    >
      {disabled ? (
        <ThemedText className="text-typography-900 opacity-60">{displayText}</ThemedText>
      ) : (
        <RNPickerSelect
          onValueChange={onChange}
          items={items}
          value={selectedAccountId}
          style={getPickerSelectStyles('dark')}
          placeholder={{ label: 'Select an account', value: null }}
          disabled={disabled}
          darkTheme={true}
          textInputProps={{ pointerEvents: 'none' }}
        />
      )}
    </InputRow>
  );
}

// If props aren't used in the query, keep the empty array:
const enchancedAccountSelectInput = withObservables([], () => ({
  accounts: database.get<Account>('accounts').query().observe(),
}));

export const AccountSelectInput = enchancedAccountSelectInput(AccountSelectInputInternal);
