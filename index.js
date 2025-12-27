// Entry point for Expo Router
// This file is required for Metro bundler to resolve the bundle root

// Suppress SafeAreaView deprecation warning from third-party dependencies
// Must run before any other imports to suppress warnings early
import { LogBox } from 'react-native';
LogBox.ignoreLogs([/SafeAreaView/, /react-native-safe-area-context/]);

// Polyfill for crypto.getRandomValues (required for some libraries)
// eslint-disable-next-line import/first
import 'react-native-get-random-values';

// eslint-disable-next-line import/first
import 'expo-router/entry';
