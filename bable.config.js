module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo", "nativewind/babel"],
    plugins: [
      [
        "module-resolver",
        {
          root: ["./"],
          alias: {
            "@": "./",
          },
        },
      ],
      [
        "@babel/plugin-transform-flow-strip-types",
        {
          allowDeclareFields: true,
        },
      ],
      "react-native-reanimated/plugin", // This must be last
    ],
  };
};
