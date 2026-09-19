const path = require("node:path");
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "..");

const config = getDefaultConfig(projectRoot);

// Resolve the shared Zod/money contracts package (`../shared`) from the mobile
// app without a `file:` dependency, so the backend can still deploy in isolation.
config.watchFolders = [path.resolve(workspaceRoot, "shared")];
config.resolver.nodeModulesPaths = [path.resolve(projectRoot, "node_modules")];
config.resolver.extraNodeModules = {
	"@op/shared": path.resolve(workspaceRoot, "shared"),
};
config.resolver.unstable_enablePackageExports = true;

// On web (the Docker `web` image), the app runs in `remote` data mode and never
// touches the on-device database — redirect `expo-sqlite` to a stub so it stays
// out of the web bundle.
const sqliteWebStub = path.resolve(projectRoot, "src/lib/sqlite-web-stub.js");
const upstreamResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
	if (platform === "web" && moduleName === "expo-sqlite") {
		return { type: "sourceFile", filePath: sqliteWebStub };
	}
	return (upstreamResolveRequest ?? context.resolveRequest)(context, moduleName, platform);
};

module.exports = withNativeWind(config, { input: "./src/global.css" });
