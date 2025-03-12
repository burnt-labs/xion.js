/**
 * Metro configuration helper for libsodium-wrappers-sumo in React Native
 *
 * Usage:
 * 1. Import this function in your metro.config.js
 * 2. Call it with your existing config
 *
 * Example:
 * const { getDefaultConfig } = require("expo/metro-config");
 * const { withLibsodiumResolver } = require("@burnt-labs/abstraxion-react-native/metro.libsodium");
 *
 * const config = getDefaultConfig(__dirname);
 * module.exports = withLibsodiumResolver(config);
 */

const path = require("path");

/**
 * Adds libsodium-wrappers-sumo resolver to your Metro config
 * @param {Object} config - Your existing Metro config
 * @returns {Object} Updated Metro config with libsodium resolver
 */
function withLibsodiumResolver(config) {
  // Save the original resolver if it exists
  const originalResolver = config.resolver.resolveRequest;

  // Override the resolver
  config.resolver.resolveRequest = (context, moduleName, platform) => {
    // Intercept libsodium-wrappers-sumo imports
    if (moduleName === "libsodium-wrappers-sumo") {
      return {
        filePath: path.resolve(
          path.dirname(require.resolve("@burnt-labs/abstraxion-react-native")),
          "../libsodiumWrapper.js",
        ),
        type: "sourceFile",
      };
    }

    // Use the original resolver for everything else
    return originalResolver
      ? originalResolver(context, moduleName, platform)
      : context.resolveRequest(context, moduleName, platform);
  };

  return config;
}

module.exports = { withLibsodiumResolver };
