const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// Ensure source maps are enabled and properly configured for debugging
config.transformer = {
  ...config.transformer,
  getTransformOptions: async () => ({
    transform: {
      experimentalImportSupport: false,
      // Disable inlineRequires - it interferes with breakpoints
      inlineRequires: false,
    },
  }),
};

module.exports = withNativeWind(config, { input: "./global.css" });
