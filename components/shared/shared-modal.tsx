import React from 'react';
import { Modal as RNModal, Pressable, StyleSheet, useWindowDimensions, View, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useDerivedValue,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';

type ModalPosition = 'left' | 'right' | 'bottom' | 'center';
type SwipeDirection = 'left' | 'right' | 'up' | 'down';

type SharedModalProps = {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;

  /** Width of the panel. Number <= 1 is treated as a fraction of screen width. */
  width?: number | `${number}%`;
  /** Height of the panel (primarily for bottom/center). Number <= 1 is treated as a fraction of screen height. */
  height?: number | `${number}%`;

  position?: ModalPosition;

  /** Enables swipe-to-close gesture. */
  swipeToClose?: boolean;
  /** Which direction should close the modal. Default derives from `position`. */
  swipeDirection?: SwipeDirection;

  /** Backdrop appearance. */
  backdropOpacity?: number;
  backdropColor?: string;
  closeOnBackdropPress?: boolean;

  /** Panel styling. */
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
  borderRadius?: number;
  panelStyle?: ViewStyle;

  animationDurationMs?: number;
};

function resolveSizePx(
  value: SharedModalProps['width'] | SharedModalProps['height'],
  screen: number,
  fallbackFraction: number
) {
  if (value === undefined) return screen * fallbackFraction;
  if (typeof value === 'number') return value <= 1 ? screen * value : value;
  const trimmed = value.trim();
  if (trimmed.endsWith('%')) {
    const pct = Number(trimmed.slice(0, -1));
    if (!Number.isFinite(pct)) return screen * fallbackFraction;
    return (screen * pct) / 100;
  }
  return screen * fallbackFraction;
}

function defaultSwipeDirection(position: ModalPosition): SwipeDirection {
  switch (position) {
    case 'left':
      return 'left';
    case 'right':
      return 'right';
    case 'bottom':
      return 'down';
    case 'center':
    default:
      return 'down';
  }
}

export function SharedModal({
  visible,
  onClose,
  children,
  width,
  height,
  position = 'left',
  swipeToClose = true,
  swipeDirection,
  backdropOpacity = 0.35,
  backdropColor = '#000',
  closeOnBackdropPress = true,
  backgroundColor,
  borderColor,
  borderWidth,
  borderRadius,
  panelStyle,
  animationDurationMs = 220,
}: SharedModalProps) {
  const { width: screenW, height: screenH } = useWindowDimensions();
  const panelW = resolveSizePx(width, screenW, 1);
  const panelH = resolveSizePx(height, screenH, position === 'bottom' ? 0.5 : 1);

  const [mounted, setMounted] = React.useState(visible);

  const effectiveSwipeDirection = swipeDirection ?? defaultSwipeDirection(position);
  const translate = useSharedValue(0);

  const closedTranslate = React.useMemo(() => {
    switch (position) {
      case 'left':
        return -panelW;
      case 'right':
        return panelW;
      case 'bottom':
        return panelH;
      case 'center':
      default:
        return panelH; // treat as slide-up into place by default
    }
  }, [panelW, panelH, position]);

  const animateOpen = React.useCallback(() => {
    translate.value = withTiming(0, {
      duration: animationDurationMs,
      easing: Easing.out(Easing.cubic),
    });
  }, [animationDurationMs, translate]);

  const animateClose = React.useCallback(() => {
    translate.value = withTiming(
      closedTranslate,
      {
        duration: animationDurationMs,
        easing: Easing.in(Easing.cubic),
      },
      (finished) => {
        if (finished) runOnJS(setMounted)(false);
      }
    );
  }, [animationDurationMs, closedTranslate, translate]);

  React.useEffect(() => {
    if (visible) {
      setMounted(true);
      // Ensure we start from closed position if we were unmounted.
      translate.value = closedTranslate;
      animateOpen();
    } else if (mounted) {
      animateClose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, closedTranslate]);

  // Keep translate consistent when screen dims change while closed.
  React.useEffect(() => {
    if (!mounted) {
      translate.value = closedTranslate;
    }
  }, [closedTranslate, mounted, translate]);

  const progress = useDerivedValue(() => {
    const denom = Math.abs(closedTranslate) || 1;
    const t = Math.min(1, Math.max(0, 1 - Math.abs(translate.value) / denom));
    return t;
  });

  const backdropAnimatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value * backdropOpacity,
  }));

  const panelAnimatedStyle = useAnimatedStyle(() => {
    if (position === 'bottom' || position === 'center') {
      return { transform: [{ translateY: translate.value }] };
    }
    return { transform: [{ translateX: translate.value }] };
  });

  const closeIfAllowed = React.useCallback(() => {
    if (!visible) return;
    onClose();
  }, [onClose, visible]);

  const gesture = React.useMemo(() => {
    if (!swipeToClose) return null;

    const shouldHandleHorizontal = position === 'left' || position === 'right';
    const shouldHandleVertical = position === 'bottom' || position === 'center';

    return Gesture.Pan()
      .onUpdate((e) => {
        if (shouldHandleHorizontal) {
          const dx = e.translationX;
          if (position === 'left') {
            // open is 0, closed is -panelW
            const next = Math.min(0, Math.max(-panelW, dx));
            translate.value = next;
          } else {
            const next = Math.max(0, Math.min(panelW, dx));
            translate.value = next;
          }
        } else if (shouldHandleVertical) {
          const dy = e.translationY;
          const next = Math.max(0, Math.min(panelH, dy));
          translate.value = next;
        }
      })
      .onEnd((e) => {
        const thresholdClosePct = 0.25;
        const fastVelocity = 650;

        if (shouldHandleHorizontal) {
          if (position === 'left') {
            const shouldClose =
              translate.value < -panelW * thresholdClosePct || e.velocityX < -fastVelocity;
            if (shouldClose && effectiveSwipeDirection === 'left') runOnJS(closeIfAllowed)();
            else translate.value = withTiming(0, { duration: animationDurationMs, easing: Easing.out(Easing.cubic) });
          } else {
            const shouldClose = translate.value > panelW * thresholdClosePct || e.velocityX > fastVelocity;
            if (shouldClose && effectiveSwipeDirection === 'right') runOnJS(closeIfAllowed)();
            else translate.value = withTiming(0, { duration: animationDurationMs, easing: Easing.out(Easing.cubic) });
          }
        } else if (shouldHandleVertical) {
          const shouldClose = translate.value > panelH * thresholdClosePct || e.velocityY > fastVelocity;
          if (shouldClose && effectiveSwipeDirection === 'down') runOnJS(closeIfAllowed)();
          else translate.value = withTiming(0, { duration: animationDurationMs, easing: Easing.out(Easing.cubic) });
        }
      });
  }, [
    animationDurationMs,
    closeIfAllowed,
    effectiveSwipeDirection,
    panelH,
    panelW,
    position,
    swipeToClose,
    translate,
  ]);

  if (!mounted) return null;

  const panelBaseStyle: ViewStyle = {
    backgroundColor,
    borderColor,
    borderWidth,
    borderRadius,
  };

  const sizedPanelStyle: ViewStyle =
    position === 'bottom' || position === 'center'
      ? { width: panelW, height: panelH }
      : { width: panelW, height: '100%' };

  const alignmentStyle: ViewStyle = (() => {
    switch (position) {
      case 'left':
        return { justifyContent: 'flex-start', alignItems: 'stretch', flexDirection: 'row' };
      case 'right':
        return { justifyContent: 'flex-end', alignItems: 'stretch', flexDirection: 'row' };
      case 'bottom':
        return { justifyContent: 'flex-end', alignItems: 'stretch', flexDirection: 'column' };
      case 'center':
      default:
        return { justifyContent: 'center', alignItems: 'center' };
    }
  })();

  const panel = (
    <Animated.View style={[styles.panel, sizedPanelStyle, panelBaseStyle, panelStyle, panelAnimatedStyle]}>
      {children}
    </Animated.View>
  );

  return (
    <RNModal
      transparent
      visible={mounted}
      animationType="none"
      presentationStyle="overFullScreen"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      {/* RN Modal is rendered in its own root; wrap gestures here even if app is already wrapped. */}
      <GestureHandlerRootView style={styles.root}>
        <View style={[styles.root, alignmentStyle]}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={closeOnBackdropPress ? onClose : undefined}
            accessibilityRole="button"
            accessibilityLabel="Close modal"
          >
            <Animated.View
              style={[StyleSheet.absoluteFill, { backgroundColor: backdropColor }, backdropAnimatedStyle]}
            />
          </Pressable>

          {gesture ? <GestureDetector gesture={gesture}>{panel}</GestureDetector> : panel}
        </View>
      </GestureHandlerRootView>
    </RNModal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  panel: {
    overflow: 'hidden',
  },
});


