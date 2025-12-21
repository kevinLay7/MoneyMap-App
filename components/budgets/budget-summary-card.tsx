import { Card } from '../ui/card';
import { AnimatedCircularProgress } from 'react-native-circular-progress';
import { Keyboard, Pressable, TextInput as RNTextInput, View } from 'react-native';
import { Colors } from '@/constants/colors';
import { ThemedText } from '../shared/themed-text';
import database from '@/model/database';
import { BudgetViewModel } from '@/model/view-models/budget.viewmodel';
import { useMoneyFormatter } from '@/hooks/format-money';
import Animated from 'react-native-reanimated';
import { BudgetBalanceSource } from '@/types/budget';
import { useCallback, useEffect, useState } from 'react';
import { useColorScheme } from '@/hooks/use-color-scheme';

export function BudgetSummaryCard({ budgetViewModel }: { readonly budgetViewModel: BudgetViewModel }) {
  const formatMoney = useMoneyFormatter();
  const theme = useColorScheme();

  const [showAccountOnlyExpenses, setShowAccountOnlyExpenses] = useState<boolean>(false);
  const [manualBalance, setManualBalance] = useState<number>(budgetViewModel.budget.balance);

  useEffect(() => {
    setManualBalance(budgetViewModel.budget.balance);
  }, [budgetViewModel]);

  const updateManualBalance = useCallback(
    (value: number) => {
      database.write(async () => {
        await budgetViewModel.budget.update(budget => {
          budget.balance = value;
        });
      });
    },
    [budgetViewModel.budget]
  );

  const isManualBalance = budgetViewModel.budget?.balanceSource === BudgetBalanceSource.Manual;
  const remainingBalance = budgetViewModel.getTotalRemaining(showAccountOnlyExpenses);
  const isNegativeBalance = remainingBalance <= 0;
  const formattedRemaining = formatMoney(remainingBalance);

  return (
    <Card variant="elevated" rounded="xl" backgroundColor="secondary" padding="lg" className="mb-4">
      <Pressable className="items-center">
        <AnimatedCircularProgress
          key={`${budgetViewModel.budget.id}-${showAccountOnlyExpenses}`}
          size={200}
          width={15}
          prefill={0}
          fill={(Math.abs(remainingBalance) / budgetViewModel.budget.balance) * 100}
          rotation={-100}
          lineCap="round"
          tintColor={isNegativeBalance ? Colors.warning : Colors.success}
          duration={2000}
          backgroundColor={Colors.warning}
          arcSweepAngle={200}
          style={{ position: 'relative', top: 0, left: 0, right: 0, bottom: 0 }}
          childrenContainerStyle={{ marginTop: -5 }}
          // eslint-disable-next-line react/no-children-prop
          children={() => (
            <View className="items-center">
              <ThemedText
                style={{
                  fontSize: formattedRemaining.length > 9 ? 20 : 28,
                  lineHeight: formattedRemaining.length > 9 ? 24 : 32,
                }}
                color={isNegativeBalance ? 'warning' : 'success'}
                className={` font-bold`}
              >
                {formattedRemaining}
              </ThemedText>
              <ThemedText type="defaultSemiBold" className="mt-1">
                Remaining
              </ThemedText>
            </View>
          )}
        />
      </Pressable>

      <Animated.View className="mt-[-60px]">
        <View key="balance-row" className="w-full flex-row">
          <View key="balance-section" className="w-1/2 items-center">
            <ThemedText type="defaultSemiBold">{isManualBalance ? 'Total Balance' : 'Account Balance'}</ThemedText>
            {isManualBalance ? (
              <RNTextInput
                keyboardType="number-pad"
                value={formatMoney(manualBalance)}
                onChangeText={text => {
                  const digits = text.replaceAll(/\D/g, '');
                  const cents = Number.parseInt(digits || '0', 10);
                  setManualBalance(cents / 100);
                }}
                style={{
                  fontSize: 18,
                  fontWeight: 'bold',
                  color: theme === 'dark' ? Colors.dark.text : Colors.light.text,
                  borderBottomWidth: 1,
                  borderBottomColor: Colors.secondary,
                }}
                placeholder="Enter total balance"
                placeholderTextColor={theme === 'dark' ? Colors.dark.textSecondary : Colors.light.textSecondary}
                inputMode="decimal"
                maxLength={15}
                returnKeyType="done"
                returnKeyLabel="done"
                onBlur={() => {
                  updateManualBalance(manualBalance);
                }}
                onSubmitEditing={() => {
                  updateManualBalance(manualBalance);
                  Keyboard.dismiss();
                }}
              />
            ) : (
              <ThemedText type="subtitle" color={isNegativeBalance ? 'warning' : 'success'}>
                {formatMoney(budgetViewModel.budget.balance ?? 0)}
              </ThemedText>
            )}
          </View>
          <View key="expenses" className="w-1/2 items-center">
            <Pressable
              onPress={() => {
                setShowAccountOnlyExpenses(!showAccountOnlyExpenses);
              }}
            >
              <View className="items-center">
                <ThemedText type="defaultSemiBold">
                  {showAccountOnlyExpenses ? 'Account Expenses' : 'Remaining Expenses'}
                </ThemedText>
                <ThemedText type="subtitle" color="warning">
                  {formatMoney(budgetViewModel.budget.balance - (remainingBalance ?? 0))}
                </ThemedText>
              </View>
            </Pressable>
          </View>
        </View>
      </Animated.View>
    </Card>
  );
}
