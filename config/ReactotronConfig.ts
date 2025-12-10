import Reactotron from 'reactotron-react-native';
import { Platform } from 'react-native';

if (__DEV__) {
  try {
    // Determine the correct host based on platform
    let host = 'localhost';
    if (Platform.OS === 'android') {
      // For Android emulator, use 10.0.2.2
      // For physical device, you'll need to use your computer's IP address
      host = '10.0.2.2';
    }

    const tron = Reactotron.configure({
      name: 'MoneyMap',
      host,
      port: 9090,
    })
      .useReactNative({
        asyncStorage: false,
        networking: {
          ignoreUrls: /symbolicate/,
        },
        editor: false,
        errors: { veto: () => false },
        overlay: false,
      })
      .connect();

    // Clear Reactotron on each app load
    tron.clear?.();

    // Make tron available globally for debugging
    // @ts-ignore
    console.tron = tron;

    // Log connection status
    console.log('🔌 Reactotron configured:', { 
      host, 
      port: 9090,
      platform: Platform.OS,
      connected: !!tron,
    });
    
    // Test connection
    setTimeout(() => {
      if (console.tron) {
        console.tron.log('Reactotron connection test');
        console.log('✅ Reactotron is ready! Check the Reactotron desktop app.');
      } else {
        console.warn('⚠️ Reactotron not available. Make sure the desktop app is running.');
      }
    }, 1000);
  } catch (error) {
    console.warn('❌ Reactotron setup error:', error);
  }
}

export default {};

