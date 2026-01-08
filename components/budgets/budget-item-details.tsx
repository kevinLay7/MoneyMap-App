import { View } from 'react-native';
import { ThemedText } from '@/components/shared';
import { SwitchInput } from '@/components/ui/inputs/switch-input';
import { TextInput } from '@/components/ui/inputs/text-input';
import { BudgetItemState } from '@/model/models/budget-item';

interface DetailsSectionProps {
  readonly budgetItemState: BudgetItemState;
  readonly fundingAccountName: string;
  readonly formatMoney: (amount: number) => string;
}

function formatMoneyValue(value: number | null, formatMoney: (amount: number) => string) {
  return value === null ? 'Not available' : formatMoney(value);
}

function ExpenseDetails({ budgetItemState, fundingAccountName }: DetailsSectionProps) {
  return (
    <>
      <TextInput
        icon="building"
        iconAlign="left"
        label="Merchant"
        value={budgetItemState.merchant ? budgetItemState.merchant.name : 'No merchant linked'}
        disabled
      />
      <TextInput icon="piggy-bank" iconAlign="left" label="Funding Account" value={fundingAccountName} disabled />
      <SwitchInput
        icon="ban"
        iconAlign="left"
        label="Exclude From Balance"
        value={budgetItemState.excludeFromBalance}
        onValueChange={() => {}}
        disabled
      />
    </>
  );
}

function CategoryDetails({ budgetItemState, fundingAccountName }: DetailsSectionProps) {
  return (
    <>
      <TextInput icon="piggy-bank" iconAlign="left" label="Funding Account" value={fundingAccountName} disabled />
      <SwitchInput
        icon="ban"
        iconAlign="left"
        label="Exclude From Balance"
        value={budgetItemState.excludeFromBalance}
        onValueChange={() => {}}
        disabled
      />
    </>
  );
}

function BalanceTrackingDetails({ budgetItemState, fundingAccountName, formatMoney }: DetailsSectionProps) {
  return (
    <>
      <TextInput icon="piggy-bank" iconAlign="left" label="Funding Account" value={fundingAccountName} disabled />
      <TextInput
        icon="wallet"
        iconAlign="left"
        label="Starting Balance"
        value={formatMoneyValue(budgetItemState.balanceTrackingStartingBalance, formatMoney)}
        disabled
      />
      <TextInput
        icon="credit-card"
        iconAlign="left"
        label="Current Balance"
        value={formatMoneyValue(budgetItemState.balanceTrackingCurrentBalance, formatMoney)}
        disabled
      />
      <TextInput
        icon="arrow-up"
        iconAlign="left"
        label="Credits (Payments)"
        value={formatMoneyValue(budgetItemState.balanceTrackingCredits, formatMoney)}
        disabled
      />
      <TextInput
        icon="arrow-down"
        iconAlign="left"
        label="Amount Spent"
        value={formatMoneyValue(budgetItemState.balanceTrackingAmountSpent, formatMoney)}
        disabled
      />
      <TextInput
        icon="chart-line"
        iconAlign="left"
        label="Net Change"
        value={formatMoneyValue(budgetItemState.balanceTrackingNetChange, formatMoney)}
        disabled
      />
      <SwitchInput
        icon="ban"
        iconAlign="left"
        label="Exclude From Balance"
        value={budgetItemState.excludeFromBalance}
        onValueChange={() => {}}
        disabled
      />
    </>
  );
}

export function DetailsSection({ budgetItemState, fundingAccountName, formatMoney }: DetailsSectionProps) {
  return (
    <View className="mt-5 border-t border-background-tertiary pt-5">
      <ThemedText type="subText" className="uppercase tracking-widest text-text-secondary mb-2">
        Details
      </ThemedText>
      {budgetItemState.isBalanceTracking ? (
        <BalanceTrackingDetails
          budgetItemState={budgetItemState}
          fundingAccountName={fundingAccountName}
          formatMoney={formatMoney}
        />
      ) : budgetItemState.isExpense ? (
        <ExpenseDetails
          budgetItemState={budgetItemState}
          fundingAccountName={fundingAccountName}
          formatMoney={formatMoney}
        />
      ) : (
        <CategoryDetails
          budgetItemState={budgetItemState}
          fundingAccountName={fundingAccountName}
          formatMoney={formatMoney}
        />
      )}
    </View>
  );
}
