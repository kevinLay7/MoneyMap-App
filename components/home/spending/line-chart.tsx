import React from 'react';
import { LineChart } from 'react-native-gifted-charts';
import { CurveType } from 'gifted-charts-core';
import { View, useWindowDimensions, Text } from 'react-native';
import { Colors } from '@/constants/colors';

type DataPoint = {
  dayOfMonth: number;
  value: number;
  hideDataPoint?: boolean;
  dataPointColor?: string;
  dataPointRadius?: number;
  dataPointHeight?: number;
  dataPointWidth?: number;
};

interface SpendingLineChartProps {
  chartData: {
    currentMonthData: DataPoint[];
    previousMonthData: DataPoint[];
    currentTotal: number;
    vsLastMonth: number;
    aboveBelow: 'above' | 'below' | 'same as';
    vsLastMonthIcon: 'circle-up' | 'circle-down' | 'circle-check';
    vsLastMonthColor: string;
    maxValue: number;
    hasCurrentSpending: boolean;
    hasPreviousSpending: boolean;
  };
  height?: number;
  showComparison?: boolean;
}

export default function SpendingLineChart({ chartData, height = 100, showComparison = true }: SpendingLineChartProps) {
  const { width: windowWidth } = useWindowDimensions();

  // Memoize the pointer label component to prevent recreation
  const renderPointerLabel = React.useCallback(
    (items: any[]) => {
      if (!items || items.length === 0) return null;

      const currentItem = items[1]; // Current period data (data2)
      const previousItem = items[0]; // Previous period data (data)

      if (!currentItem) return null;

      return (
        <View
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: 8,
            marginLeft: -50, // Center the label over the pointer
            marginBottom: 10,
            height: 80,
            width: 100,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Text style={{ color: 'white', fontSize: 12, fontWeight: '600' }}>Day {currentItem.dayOfMonth}</Text>
          <Text style={{ color: Colors.primary, fontSize: 14, fontWeight: 'bold' }}>
            ${currentItem.value?.toFixed(2) || '0.00'}
          </Text>
          {previousItem && showComparison && (
            <Text style={{ color: '#92929288', fontSize: 11 }}>
              Previous: ${previousItem.value?.toFixed(2) || '0.00'}
            </Text>
          )}
        </View>
      );
    },
    [showComparison]
  );

  // Memoize chart configuration to prevent recreation on each render
  const chartConfig = React.useMemo(
    () => ({
      thickness: 5,
      height,
      adjustToWidth: true,
      width: windowWidth * 0.74,
      xAxisColor: '#bababa86',
      disableScroll: true,
      textColor: 'white',
      maxValue: chartData.maxValue > 0 ? chartData.maxValue : undefined,
      data2: chartData.currentMonthData,
      data: showComparison ? chartData.previousMonthData : undefined,
      endOpacity2: 0.1,
      startOpacity2: 0.1,
      color: '#92929200',
      color2: Colors.primary,
      startFillColor: '#ffffffff',
      endFillColor: '#ffffffff',
      startOpacity1: 0.2,
      endOpacity1: 0.2,
      areaChart: true,
      dataPointsRadius2: 0,
      dataPointsRadius1: 0,
      rulesColor: '#c0c0c086',
      noOfSections: 2,
      rulesType: 'solid' as const,
      formatYLabel: (value: string) => (Number(value) < 1000 ? value : `${Math.round(Number(value) / 1000)}k`),
      yAxisTextStyle: { color: '#eaeaea' },
      initialSpacing: 3,
      curved: true,
      curveType: CurveType.QUADRATIC,
      yAxisColor: 'transparent',
      pointerConfig: {
        pointerStripHeight: height - 50,
        pointerStripColor: Colors.primary,
        pointerStripWidth: 2,
        pointerColor: Colors.primary,
        radius: 6,
        pointerLabelComponent: renderPointerLabel,
        activatePointersOnLongPress: false,
        autoAdjustPointerLabelPosition: false,
        stripOverPointer: true,
        pointerVanishDelay: 3000,
        pointerEvents: 'auto' as const,
        showPointerStrip: true,
        pointerLabelWidth: 100,
        pointerLabelHeight: 80,
      },
    }),
    [
      height,
      windowWidth,
      chartData.maxValue,
      chartData.currentMonthData,
      chartData.previousMonthData,
      showComparison,
      renderPointerLabel,
    ]
  );

  return (
    <View className="w-full">
      <LineChart {...chartConfig} />
    </View>
  );
}

export { type DataPoint };
