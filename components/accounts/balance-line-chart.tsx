import React, { useMemo, useRef, useEffect, useState } from 'react';
import { LineChart } from 'react-native-gifted-charts';
import { CurveType } from 'gifted-charts-core';
import { View, useWindowDimensions } from 'react-native';
import AccountDailyBalance from '@/model/models/account-daily-balance';
import { Colors } from '@/constants/colors';

type BalanceDataPoint = {
  value: number;
  label?: string;
  date: string;
};

export interface FocusedBalance {
  value: number;
  date: string;
}

interface BalanceLineChartProps {
  dailyBalances: AccountDailyBalance[];
  height?: number;
  onFocusChange?: (balance: FocusedBalance | null) => void;
  lineColor?: string;
  containerPadding?: number;
}

const LINE_COLOR = Colors.success; // Indigo
const POINTER_VANISH_DELAY = 2500;

export function BalanceLineChart({
  dailyBalances,
  height = 180,
  onFocusChange,
  lineColor = LINE_COLOR,
  containerPadding = 16,
}: BalanceLineChartProps) {
  const { width: windowWidth } = useWindowDimensions();
  const [containerWidth, setContainerWidth] = useState<number | null>(null);
  const chartWidth = containerWidth ?? windowWidth - containerPadding * 3;
  const onFocusChangeRef = useRef(onFocusChange);
  const clearTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep ref updated
  useEffect(() => {
    onFocusChangeRef.current = onFocusChange;
  }, [onFocusChange]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (clearTimeoutRef.current) {
        clearTimeout(clearTimeoutRef.current);
      }
    };
  }, []);

  const chartData = useMemo(() => {
    if (!dailyBalances.length) return { data: [], maxValue: 0, minValue: 0, yAxisOffset: 0 };

    // Sort ascending for chart display (oldest to newest) and dedupe by date
    const sorted = [...dailyBalances].sort((a, b) => a.date.localeCompare(b.date));

    // Deduplicate by date (keep latest balance per date)
    const dateMap = new Map<string, AccountDailyBalance>();
    for (const balance of sorted) {
      dateMap.set(balance.date, balance);
    }
    const deduped = Array.from(dateMap.values()).sort((a, b) => a.date.localeCompare(b.date));

    const values = deduped.map(d => d.balance);
    const rawMin = Math.min(...values);
    const rawMax = Math.max(...values);
    const range = rawMax - rawMin;

    // Add 10% padding so line doesn't touch edges
    const padding = range > 0 ? range * 0.1 : Math.abs(rawMin) * 0.1 || 10;
    const paddedMin = rawMin - padding;
    const paddedMax = rawMax + padding;
    const paddedRange = paddedMax - paddedMin;

    // Normalize values to start near 0 (for proper area chart rendering)
    // Store original value for pointer display
    const data: BalanceDataPoint[] = deduped.map(balance => ({
      value: balance.balance - paddedMin,
      date: balance.date,
    }));

    return {
      data,
      maxValue: paddedRange,
      minValue: 0,
      yAxisOffset: paddedMin,
    };
  }, [dailyBalances]);

  const handlePointerMove = React.useCallback(
    (items: any[]) => {
      if (!items || items.length === 0) return null;
      const item = items[0];
      if (!item) return null;

      // Emit focus change - add back the offset to get actual value
      if (onFocusChangeRef.current) {
        const actualValue = item.value + chartData.yAxisOffset;
        onFocusChangeRef.current({ value: actualValue, date: item.date });

        // Reset the clear timeout
        if (clearTimeoutRef.current) {
          clearTimeout(clearTimeoutRef.current);
        }
        clearTimeoutRef.current = setTimeout(() => {
          onFocusChangeRef.current?.(null);
        }, POINTER_VANISH_DELAY);
      }

      return null;
    },
    [chartData.yAxisOffset]
  );

  const chartConfig = useMemo(
    () => {
      const endSpacing = 16;
      const pointCount = Math.max(chartData.data.length - 1, 1);
      const spacing = Math.max((chartWidth - endSpacing) / pointCount, 0);

      return {
      thickness: 2,
      height,
      adjustToWidth: true,
      width: chartWidth,
      disableScroll: true,
      hideDataPoints: true,
      hideAxesAndRules: true,
      hideYAxisText: true,
      xAxisColor: 'transparent',
      yAxisColor: 'transparent',
      yAxisLabelWidth: 0,
      data: chartData.data,
      areaChart: true,
      color: lineColor,
      startFillColor: lineColor,
      endFillColor: 'transparent',
      startOpacity: 0.3,
      endOpacity: 0,
      initialSpacing: 0,
      endSpacing,
      spacing,
      curved: true,
      curveType: CurveType.QUADRATIC,
      // Values are normalized to start at 0, maxValue is the range
      maxValue: chartData.maxValue,
      pointerConfig: {
        pointerStripHeight: height,
        pointerStripColor: lineColor,
        pointerStripWidth: 1,
        pointerColor: lineColor,
        radius: 6,
        pointerLabelComponent: handlePointerMove,
        activatePointersOnLongPress: false,
        autoAdjustPointerLabelPosition: true,
        stripOverPointer: true,
        pointerVanishDelay: POINTER_VANISH_DELAY,
        pointerEvents: 'auto' as const,
        showPointerStrip: true,
      },
      };
    },
    [height, chartWidth, chartData, handlePointerMove, lineColor]
  );

  if (!dailyBalances.length) {
    return null;
  }

  return (
    <View
      style={{ width: '100%', height, overflow: 'hidden' }}
      onLayout={event => setContainerWidth(event.nativeEvent.layout.width)}
    >
      <LineChart {...chartConfig} />
    </View>
  );
}
