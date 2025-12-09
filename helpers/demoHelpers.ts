export function obscureNumber(value: number): number {
  if (!value) return 0;

  const isNegative = value < 0;
  const absValue = Math.abs(value);

  // Generate random number between 0 and (real value - 1)
  const obscuredValue = Math.floor(Math.random() * absValue);

  return isNegative ? -obscuredValue : obscuredValue;
}
