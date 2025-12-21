import { Header } from '@/components/shared';
import { ThemedText } from '@/components/shared/themed-text';
import { BackgroundContainer } from '@/components/ui/background-container';
import { useAnimatedRef, useScrollOffset } from 'react-native-reanimated';
import AnimatedScrollView from '@/components/ui/animated-scrollview';
import { useCallback, useEffect, useMemo, useState } from 'react';
import database from '@/model/database';
import { Q } from '@nozbe/watermelondb';
import BudgetModel from '@/model/models/budget';
import { Card } from '@/components/ui/card';
import { DatePicker } from '@/components/ui/inputs/date-picker';
import { AccountBalanceSrouce, BudgetBalanceSource, BudgetDuration } from '@/types/budget';
import { SelectInput } from '@/components/ui/inputs/select-input';
import dayjs from 'dayjs';
import { Button } from '@/components/ui/button';
import { AccountSelectInput } from '@/components/ui/inputs/account-select-input';
import { CreateBudgetDto, BudgetService } from '@/services/budget-service';

export default function CreateBudget() {
  const animatedRef = useAnimatedRef<any>();
  const scrollOffset = useScrollOffset(animatedRef);
  const [previousBudget, setPreviousBudget] = useState<BudgetModel | null>(null);

  const [duration, setDuration] = useState<BudgetDuration | null>(null);
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(dayjs().add(1, 'day').toDate());
  const [balanceSource, setBalanceSource] = useState<BudgetBalanceSource | null>(null);
  const [accountBalanceSource, setAccountBalanceSource] = useState<AccountBalanceSrouce | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);

  useEffect(() => {
    const subscription = database
      .get('budgets')
      .query(Q.sortBy('created_at', Q.desc), Q.take(1))
      .observe()
      .subscribe(budgets => {
        const previousBudget = budgets[0] as BudgetModel;
        setStartDate(dayjs(previousBudget?.endDate).add(1, 'day').toDate());
        setPreviousBudget(previousBudget);
        setDuration(previousBudget?.duration);
        setBalanceSource(previousBudget?.balanceSource);
        setAccountBalanceSource(previousBudget?.accountBalanceSource);
        setSelectedAccountId(previousBudget?.accountId);
      });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!duration || !startDate) return;

    const durationMap = {
      [BudgetDuration.Weekly]: 7,
      [BudgetDuration.BiWeekly]: 14,
      [BudgetDuration.Monthly]: 30,
    };

    const endDate = dayjs(startDate)
      .add(durationMap[duration as BudgetDuration], 'day')
      .toDate();

    setEndDate(endDate);
  }, [duration, startDate]);

  const createBudget = useCallback(async () => {
    if (
      !balanceSource ||
      !startDate ||
      !endDate ||
      !balanceSource ||
      (balanceSource === BudgetBalanceSource.Account && !accountBalanceSource) ||
      !duration
    )
      return;

    const newBudgetDto: CreateBudgetDto = {
      startDate: startDate,
      endDate: endDate,
      balance: 0,
      balanceSource: balanceSource,
      accountBalanceSource: accountBalanceSource ?? AccountBalanceSrouce.Default,
      accountId: selectedAccountId ?? '',
      duration: duration!,
    };

    const budgetService = new BudgetService(database);
    await budgetService.createBudget(newBudgetDto);
  }, [startDate, endDate, balanceSource, accountBalanceSource, selectedAccountId, duration]);

  return (
    <BackgroundContainer>
      <Header
        scrollOffset={scrollOffset}
        centerComponent={<ThemedText type="subtitle">Create Budget</ThemedText>}
        leftIcon="arrow-left"
        noBackground
      />

      <AnimatedScrollView animatedRef={animatedRef} className="px-4">
        <Card variant="elevated" rounded="xl" backgroundColor="secondary" padding="lg">
          <ThemedText type="default" className="mb-4">
            Create a budget to track your income and expesnse. You will be able to add budget items later.
          </ThemedText>
          {previousBudget && (
            <ThemedText type="default" className="mb-4">
              Previous budget Period: {previousBudget.startDate?.toLocaleDateString()} -{' '}
              {previousBudget?.endDate?.toLocaleDateString()}
            </ThemedText>
          )}
        </Card>

        <Card variant="elevated" rounded="xl" backgroundColor="secondary" padding="lg" className="mt-4">
          <SelectInput
            icon="calendar"
            label="Duration"
            value={duration}
            onValueChange={value => setDuration(value as BudgetDuration)}
            items={Object.values(BudgetDuration).map(duration => ({
              label: duration.charAt(0).toUpperCase() + duration.slice(1),
              value: duration,
            }))}
          />
          <DatePicker icon="hourglass-start" label="Start Date" value={startDate} onChange={setStartDate} />
          <DatePicker icon="hourglass-end" label="End Date" value={endDate} onChange={setEndDate} disabled />
          <SelectInput
            icon="wallet"
            label="Balance Source"
            value={balanceSource}
            onValueChange={value => setBalanceSource(value as BudgetBalanceSource)}
            items={Object.values(BudgetBalanceSource).map(balanceSource => ({
              label: balanceSource.charAt(0).toUpperCase() + balanceSource.slice(1),
              value: balanceSource,
            }))}
          />
          {balanceSource === BudgetBalanceSource.Account && (
            <>
              <AccountSelectInput
                selectedAccountId={selectedAccountId}
                onChange={(accountId: string | null) => {
                  setSelectedAccountId(accountId);
                }}
              />

              <SelectInput
                icon="wallet"
                items={Object.values(AccountBalanceSrouce)
                  .filter(source => source !== AccountBalanceSrouce.Default)
                  .map(accountBalanceSource => ({
                    label: accountBalanceSource.charAt(0).toUpperCase() + accountBalanceSource.slice(1),
                    value: accountBalanceSource,
                  }))}
                label="Account Balance Source"
                value={accountBalanceSource}
                onValueChange={value => setAccountBalanceSource(value as AccountBalanceSrouce)}
              />
            </>
          )}

          <Button
            title="Create Budget"
            onPress={createBudget}
            disabled={
              !duration ||
              !startDate ||
              !endDate ||
              !balanceSource ||
              (balanceSource === BudgetBalanceSource.Account && !accountBalanceSource)
            }
          />
        </Card>
      </AnimatedScrollView>
    </BackgroundContainer>
  );
}
