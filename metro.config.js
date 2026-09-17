const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');
const fs = require('fs');

const config = getDefaultConfig(__dirname);

config.resolver.nodeModulesPaths = [path.resolve(__dirname, 'node_modules')];

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (
    moduleName === './node_modules/expo-router/entry' ||
    moduleName === 'node_modules/expo-router/entry' ||
    moduleName === 'expo-router/entry'
  ) {
    return {
      filePath: fs.realpathSync(require.resolve('expo-router/entry')),
      type: 'sourceFile',
    };
  }

  try {
    const res = context.resolveRequest(context, moduleName, platform);
    if (res && res.type === 'sourceFile' && res.filePath) {
      try {
        return {
          ...res,
          filePath: fs.realpathSync(res.filePath),
        };
      } catch {
        return res;
      }
    }
    return res;
  } catch (error) {
    try {
      const resolved = require.resolve(moduleName, {
        paths: [
          context.originModulePath ? path.dirname(context.originModulePath) : __dirname,
          path.resolve(__dirname, 'node_modules'),
          __dirname,
        ],
      });
      return {
        filePath: fs.realpathSync(resolved),
        type: 'sourceFile',
      };
    } catch {
      throw error;
    }
  }
};

module.exports = config;
