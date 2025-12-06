import React, { useCallback } from "react";
import { TouchableOpacity, Text } from "react-native";
import { LottieLoadingSpinner } from "@/components/lottie-loading-spinner";
import { HapticWeight, useHaptics } from "@/hooks/useHaptics";

interface ButtonProps {
  onPress: () => void;
  onLongPress?: () => void;
  title: string;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
  disabled?: boolean;
  activeOpacity?: number;
  loading?: boolean;
  size?: "sm" | "md" | "lg";
  marginY?: "0" | "1" | "2" | "3" | "4" | "5" | "6" | "8" | "10";
  rounded?:
    | "rounded-full"
    | "rounded-lg"
    | "rounded-md"
    | "rounded-sm"
    | "rounded-none";
  color?:
    | "primary"
    | "secondary"
    | "tertiary"
    | "quaternary"
    | "quinary"
    | "gray"
    | "negative"
    | "pending"
    | "white"
    | "error"
    | "success"
    | "warning";
  textColor?:
    | "white"
    | "black"
    | "primary"
    | "secondary"
    | "tertiary"
    | "quaternary"
    | "quinary"
    | "gray"
    | "text"
    | "text-secondary";
  width?: "w-full" | "w-1/2" | "w-1/3" | "w-1/4" | "w-1/5" | "w-4/5";
  className?: string;
  variant?: "contained" | "outlined" | "underlined";
  hapticWeight?: HapticWeight;
}

const bgColorMap: Record<string, string> = {
  primary: "bg-primary",
  secondary: "bg-secondary",
  tertiary: "bg-tertiary",
  quaternary: "bg-quaternary",
  quinary: "bg-quinary",
  gray: "bg-gray-500",
  negative: "bg-negative",
  pending: "bg-yellow-500",
  white: "bg-white",
  error: "bg-red-500",
  success: "bg-green-500",
  warning: "bg-yellow-500",
};

const borderColorMap: Record<string, string> = {
  primary: "border-primary",
  secondary: "border-secondary",
  tertiary: "border-tertiary",
  quaternary: "border-quaternary",
  quinary: "border-quinary",
  gray: "border-gray-500",
  negative: "border-negative",
  pending: "border-yellow-500",
  white: "border-white",
  error: "border-red-500",
  success: "border-green-500",
  warning: "border-yellow-500",
};

// Colors that need dark text (light backgrounds)
const lightBackgroundColors = new Set(["white", "pending", "warning"]);

// Auto-contrast text color based on background
const getContrastTextColor = (bgColor: string): string => {
  if (lightBackgroundColors.has(bgColor)) {
    return "text-black";
  }
  // Special case for negative (transparent) - use theme text color
  if (bgColor === "negative") {
    return "text-text";
  }
  return "text-white";
};

// Custom text color options
const customTextColorMap: Record<string, string> = {
  white: "text-white",
  black: "text-black",
  primary: "text-primary",
  secondary: "text-secondary",
  tertiary: "text-tertiary",
  quaternary: "text-quaternary",
  quinary: "text-quinary",
  gray: "text-gray-500",
  text: "text-text",
  "text-secondary": "text-text-secondary",
};

const outlinedTextColorMap: Record<string, string> = {
  primary: "text-primary",
  secondary: "text-secondary",
  tertiary: "text-tertiary",
  quaternary: "text-quaternary",
  quinary: "text-quinary",
  gray: "text-gray-500",
  negative: "text-text",
  pending: "text-yellow-500",
  white: "text-white",
  error: "text-red-500",
  success: "text-green-500",
  warning: "text-yellow-500",
};

const sizeMap = {
  sm: "h-10",
  md: "h-12",
  lg: "h-16",
};

const marginYMap: Record<string, string> = {
  "0": "my-0",
  "1": "my-1",
  "2": "my-2",
  "3": "my-3",
  "4": "my-4",
  "5": "my-5",
  "6": "my-6",
  "8": "my-8",
  "10": "my-10",
};

export function Button({
  onPress,
  onLongPress,
  title,
  iconLeft,
  iconRight,
  disabled,
  activeOpacity,
  loading,
  size = "md",
  marginY = "2",
  rounded = "rounded-full",
  color = "primary",
  textColor,
  width = "w-full",
  className,
  variant = "contained",
  hapticWeight = "light",
}: ButtonProps) {
  const { impact } = useHaptics();

  const handlePress = useCallback(() => {
    if (!disabled && hapticWeight) {
      impact(hapticWeight);
    }
    onPress();
  }, [disabled, hapticWeight, impact, onPress]);

  const buttonSize = size === "sm" ? 10 : size === "md" ? 12 : 16;

  const heightClass = sizeMap[size];
  const marginClass = marginYMap[marginY] || marginYMap["2"];

  // Handle variant-specific styling
  let bgColor: string;
  let finalTextColor: string;
  let borderClasses: string;

  if (disabled) {
    bgColor = "bg-disabled";
    finalTextColor = "text-text-secondary";
    borderClasses = "";
  } else if (variant === "outlined") {
    bgColor = "bg-transparent";
    // For outlined/underlined, use custom textColor if provided, otherwise use color-matched text
    finalTextColor = textColor
      ? customTextColorMap[textColor] || `text-${textColor}`
      : outlinedTextColorMap[color] || outlinedTextColorMap.primary;
    borderClasses = `border-2 ${borderColorMap[color] || borderColorMap.primary}`;
  } else if (variant === "underlined") {
    bgColor = "bg-transparent";
    finalTextColor = textColor
      ? customTextColorMap[textColor] || `text-${textColor}`
      : outlinedTextColorMap[color] || outlinedTextColorMap.primary;
    borderClasses = "";
  } else {
    // contained variant
    bgColor = bgColorMap[color] || bgColorMap.primary;
    // Use custom textColor if provided, otherwise auto-contrast based on background
    if (textColor) {
      finalTextColor = customTextColorMap[textColor] || `text-${textColor}`;
    } else {
      finalTextColor = getContrastTextColor(color);
    }
    borderClasses = "";
  }

  const buttonBaseClasses = `flex-row justify-center items-center ${width} ${bgColor} ${borderClasses}`;
  const textBaseClasses = `${finalTextColor} font-semibold ${
    variant === "underlined" ? "underline underline-offset-4" : ""
  }`;

  return (
    <TouchableOpacity
      onPress={handlePress}
      onLongPress={onLongPress}
      disabled={disabled}
      activeOpacity={activeOpacity}
      className={`${buttonBaseClasses} py-2 ${rounded} ${heightClass} ${marginClass} ${className || ""}`}
    >
      {iconLeft}
      {loading ? (
        <LottieLoadingSpinner size={buttonSize + 24} />
      ) : (
        <Text className={textBaseClasses}>{title}</Text>
      )}
      {iconRight}
    </TouchableOpacity>
  );
}
