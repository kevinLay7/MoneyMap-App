import { View, ScrollView, Pressable, Dimensions } from 'react-native';
import Modal from 'react-native-modal';
import { ThemedText } from '../shared/themed-text';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { FontAwesome6 } from '@expo/vector-icons';
import Item from '@/model/models/item';
import { Colors } from '@/constants/colors';
import IconCircle from '../ui/icon-circle';

interface AddAccountModalProps {
  isVisible: boolean;
  onClose: () => void;
  items: Item[];
  onSelectItem: (item: Item) => void;
  onAddNew: () => void;
}

export function AddAccountModal({ isVisible, onClose, items, onSelectItem, onAddNew }: AddAccountModalProps) {
  return (
    <Modal
      isVisible={isVisible}
      onBackdropPress={onClose}
      onSwipeComplete={onClose}
      swipeDirection="down"
      animationIn="slideInUp"
      animationOut="slideOutDown"
      style={{ margin: 0, justifyContent: 'flex-end' }}
      backdropOpacity={0.7}
    >
      <Card variant="elevated" rounded="xl" backgroundColor="secondary" padding="lg" className="min-h-[80%]">
        <View className="items-center mb-4">
          <View className="w-12 h-1 bg-gray-500 rounded-full mb-4" />
          <ThemedText type="title" className="mb-2">
            Add Account
          </ThemedText>
          <ThemedText type="subText" className="text-center">
            Are you modifying an existing account or adding a new one?
          </ThemedText>
        </View>

        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          {items.length > 0 && (
            <View className="mb-4">
              <ThemedText type="defaultSemiBold" className="mb-3">
                Modify Existing Account
              </ThemedText>
              {items.map(item => (
                <Pressable
                  key={item.id}
                  onPress={() => {
                    onSelectItem(item);
                    onClose();
                  }}
                  className="mb-2"
                >
                  <Card variant="outlined" backgroundColor="tertiary" padding="md" className="flex-row items-center">
                    <IconCircle
                      input={item.institutionLogo ?? item.institutionName?.[0] ?? ''}
                      size={30}
                      borderSize={1}
                    />
                    <View className="flex-1 ml-4">
                      <ThemedText type="defaultSemiBold">{item.institutionName}</ThemedText>
                      <ThemedText type="subText" className="mt-1">
                        Last updated: {item.calcTimeSinceLastSync()} ago
                      </ThemedText>
                    </View>
                    <FontAwesome6 name="chevron-right" size={16} color={Colors.dark.textSecondary} />
                  </Card>
                </Pressable>
              ))}
            </View>
          )}

          <View className="mt-4">
            <ThemedText type="defaultSemiBold" className="mb-3">
              Add New Account
            </ThemedText>
            <Button
              title="Connect New Account"
              onPress={() => {
                onAddNew();
                onClose();
              }}
              iconRight={<FontAwesome6 name="plus" size={16} color={Colors.dark.text} style={{ marginLeft: 8 }} />}
            />
          </View>
        </ScrollView>
      </Card>
    </Modal>
  );
}
