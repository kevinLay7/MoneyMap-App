const { getDefaultConfig } = require('@expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

/** @type {import('@expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Path to your global CSS file (usually ./global.css or ./src/global.css)
module.exports = withNativeWind(config, { input: './global.css' });
