import React from "react";
import LottieView from "lottie-react-native";
import { View } from "react-native";

interface LottieLoadingSpinnerProps {
  size?: number;
  color?: string;
  autoPlay?: boolean;
  loop?: boolean;
  style?: any;
  showBackground?: boolean;
  backgroundOpacity?: number;
}

export function LottieLoadingSpinner({
  size = 42,
  autoPlay = true,
  loop = true,
  style,
  showBackground = false,
  backgroundOpacity = 0.8,
}: LottieLoadingSpinnerProps) {
  return (
    <View
      style={[{ width: "100%", height: "100%" }, style]}
      className="items-center justify-center"
    >
      {showBackground && (
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: `rgba(0, 0, 0, 0.5)`,
            zIndex: -1,
          }}
        />
      )}
      <LottieView
        source={require("@/assets/lottie/loading.json")}
        autoPlay={autoPlay}
        loop={loop}
        style={{
          width: size,
          height: size,
        }}
      />
    </View>
  );
}
