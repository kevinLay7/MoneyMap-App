import { Modal, Pressable, View, Dimensions } from 'react-native';
import database from '@/model/database';
import Category from '@/model/models/category';
import { useEffect, useMemo, useState } from 'react';
import { ThemedText } from '@/components/shared';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome6 } from '@expo/vector-icons';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import IconCircle from '../icon-circle';
import { SearchInput } from './search-input';

interface CategoryParent {
  category: Category;
  children: Category[];
}

function ParentCategoryRow({
  parent,
  setSelectedCategory,
  shouldExpand,
}: Readonly<{
  parent: CategoryParent;
  setSelectedCategory: (category: Category) => void;
  shouldExpand: boolean;
}>) {
  const [isExpanded, setIsExpanded] = useState(shouldExpand);

  const onSelectCategory = (category: Category) => {
    setSelectedCategory(category);
    setIsExpanded(false);
  };

  useEffect(() => {
    setIsExpanded(shouldExpand);
  }, [shouldExpand]);

  return (
    <>
      <View className="bg-background-secondary h-14">
        <View className="flex-row items-center">
          <View className="w-3/4 h-full justify-center">
            <Pressable onPress={() => onSelectCategory(parent.category)}>
              <View className="ml-4 items-center flex-row">
                <IconCircle
                  input={parent.category.icon ?? ''}
                  size={24}
                  circle={false}
                  borderSize={0}
                  backgroundColor="transparent"
                />
                <ThemedText type="default" className="pl-4">
                  {parent.category.name}
                </ThemedText>
              </View>
            </Pressable>
          </View>
          <View className="w-1/4 items-end ">
            <Pressable onPress={() => setIsExpanded(!isExpanded)}>
              <View className="pr-8 pl-8 h-full justify-center">
                <FontAwesome6 name={isExpanded ? 'chevron-up' : 'chevron-down'} size={16} color="gray" />
              </View>
            </Pressable>
          </View>
        </View>
      </View>
      {isExpanded && (
        <>
          {parent.children.map(child => (
            <Pressable key={child.id} onPress={() => setSelectedCategory(child)}>
              <View className="h-14 tems-start justify-center pl-8 border-b-2 border-background-tertiary">
                <View className="flex-row items-center">
                  <IconCircle
                    input={child.icon ?? ''}
                    size={24}
                    circle={false}
                    borderSize={0}
                    backgroundColor="transparent"
                  />
                  <View className="w-[90%]">
                    <ThemedText type="default" className="ml-2" numberOfLines={child.name.length > 20 ? 2 : 1}>
                      {child.name}
                    </ThemedText>
                  </View>
                </View>
              </View>
            </Pressable>
          ))}
        </>
      )}
    </>
  );
}

export function CategorySlectorModal({
  isVisible,
  onClose,
  onSelectCategory,
}: Readonly<{
  readonly isVisible: boolean;
  readonly onClose: () => void;
  readonly onSelectCategory: (category: Category) => void;
}>) {
  const [visible, setVisible] = useState(isVisible);
  const screenWidth = Dimensions.get('window').width;
  const translateX = useSharedValue(-screenWidth);

  const [categories, setCategories] = useState<CategoryParent[] | undefined>(undefined);
  const [shouldExpand, setShouldExpand] = useState(false);
  const [debouncedQuery, setDebouncedQuery] = useState('');

  useEffect(() => {
    const fetchCategories = async () => {
      const categories = await database.get<Category>('categories').query().fetch();
      if (!categories) return undefined;

      const parents = categories.filter(cat => cat.detailed === '');

      const sortedParents = parents
        .toSorted((a, b) => a.name.localeCompare(b.name))
        .map(parent => {
          return {
            category: parent,
            children: categories.filter(cat => cat.primary === parent.primary && cat.detailed !== null),
          };
        });

      setCategories(sortedParents);
    };
    fetchCategories();
  }, []);

  useEffect(() => {
    setVisible(isVisible);
    translateX.value = withTiming(isVisible ? 0 : screenWidth, { duration: 300 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVisible, screenWidth]);

  const selectCategory = (category: Category) => {
    onSelectCategory(category);
    onClose();
  };

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
    };
  });

  const filteredCategories = useMemo(() => {
    const query = debouncedQuery.trim().toLowerCase();

    setShouldExpand(query.length > 0);

    if (!query) return categories;

    return categories
      ?.map(parent => {
        const parentMatches = parent.category.name.toLowerCase().includes(query);
        const matchingChildren = parent.children?.filter(child => child.name.toLowerCase().includes(query));

        if (parentMatches) {
          return { ...parent, children: parent.children } as CategoryParent;
        }

        if (matchingChildren && matchingChildren.length > 0) {
          return { ...parent, children: matchingChildren } as CategoryParent;
        }

        return null;
      })
      .filter(Boolean) as CategoryParent[];
  }, [categories, debouncedQuery]);

  return (
    <Modal visible={visible} onRequestClose={onClose} transparent>
      <SafeAreaView className="flex-1 bg-background px-4">
        <Animated.ScrollView style={[{ flex: 1, width: '100%' }, animatedStyle]}>
          <View className="flex-row mb-4">
            <ThemedText type="title">Select a Category</ThemedText>
            <Pressable onPress={onClose} className="ml-auto mr-2">
              <ThemedText type="link">Close</ThemedText>
            </Pressable>
          </View>
          <View className="mb-4">
            <SearchInput onQueryChange={setDebouncedQuery} placeholder="Search categories" />
          </View>
          <View className="mb-20">
            {filteredCategories?.map(parent => (
              <ParentCategoryRow
                key={parent.category.id}
                parent={parent}
                setSelectedCategory={selectCategory}
                shouldExpand={shouldExpand}
              />
            ))}
          </View>
        </Animated.ScrollView>
      </SafeAreaView>
    </Modal>
  );
}
