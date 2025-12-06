import { useHaptics } from "@/hooks/useHaptics";
import {
  Animated,
  RefreshControl,
  ScrollView,
  ScrollViewProps,
  View,
} from "react-native";
import { AnimatedRef } from "react-native-reanimated";

interface AnimatedScrollViewProps extends ScrollViewProps {
  children: React.ReactNode;
  animatedRef?: AnimatedRef<any>;
  isPending?: boolean;
  isRefreshing?: boolean;
  onRefresh?: () => void;
}

/**
 * Parent component needs to implement the refreshing state and onRefresh function
 * Also needs to have
 * const animatedRef = useAnimatedRef();
 * const scrollOffset = useScrollViewOffset(animatedRef);
 *
 * @param param0
 * @returns
 */
export default function AnimatedScrollView({
  children,
  animatedRef,
  isPending,
  isRefreshing,
  onRefresh,
  ...props
}: AnimatedScrollViewProps) {
  const { impact } = useHaptics();

  return (
    <Animated.ScrollView
      ref={animatedRef}
      scrollEventThrottle={0}
      refreshControl={
        onRefresh && (
          <RefreshControl
            refreshing={isPending || isRefreshing || false}
            onRefresh={() => {
              impact("light");
              onRefresh?.();
            }}
            progressViewOffset={100}
          />
        )
      }
      {...props}
    >
      <View className="pt-28">{children}</View>
    </Animated.ScrollView>
  );
}
