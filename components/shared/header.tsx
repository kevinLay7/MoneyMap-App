import React, { ReactNode } from 'react';
import { useAuth0 } from 'react-native-auth0';
import { Pressable, View, Text } from 'react-native';
import { FontAwesome6 } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { useAnimatedStyle, useDerivedValue, type SharedValue } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import WaveBackground from '@/components/wave-background';
import { useNavigation } from '@react-navigation/native';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Button } from '@/components/ui/button';
import { Colors } from '@/constants/colors';
import { SharedModal } from '@/components/shared/shared-modal';

type HeaderProps = {
  scrollOffset: SharedValue<number>;
  centerComponent?: ReactNode;
  leftIcon?: string;
  rightIcon?: string;
  rightComponent?: ReactNode;
  rightCallback?: () => void;
  backgroundHex?: string;
  noBackground?: boolean;
};

/*
 * Header component that displays a header with a left icon, center component, and right icon.
 * The header is animated to move up when the user scrolls down.
 * The header has a background gradient that fades in and out.
 * The header has a side drawer for settings etc.
 *
 * Note: Header is added to each page instead of being managed by router (Tabs) due to how the header changes for each page.
 */
export default function Header({
  scrollOffset,
  centerComponent,
  leftIcon,
  rightIcon,
  rightComponent,
  rightCallback,
  backgroundHex,
  noBackground = undefined,
}: HeaderProps) {
  const { clearCredentials } = useAuth0();
  const [showSettingsDrawer, setShowSettingsDrawer] = React.useState(false);
  const colorScheme = useColorScheme();
  const navigator = useNavigation<any>();

  const shouldShowBackground = React.useMemo(() => {
    return noBackground === undefined ? true : !noBackground;
  }, [noBackground]);

  // Memoize icon calculations
  const leftIconToUse = React.useMemo(() => leftIcon ?? 'bars', [leftIcon]);
  const rightIconToUse = React.useMemo(() => rightIcon ?? '', [rightIcon]);

  // Memoize press handlers
  const handleLeftIconPress = React.useCallback(() => {
    if (leftIconToUse.includes('left')) {
      setShowSettingsDrawer(false);
      navigator.goBack();
    } else {
      setShowSettingsDrawer(true);
    }
  }, [leftIconToUse, navigator]);

  const handleOpenAccountManagement = React.useCallback(async () => {
    navigator.navigate('AccountManagement');
  }, [navigator]);

  const handleOpenSettings = React.useCallback(async () => {
    navigator.navigate('Settings');
    setShowSettingsDrawer(false);
  }, [navigator]);

  const handleOpenDebugData = React.useCallback(async () => {
    navigator.navigate('debug-data');
    setShowSettingsDrawer(false);
  }, [navigator]);

  // Combine animated styles
  const combinedHeaderStyles = useAnimatedStyle(
    () => ({
      width: '100%',
      position: 'absolute',
      transform: [{ translateY: scrollOffset.value <= 0 ? 0 : -scrollOffset.value }],
      height: 100,
      zIndex: 1,
    }),
    []
  );

  // Static styles
  const iconContainerStyle = 'w-1/6 h-12 justify-center items-start pl-8';
  const centerContainerStyle = 'w-4/6 h-12 justify-center items-center';
  const rightContainerStyle = 'w-1/6 h-12 justify-center items-end pr-8';

  // Memoize gradient configuration
  const shadowGradientConfig = React.useMemo(
    () => ({
      colors: ['#000000d5', 'transparent'] as const,
      start: { x: 0, y: 0 },
      end: { x: 0, y: 1 },
      locations: [0, 0.99] as const,
    }),
    []
  );

  // Memoize drawer content
  const drawerContent = React.useMemo(
    () => (
      <SafeAreaView className="flex-1 bg-backgroundSecondary">
        <View className="p-6 border-b border-border">
          <Text className="text-3xl font-bold text-text">MoneyMap</Text>
        </View>
        <View className="flex-1 p-4">
          <Button
            title="Accounts"
            onPress={handleOpenAccountManagement}
            iconLeft={
              <FontAwesome6
                name="building"
                size={16}
                color={colorScheme === 'light' ? 'white' : 'black'}
                style={{ marginRight: 8 }}
              />
            }
            className="justify-start"
            marginY="0"
          />

          <Button
            title="Settings"
            onPress={handleOpenSettings}
            iconLeft={
              <FontAwesome6
                name="gear"
                size={16}
                color={colorScheme === 'light' ? 'white' : 'black'}
                style={{ marginRight: 8 }}
              />
            }
            className="justify-start"
            marginY="4"
          />

          {__DEV__ && (
            <Button
              title="Debug Data"
              onPress={handleOpenDebugData}
              iconLeft={
                <FontAwesome6
                  name="bug"
                  size={16}
                  color={colorScheme === 'light' ? 'white' : 'black'}
                  style={{ marginRight: 8 }}
                />
              }
              className="justify-start"
              marginY="4"
            />
          )}
          <Pressable className="flex-1 h-full" onPress={() => setShowSettingsDrawer(false)} />
        </View>
        <View className="p-4 border-t border-border">
          <Button title="Logout" onPress={async () => await clearCredentials()} color="error" />
        </View>
      </SafeAreaView>
    ),
    [colorScheme, handleOpenAccountManagement, handleOpenSettings, handleOpenDebugData, clearCredentials]
  );

  const bgHeight = useDerivedValue(() => {
    return 275 - scrollOffset.value;
  }, []);

  const bgStyles = useAnimatedStyle(
    () => ({
      height: bgHeight.value,
      width: '100%',
      backgroundColor: backgroundHex,
      position: 'absolute',
      top: 0,
      left: 0,
      zIndex: 0,
      shadowColor: backgroundHex,
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.3,
      shadowRadius: 5,
      elevation: 5,
      opacity: backgroundHex ? 1 : 0,
    }),
    [backgroundHex]
  );

  const shadowOpacity = useDerivedValue(() => {
    return scrollOffset.value > 50 ? 1 : scrollOffset.value / 50;
  }, []);

  const shadowStyles = useAnimatedStyle(
    () => ({
      height: 70,
      position: 'absolute',
      width: '100%',
      zIndex: 300,
      opacity: shadowOpacity.value,
    }),
    []
  );

  return (
    <View className="w-full">
      <Animated.View style={shadowStyles}>
        <LinearGradient {...shadowGradientConfig} style={linearGradientStyles} />
      </Animated.View>

      {shouldShowBackground && <Animated.View style={bgStyles}></Animated.View>}
      {shouldShowBackground && <WaveBackground height={bgHeight} />}

      <Animated.View style={combinedHeaderStyles}>
        <View className="h-28 justify-start items-end bg-transparent flex-row">
          <View className="flex-row w-full">
            <View className={iconContainerStyle}>
              <Pressable onPress={handleLeftIconPress} style={{ zIndex: 100 }}>
                <FontAwesome6 name={leftIconToUse} size={24} color="white" />
              </Pressable>
            </View>
            <View className={centerContainerStyle}>{centerComponent}</View>
            <View className={rightContainerStyle}>
              {rightComponent}
              {rightIconToUse && (
                <Pressable onPress={rightCallback} className="w-12 h-full items-end justify-center">
                  <FontAwesome6 name={rightIconToUse} size={24} color="white" />
                </Pressable>
              )}
            </View>
          </View>
        </View>
      </Animated.View>

      {/* Side drawer for settings etc. */}
      <SharedModal
        visible={showSettingsDrawer}
        onClose={() => setShowSettingsDrawer(false)}
        position="left"
        width="80%"
        swipeToClose
        swipeDirection="left"
        backdropOpacity={0}
        backdropColor={Colors.dark.backgroundSecondary}
        borderColor={Colors.dark.backgroundTertiary}
        borderWidth={2}
      >
        <View className="flex-1 h-full bg-background-secondary">{drawerContent}</View>
      </SharedModal>
    </View>
  );
}

// Static styles moved outside component
const linearGradientStyles = {
  position: 'absolute' as const,
  left: 0,
  right: 0,
  top: 0,
  height: '100%' as const,
  borderRadius: 0,
  zIndex: 100,
};
