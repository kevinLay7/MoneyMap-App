import { View } from 'react-native';
import { Button } from '../ui/button';
import { FontAwesome6 } from '@expo/vector-icons';
import { SharedModal, ThemedText } from '../shared';
import { useState } from 'react';
import { Colors } from '@/constants/colors';

export function BudgetMenu() {
  const [showMenu, setShowMenu] = useState(false);
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
              onPress={() => {}}
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
              onPress={() => {}}
            />
            <View className="h-1 bg-text-secondary rounded-full my-6"></View>

            <Button
              position="left"
              size="sm"
              title="   Add Budget Item"
              color="negative"
              iconLeft={<FontAwesome6 name="location-dot" size={18} color="white" />}
              width="w-1/2"
              onPress={() => {}}
            />
          </View>
        </View>
      </SharedModal>
    </>
  );
}
