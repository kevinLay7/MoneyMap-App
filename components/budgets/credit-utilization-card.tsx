import { View } from 'react-native';
import { Svg, Circle } from 'react-native-svg';
import { Card } from '@/components/ui/card';
import { ThemedText } from '@/components/shared';
import { useMoneyFormatter } from '@/hooks/format-money';

interface CreditUtilizationCardProps {
  currentBalance: number;
  availableBalance: number;
}

export function CreditUtilizationCard({ currentBalance, availableBalance }: CreditUtilizationCardProps) {
  const formatMoney = useMoneyFormatter();

  // Calculate credit limit and utilization
  const creditLimit = currentBalance + availableBalance;
  const utilization = creditLimit > 0 ? (currentBalance / creditLimit) * 100 : 0;

  // Determine utilization status
  const getUtilizationStatus = (percent: number) => {
    if (percent < 30) return { label: 'Low Utilization', color: '#10b981' }; // green
    if (percent < 50) return { label: 'Good Utilization', color: '#3b82f6' }; // blue
    if (percent < 70) return { label: 'Medium Utilization', color: '#f59e0b' }; // orange
    return { label: 'High Utilization', color: '#ef4444' }; // red
  };

  const status = getUtilizationStatus(utilization);

  // Circle progress calculations
  const size = 120;
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (utilization / 100) * circumference;

  return (
    <Card backgroundColor="secondary" padding="lg">
      <View className="flex-row items-center">
        {/* Circular Progress */}
        <View className="mr-6">
          <Svg width={size} height={size}>
            {/* Background circle */}
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke="#1f2937"
              strokeWidth={strokeWidth}
              fill="none"
            />
            {/* Progress circle */}
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={status.color}
              strokeWidth={strokeWidth}
              fill="none"
              strokeDasharray={`${progress} ${circumference}`}
              strokeDashoffset={0}
              strokeLinecap="round"
              rotation="-90"
              origin={`${size / 2}, ${size / 2}`}
            />
          </Svg>
          <View className="absolute inset-0 items-center justify-center">
            <ThemedText type="title" style={{ fontSize: 28 }}>
              {Math.round(utilization)}%
            </ThemedText>
          </View>
        </View>

        {/* Utilization Details */}
        <View className="flex-1">
          <ThemedText type="defaultSemiBold" style={{ color: status.color, marginBottom: 12 }}>
            {status.label}
          </ThemedText>
          <View className="flex-row justify-between mb-1">
            <ThemedText type="default" className="text-text-secondary">
              Limit
            </ThemedText>
            <ThemedText type="default" className="text-text-secondary">
              Available
            </ThemedText>
          </View>
          <View className="flex-row justify-between">
            <ThemedText type="defaultSemiBold">
              {formatMoney(creditLimit)}
            </ThemedText>
            <ThemedText type="defaultSemiBold">
              {formatMoney(availableBalance)}
            </ThemedText>
          </View>
        </View>
      </View>
    </Card>
  );
}
