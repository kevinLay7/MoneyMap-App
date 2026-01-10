import { View } from 'react-native';
import React, { useState, useEffect } from 'react';
import { useAnimatedRef, useScrollOffset } from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import Constants from 'expo-constants';
import { BackgroundContainer } from '@/components/ui/background-container';
import { Header, ThemedText } from '@/components/shared';
import AnimatedScrollView from '@/components/ui/animated-scrollview';
import { SwitchInput } from '@/components/ui/inputs/switch-input';
import { Button } from '@/components/ui/button';
import { Colors } from '@/constants/colors';
import { getDeviceClientId } from '@/utils/device-client-id';

const BIOMETRIC_LOCK_KEY = '@biometric_lock_enabled';
const HAPTICS_KEY = '@haptics_enabled';

export default function SettingsScreen() {
  const animatedRef = useAnimatedRef<any>();
  const scrollOffset = useScrollOffset(animatedRef);

  const [biometricLockEnabled, setBiometricLockEnabled] = useState(false);
  const [hapticsEnabled, setHapticsEnabled] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  // Load settings from AsyncStorage on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const [biometric, haptics] = await Promise.all([
          AsyncStorage.getItem(BIOMETRIC_LOCK_KEY),
          AsyncStorage.getItem(HAPTICS_KEY),
        ]);

        if (biometric !== null) {
          setBiometricLockEnabled(biometric === 'true');
        }

        if (haptics !== null) {
          setHapticsEnabled(haptics === 'true');
        }
      } catch (error) {
        console.error('Failed to load settings:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, []);

  const handleBiometricToggle = async (value: boolean) => {
    try {
      setBiometricLockEnabled(value);
      await AsyncStorage.setItem(BIOMETRIC_LOCK_KEY, value.toString());
    } catch (error) {
      console.error('Failed to save biometric lock setting:', error);
      // Revert on error
      setBiometricLockEnabled(!value);
    }
  };

  const handleHapticsToggle = async (value: boolean) => {
    try {
      setHapticsEnabled(value);
      await AsyncStorage.setItem(HAPTICS_KEY, value.toString());
    } catch (error) {
      console.error('Failed to save haptics setting:', error);
      // Revert on error
      setHapticsEnabled(!value);
    }
  };

  const handleViewLogs = () => {
    router.push('/(auth)/logs');
  };

  if (isLoading) {
    return (
      <BackgroundContainer>
        <Header
          leftIcon="arrow-left"
          scrollOffset={scrollOffset}
          backgroundHex={Colors.primary}
          centerComponent={<ThemedText type="subtitle">Settings</ThemedText>}
        />
        <View className="flex-1 items-center justify-center">
          <ThemedText type="default" className="text-text-secondary">
            Loading settings...
          </ThemedText>
        </View>
      </BackgroundContainer>
    );
  }

  return (
    <BackgroundContainer>
      <Header
        leftIcon="arrow-left"
        scrollOffset={scrollOffset}
        backgroundHex={Colors.primary}
        centerComponent={<ThemedText type="subtitle">Settings</ThemedText>}
      />

      <AnimatedScrollView animatedRef={animatedRef}>
        <View className="px-4 pt-4 pb-8">
          {/* Security Section */}
          <View className="mb-6">
            <ThemedText type="defaultSemiBold" className="mb-3 text-text-secondary">
              Security
            </ThemedText>
            <View className="bg-background-secondary rounded-lg border border-border px-3">
              <SwitchInput
                icon="lock"
                label="Biometric Lock"
                description="Require Face ID or Touch ID to open the app"
                value={biometricLockEnabled}
                onValueChange={handleBiometricToggle}
              />
            </View>
          </View>

          {/* Preferences Section */}
          <View className="mb-6">
            <ThemedText type="defaultSemiBold" className="mb-3 text-text-secondary">
              Preferences
            </ThemedText>
            <View className="bg-background-secondary rounded-lg border border-border px-3">
              <SwitchInput
                icon="hand-pointer"
                label="Haptics"
                description="Enable haptic feedback for interactions"
                value={hapticsEnabled}
                onValueChange={handleHapticsToggle}
              />
            </View>
          </View>

          {/* Developer Section */}
          <View className="mb-6">
            <ThemedText type="defaultSemiBold" className="mb-3 text-text-secondary">
              Developer
            </ThemedText>
            <View className="bg-background-secondary rounded-lg border border-border p-4">
              <Button
                title="View Logs"
                onPress={handleViewLogs}
                color="background"
                size="md"
                marginY="0"
              />
            </View>
          </View>

          {/* About Section */}
          <View className="mb-6">
            <ThemedText type="defaultSemiBold" className="mb-3 text-text-secondary">
              About
            </ThemedText>
            <View className="bg-background-secondary rounded-lg border border-border p-4">
              <View className="mb-3">
                <ThemedText type="subText" className="text-text-secondary uppercase tracking-widest mb-1">
                  App Version
                </ThemedText>
                <ThemedText type="default">{Constants.expoConfig?.version || '1.0.0'}</ThemedText>
              </View>
              <View>
                <ThemedText type="subText" className="text-text-secondary uppercase tracking-widest mb-1">
                  Device ID
                </ThemedText>
                <ThemedText type="default" className="text-text-secondary text-xs">
                  {getDeviceClientId()}
                </ThemedText>
              </View>
            </View>
          </View>
        </View>
      </AnimatedScrollView>
    </BackgroundContainer>
  );
}
