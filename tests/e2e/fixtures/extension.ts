/**
 * Playwright E2Eテスト用フィクスチャ
 *
 * 拡張機能をロードしたブラウザコンテキストを提供
 */

import path from "node:path";
import {
	type BrowserContext,
	test as base,
	chromium,
	type Page,
} from "@playwright/test";

// 拡張機能のビルド出力パス
const EXTENSION_PATH = path.join(process.cwd(), ".output", "chrome-mv3");

/**
 * 拡張機能テスト用のカスタムフィクスチャ型
 */
export interface ExtensionFixtures {
	/** 拡張機能がロードされたブラウザコンテキスト */
	context: BrowserContext;
	/** 拡張機能ID */
	extensionId: string;
	/** 拡張機能のポップアップページ */
	popupPage: Page;
}

/**
 * 拡張機能テスト用のカスタムテスト
 */
export const test = base.extend<ExtensionFixtures>({
	// 拡張機能をロードしたコンテキスト
	// biome-ignore lint/correctness/noEmptyPattern: Playwright fixture requires destructuring
	context: async ({}, use) => {
		const context = await chromium.launchPersistentContext("", {
			headless: false,
			args: [
				`--disable-extensions-except=${EXTENSION_PATH}`,
				`--load-extension=${EXTENSION_PATH}`,
				"--no-first-run",
				"--disable-default-apps",
			],
		});
		await use(context);
		await context.close();
	},

	// 拡張機能IDを取得
	extensionId: async ({ context }, use) => {
		// Service Workerから拡張機能IDを取得
		let extensionId = "";

		// バックグラウンドページ（Service Worker）を待機
		const serviceWorker = context.serviceWorkers()[0];
		if (serviceWorker) {
			extensionId = serviceWorker.url().split("/")[2];
		} else {
			// Service Workerがまだ起動していない場合は待機
			const sw = await context.waitForEvent("serviceworker");
			extensionId = sw.url().split("/")[2];
		}

		await use(extensionId);
	},

	// ポップアップページを開く
	popupPage: async ({ context, extensionId }, use) => {
		const popupPage = await context.newPage();
		await popupPage.goto(`chrome-extension://${extensionId}/popup.html`);
		await use(popupPage);
		await popupPage.close();
	},
});

export { expect } from "@playwright/test";

/**
 * Booth.pmページのヘルパー関数
 */
export const boothHelpers = {
	/**
	 * 検索ページに移動
	 */
	async goToSearch(page: Page, locale = "ja"): Promise<void> {
		await page.goto(`https://booth.pm/${locale}/items`);
		await page.waitForLoadState("domcontentloaded");
	},

	/**
	 * 商品詳細ページに移動
	 */
	async goToItem(page: Page, itemId: string, locale = "ja"): Promise<void> {
		await page.goto(`https://booth.pm/${locale}/items/${itemId}`);
		await page.waitForLoadState("domcontentloaded");
	},

	/**
	 * ショップページに移動
	 */
	async goToShop(page: Page, shopId: string): Promise<void> {
		await page.goto(`https://${shopId}.booth.pm`);
		await page.waitForLoadState("domcontentloaded");
	},

	/**
	 * 商品グリッドが表示されるまで待機
	 */
	async waitForItemGrid(page: Page): Promise<void> {
		await page.waitForSelector(".item-card, [class*='item-card']", {
			timeout: 10000,
		});
	},

	/**
	 * 商品カードの数を取得
	 */
	async getItemCount(page: Page): Promise<number> {
		return page.locator(".item-card, [class*='item-card']").count();
	},

	/**
	 * ページをスクロールダウン
	 */
	async scrollToBottom(page: Page): Promise<void> {
		await page.evaluate(() => {
			window.scrollTo(0, document.body.scrollHeight);
		});
	},

	/**
	 * コンテンツスクリプトが注入されるまで待機
	 */
	async waitForContentScript(page: Page, timeout = 5000): Promise<boolean> {
		try {
			await page.waitForFunction(
				() => {
					// コンテンツスクリプトが設定するカスタム属性やグローバル変数をチェック
					return document.body !== null;
				},
				{ timeout },
			);
			return true;
		} catch {
			return false;
		}
	},
};

/**
 * ストレージ操作のヘルパー
 */
export const storageHelpers = {
	/**
	 * 拡張機能のストレージをクリア
	 */
	async clearStorage(page: Page): Promise<void> {
		await page.evaluate(() => {
			if (typeof chrome !== "undefined" && chrome.storage) {
				chrome.storage.local.clear();
				chrome.storage.sync.clear();
			}
		});
	},

	/**
	 * ストレージに値を設定
	 */
	async setStorageValue(
		page: Page,
		key: string,
		value: unknown,
	): Promise<void> {
		await page.evaluate(
			({ key, value }) => {
				if (typeof chrome !== "undefined" && chrome.storage) {
					chrome.storage.local.set({ [key]: value });
				}
			},
			{ key, value },
		);
	},

	/**
	 * ストレージから値を取得
	 */
	async getStorageValue(page: Page, key: string): Promise<unknown> {
		return page.evaluate((key) => {
			return new Promise((resolve) => {
				if (typeof chrome !== "undefined" && chrome.storage) {
					chrome.storage.local.get(key, (result) => {
						resolve(result[key]);
					});
				} else {
					resolve(undefined);
				}
			});
		}, key);
	},
};
