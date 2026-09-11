// expo/metro-config sets Metro up for this monorepo itself (SDK 52+), including pnpm's isolated
// installs (SDK 54+), so there are no watchFolders or nodeModulesPaths here.
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

module.exports = withNativeWind(getDefaultConfig(__dirname), { input: './global.css' });
