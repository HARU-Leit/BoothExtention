import { defineConfig } from "wxt";

export default defineConfig({
	srcDir: "src",
	manifest: {
		name: "Booth Optimizer",
		description: "Boothを快適に - ショップブロック、リダイレクト、高速化",
		icons: {
			16: "icon/16.png",
			32: "icon/32.png",
			48: "icon/48.png",
			96: "icon/96.png",
			128: "icon/128.png",
		},
		action: {
			default_icon: {
				16: "icon/16.png",
				32: "icon/32.png",
				48: "icon/48.png",
			},
			default_title: "Booth Optimizer",
		},
		permissions: [
			"declarativeNetRequest",
			"declarativeNetRequestWithHostAccess",
			"storage",
			"tabs",
		],
		host_permissions: [
			"*://*.booth.pm/*",
			"*://booth.pximg.net/*",
			"https://*.google-analytics.com/*",
			"https://*.googletagmanager.com/*",
			"https://analytics.google.com/*",
			"https://stats.g.doubleclick.net/*",
			"https://*.doubleclick.net/*",
			"https://api.onesignal.com/*",
			"https://cdn.onesignal.com/*",
		],
	},
	modules: ["@wxt-dev/module-svelte"],
	vite: (env) => {
		const isBuild = env.command === "build";
		return {
			build: {
				minify: isBuild ? "esbuild" : false,
				sourcemap: isBuild ? false : "inline",
			},
			esbuild: {
				drop: isBuild ? ["console", "debugger"] : [],
			},
		};
	},
});
