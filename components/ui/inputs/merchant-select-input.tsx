import { View } from 'react-native';
import { InputHeader } from './input-header';
import { withObservables } from '@nozbe/watermelondb/react';
import Merchant from '@/model/models/merchant';
import database from '@/model/database';
import { BaseInputProps } from './types';
import { ThemedText } from '@/components/shared';
import { Colors } from '@/constants/colors';
import RNPickerSelect from 'react-native-picker-select';
import { useMemo } from 'react';

interface MerchantSelectInputProps extends Partial<BaseInputProps> {
  selectedMerchantId: string | null;
  onChange: (merchantId: string | null) => void;
  disabled?: boolean;
  infoText?: string;
  noBorder?: boolean;
  placeholder?: string;
}

function MerchantSelectInputInternal({
  merchants,
  label = 'Merchant',
  icon = 'store',
  iconAlign,
  error,
  selectedMerchantId,
  onChange,
  disabled = false,
  infoText,
  noBorder = false,
  placeholder = 'Select a merchant',
  required = false,
}: Readonly<{ merchants: Merchant[] } & MerchantSelectInputProps>) {
  const items = useMemo(() => {
    if (!merchants) return [];
    return merchants
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(merchant => ({
        label: merchant.name,
        value: merchant.id,
      }));
  }, [merchants]);

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

  // Don't render if no merchants exist
  if (!merchants || merchants.length === 0) {
    return null;
  }

  const selectedMerchant = merchants.find(m => m.id === selectedMerchantId);
  const displayText = selectedMerchant ? selectedMerchant.name : placeholder;

  return (
    <View
      className={`h-16 py-2 border-b-2 border-background-tertiary items-center flex-row ${noBorder ? 'border-none' : ''}`}
    >
      <InputHeader
        icon={icon}
        label={label}
        iconAlign={iconAlign}
        infoText={infoText}
        disabled={disabled}
        required={required}
      />
      <View className="ml-auto">
        {disabled ? (
          <ThemedText className="text-typography-900 opacity-60">{displayText}</ThemedText>
        ) : (
          <RNPickerSelect
            onValueChange={onChange}
            items={items}
            value={selectedMerchantId}
            style={getPickerSelectStyles('dark')}
            placeholder={{ label: placeholder, value: null }}
            disabled={disabled}
            darkTheme={true}
            textInputProps={{ pointerEvents: 'none' }}
          />
        )}
      </View>
      {error && <ThemedText className="text-error">{error}</ThemedText>}
    </View>
  );
}

const enhancedMerchantSelectInput = withObservables([], () => ({
  merchants: database.get<Merchant>('merchants').query().observe(),
}));

export const MerchantSelectInput = enhancedMerchantSelectInput(MerchantSelectInputInternal);
