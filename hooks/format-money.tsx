import { useDemo } from "@/context/demoContext";
import { obscureNumber } from "@/helpers/demoHelpers";

function formatMoney(amount: number) {
  if (!amount) {
    return "$0.00";
  }

  const cents = (amount % 1).toFixed(2).substring(2);
  const dollars = Math.floor(amount).toLocaleString("en-US");
  const formatted = `$${dollars}.${cents}`;
  return formatted.replace("..", ".");
}

export function useMoneyFormatter() {
  const { isDemoMode } = useDemo();

  return (value: number) => {
    if (isDemoMode) {
      return formatMoney(obscureNumber(value));
    }
    return formatMoney(value);
  };
}
