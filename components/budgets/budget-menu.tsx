import { View, Alert } from 'react-native';
import { Button } from '../ui/button';
import { FontAwesome6 } from '@expo/vector-icons';
import { SharedModal } from '../shared';
import { useState } from 'react';
import { Colors } from '@/constants/colors';
import { useNavigation } from 'expo-router';
import database from '@/model/database';
import { BudgetService } from '@/services/budget-service';

export function BudgetMenu({ selectedBudgetId }: { selectedBudgetId: string | null }) {
  const [showMenu, setShowMenu] = useState(false);
  const navigator = useNavigation<any>();
  const budgetService = new BudgetService(database);

  const handleDeletePress = () => {
    setShowMenu(false);
    Alert.alert('Delete Budget?', 'This action cannot be undone.', [
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          if (selectedBudgetId) {
            await budgetService.deleteBudget(selectedBudgetId);
          }
        },
      },
    ]);
  };

  return (
    <>
      <Button
        title=""
        color="negative"
        iconRight={<FontAwesome6 name="ellipsis" size={24} color="white" />}
        onPress={() => setShowMenu(true)}
        hapticWeight="light"
      />

      <SharedModal
        visible={showMenu}
        onClose={() => setShowMenu(false)}
        position="bottom"
        width="100%"
        height="50%"
        borderColor={Colors.dark.backgroundTertiary}
        borderWidth={2}
        borderRadius={20}
        backgroundColor={Colors.dark.backgroundSecondary}
      >
        <View className="w-full h-full rounded-2xl">
          <View key="menu-drawer-bar" className="flex-row items-center justify-center py-4">
            <View className="w-1/6 bg-text-secondary h-1 rounded-full"></View>
          </View>

          <View key="menu-drawer-content" className="flex-1 px-4">
            <Button
              color="negative"
              size="sm"
              position="left"
              title="  Create Budget"
              iconLeft={<FontAwesome6 name="plus" size={18} color="white" />}
              width="w-1/2"
              onPress={() => {
                setShowMenu(false);
                navigator.navigate('create-budget');
              }}
            />
            <Button
              color="negative"
              size="sm"
              position="left"
              title="  Edit Budget"
              iconLeft={<FontAwesome6 name="edit" size={18} color="white" />}
              width="w-1/2"
              onPress={() => {}}
            />
            <Button
              position="left"
              size="sm"
              title="   Delete Budget"
              color="negative"
              iconLeft={<FontAwesome6 name="trash" size={18} color="white" />}
              width="w-1/2"
              onPress={handleDeletePress}
            />
            <View className="h-1 bg-text-secondary rounded-full my-6"></View>

            <Button
              position="left"
              size="sm"
              title="   Add Budget Item"
              color="negative"
              iconLeft={<FontAwesome6 name="location-dot" size={18} color="white" />}
              width="w-1/2"
              onPress={() => {
                setShowMenu(false);
                navigator.navigate('create-budget-item', { budgetId: selectedBudgetId });
              }}
            />
          </View>
        </View>
      </SharedModal>
    </>
  );
}
