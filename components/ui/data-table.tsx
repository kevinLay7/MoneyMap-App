import React from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { ThemedText } from '@/components/shared';
import { Button } from './button';

export interface TableColumn<T> {
  key: string;
  label: string;
  width?: number;
  render?: (item: T) => React.ReactNode;
  headerClassName?: string;
  cellClassName?: string;
}

export interface DataTableProps<T> {
  data: T[];
  columns: TableColumn<T>[];
  keyExtractor: (item: T) => string;
  onRowPress?: (item: T) => void;
  onDelete?: (item: T) => void;
  emptyMessage?: string;
  showActions?: boolean;
}

export function DataTable<T>({
  data,
  columns,
  keyExtractor,
  onRowPress,
  onDelete,
  emptyMessage = 'No data available',
  showActions = true,
}: DataTableProps<T>) {
  if (data.length === 0) {
    return (
      <View className="p-4">
        <ThemedText type="default" className="text-text-secondary text-center">
          {emptyMessage}
        </ThemedText>
      </View>
    );
  }

  const totalWidth = columns.reduce((sum, col) => sum + (col.width || 150), 0) + (showActions ? 100 : 0);

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={true} className="flex-1">
      <View style={{ minWidth: totalWidth }}>
        {/* Header */}
        <View className="flex-row border-b-2 border-border pb-2 mb-2 px-2">
          {columns.map(column => (
            <View
              key={column.key}
              style={column.width ? { width: column.width } : { flex: 1, minWidth: 100 }}
              className={column.headerClassName}
            >
              <ThemedText type="defaultSemiBold" className="text-text">
                {column.label}
              </ThemedText>
            </View>
          ))}
          {showActions && (
            <View style={{ width: 100 }} className="items-center">
              <ThemedText type="defaultSemiBold" className="text-text">
                Actions
              </ThemedText>
            </View>
          )}
        </View>

        {/* Rows */}
        {data.map(item => {
          const RowWrapper = onRowPress ? Pressable : View;
          return (
            <RowWrapper
              key={keyExtractor(item)}
              onPress={onRowPress ? () => onRowPress(item) : undefined}
              className="flex-row border-b border-border/50 py-2 px-2 active:bg-background-secondary"
            >
              {columns.map(column => (
                <View
                  key={column.key}
                  style={column.width ? { width: column.width } : { flex: 1, minWidth: 100 }}
                  className={column.cellClassName}
                >
                  {column.render ? (
                    column.render(item)
                  ) : (
                    <ThemedText type="default" className="text-text-secondary" numberOfLines={1}>
                      {String((item as any)[column.key] || '')}
                    </ThemedText>
                  )}
                </View>
              ))}
              {showActions && (
                <View style={{ width: 100 }} className="items-center justify-center">
                  {onDelete && (
                    <Button
                      title="Delete"
                      onPress={() => onDelete(item)}
                      color="error"
                      size="sm"
                      width="w-20"
                    />
                  )}
                </View>
              )}
            </RowWrapper>
          );
        })}
      </View>
    </ScrollView>
  );
}

