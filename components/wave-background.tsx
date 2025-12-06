import React from "react";
import { View } from "react-native";
import Animated, {
  useAnimatedStyle,
  withRepeat,
  withTiming,
  useSharedValue,
  Easing,
} from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";

type WaveBackgroundProps = {
  height?: Animated.SharedValue<number>;
};

const AnimatedSvg = Animated.createAnimatedComponent(Svg);

export default function WaveBackground({ height }: WaveBackgroundProps) {
  const translate1 = useSharedValue(0);
  const translate2 = useSharedValue(0);

  React.useEffect(() => {
    translate1.value = withRepeat(
      withTiming(-100, {
        duration: 12000,
        easing: Easing.linear,
      }),
      -1,
      true
    );
    translate2.value = withRepeat(
      withTiming(-100, {
        duration: 15000,
        easing: Easing.linear,
      }),
      -1,
      true
    );
  }, []);

  const animatedStyles = useAnimatedStyle(() => ({
    height: height?.value ?? 100,
  }));

  const waveStyle = { position: "absolute", width: "200%", height: "100%" };

  const animatedTranslate1 = useAnimatedStyle(() => ({
    transform: [{ translateX: translate1.value }],
  }));
  const animatedTranslate2 = useAnimatedStyle(() => ({
    transform: [{ translateX: translate2.value }],
  }));

  return (
    <Animated.View
      style={[
        { position: "absolute", width: "100%", overflow: "hidden" },
        animatedStyles,
      ]}
    >
      <View style={{ position: "relative", width: "100%", height: "100%" }}>
        <AnimatedSvg
          style={[waveStyle, animatedTranslate1]}
          viewBox="0 0 200 100"
          preserveAspectRatio="none"
        >
          <Path
            d="M0 50 Q 25 60, 50 50 T 100 50 T 150 50 T 200 50 V100 H0 Z"
            fill="white"
            opacity="0.08"
          />
        </AnimatedSvg>

        <AnimatedSvg
          style={[waveStyle, animatedTranslate2]}
          viewBox="0 0 200 100"
          preserveAspectRatio="none"
        >
          <Path
            d="M0 55 Q 40 45, 80 55 T 160 55 T 200 55 V100 H0 Z"
            fill="white"
            opacity="0.05"
          />
        </AnimatedSvg>
      </View>
    </Animated.View>
  );
}
