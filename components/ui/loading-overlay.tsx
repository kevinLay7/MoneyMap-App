import React from 'react';
import { Modal, View, StyleSheet } from 'react-native';
import LottieView from 'lottie-react-native';

interface LoadingOverlayProps {
  visible: boolean;
  opacity?: number;
  lottieSize?: number;
}

export function LoadingOverlay({ 
  visible, 
  opacity = 0.7, 
  lottieSize = 120 
}: LoadingOverlayProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <View style={[styles.container, { backgroundColor: `rgba(0, 0, 0, ${opacity})` }]}>
        <LottieView
          source={require('@/assets/lottie/loading.json')}
          autoPlay
          loop
          style={{ width: lottieSize, height: lottieSize }}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

