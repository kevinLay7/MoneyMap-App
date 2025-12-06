import { useCallback } from "react";
import * as Haptics from "expo-haptics";

export type HapticWeight = "light" | "medium" | "strong";

export function useHaptics() {
  const isHapticsEnabled = true;

  const impact = useCallback(
    async (weight: HapticWeight = "medium") => {
      if (!isHapticsEnabled) return;
      let style: Haptics.ImpactFeedbackStyle =
        Haptics.ImpactFeedbackStyle.Medium;

      if (weight === "light") style = Haptics.ImpactFeedbackStyle.Light;
      else if (weight === "strong") style = Haptics.ImpactFeedbackStyle.Heavy;

      try {
        await Haptics.impactAsync(style);
      } catch {
        // noop
      }
    },
    [isHapticsEnabled]
  );

  const selection = useCallback(async () => {
    if (!isHapticsEnabled) return;
    try {
      await Haptics.selectionAsync();
    } catch {
      // noop
    }
  }, [isHapticsEnabled]);

  const success = useCallback(async () => {
    if (!isHapticsEnabled) return;
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      // noop
    }
  }, [isHapticsEnabled]);

  const warning = useCallback(async () => {
    if (!isHapticsEnabled) return;
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } catch {
      // noop
    }
  }, [isHapticsEnabled]);

  const error = useCallback(async () => {
    if (!isHapticsEnabled) return;
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } catch {
      // noop
    }
  }, [isHapticsEnabled]);

  return {
    impact,
    selection,
    success,
    warning,
    error,
  };
}
