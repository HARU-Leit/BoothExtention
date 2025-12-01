import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		environment: "jsdom",
		globals: true,
		setupFiles: ["./tests/setup.ts"],
		coverage: {
			provider: "v8",
			include: ["src/**/*.{ts,tsx,js,jsx}"],
			reporter: ["text", "json", "html"],
			exclude: [
				"node_modules/",
				".wxt/",
				".output/",
				"tests/",
				"**/*.spec.ts",
				"**/*.test.ts",
			],
		},

		include: ["tests/unit/**/*.{test,spec}.ts"],
		exclude: [
			"node_modules",
			".wxt",
			".output",
			"tests/e2e",
			"**/*.e2e.spec.ts",
		],
	},

	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./src"),
		},
	},
});
