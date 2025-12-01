import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright Configuration for Booth Optimizer Extension
 *
 * @see https://playwright.dev/docs/test-configuration
 *
 * 実行方法:
 * - E2Eテスト: bun test:e2e
 * - UIモード: bun test:e2e:ui
 * - レポート: bun test:report
 */

// ESモジュールで__dirnameを再現
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 拡張機能のビルド出力パス
const EXTENSION_PATH = path.join(__dirname, ".output", "chrome-mv3");

export default defineConfig({
	// E2Eテストディレクトリ
	testDir: "./tests/e2e",

	// テストタイムアウト（30秒）
	timeout: 30_000,

	// expect のタイムアウト
	expect: {
		timeout: 10_000,
	},

	// 並列実行
	fullyParallel: true,

	// CIでのみ forbidOnly を有効化
	forbidOnly: !!process.env.CI,

	// リトライ設定（CIでは2回）
	retries: process.env.CI ? 2 : 0,

	// ワーカー数（CIでは1、ローカルではデフォルト）
	workers: process.env.CI ? 1 : undefined,

	// レポーター設定
	reporter: process.env.CI
		? [["html", { open: "never" }], ["github"]]
		: [["html", { open: "on-failure" }], ["list"]],

	// 出力ディレクトリ
	outputDir: "./test-results",

	// 共通設定
	use: {
		// ベースURL
		baseURL: "https://booth.pm",

		// トレース（初回リトライ時に収集）
		trace: "on-first-retry",

		// スクリーンショット（失敗時のみ）
		screenshot: "only-on-failure",

		// ビデオ（失敗時に保持）
		video: "retain-on-failure",

		// ロケール
		locale: "ja-JP",

		// タイムゾーン
		timezoneId: "Asia/Tokyo",

		// ビューポート
		viewport: { width: 1280, height: 720 },
	},

	// テストプロジェクト
	projects: [
		// 拡張機能E2Eテスト（Chromium + 拡張機能）
		{
			name: "extension-e2e",
			testMatch: /.*\.e2e\.spec\.ts$/,
			use: {
				...devices["Desktop Chrome"],
				headless: false, // 拡張機能はヘッドレスモード非対応
				launchOptions: {
					args: [
						`--disable-extensions-except=${EXTENSION_PATH}`,
						`--load-extension=${EXTENSION_PATH}`,
						"--no-first-run",
						"--disable-default-apps",
						"--disable-popup-blocking",
					],
				},
			},
		},

		// Webテスト（拡張機能なし、純粋なWebページテスト）
		{
			name: "web-only",
			testMatch: /.*\.web\.spec\.ts$/,
			use: {
				...devices["Desktop Chrome"],
				headless: true,
			},
		},

		// モバイルテスト（オプション）
		{
			name: "mobile",
			testMatch: /.*\.mobile\.spec\.ts$/,
			use: {
				...devices["Pixel 5"],
				headless: true,
			},
		},
	],
});
