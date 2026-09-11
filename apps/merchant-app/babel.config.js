// NativeWind 4 compiles className into styles at build time (spec §4: NativeWind on Expo).
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [['babel-preset-expo', { jsxImportSource: 'nativewind' }], 'nativewind/babel'],
  };
};
