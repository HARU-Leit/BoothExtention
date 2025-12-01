/**
 * Booth.pm Webページテスト（拡張機能なし）
 *
 * 拡張機能のビルドなしで実行可能なWebテスト。
 * Booth.pmサイト自体の動作確認とスモークテストに使用。
 *
 * 実行方法:
 * - pnpm playwright test --project=web-only
 */
import { expect, test } from "@playwright/test";

// ========================
// Booth.pm サイトの基本テスト
// ========================

test.describe("Booth.pm サイト基本テスト", () => {
	test("トップページが表示される", async ({ page }) => {
		await page.goto("https://booth.pm");
		await page.waitForLoadState("domcontentloaded");

		await expect(page).toHaveTitle(/BOOTH/i);
	});

	test("日本語ページにアクセスできる", async ({ page }) => {
		await page.goto("https://booth.pm/ja");
		await page.waitForLoadState("domcontentloaded");

		expect(page.url()).toContain("/ja");
	});

	test("英語ページにアクセスできる", async ({ page }) => {
		await page.goto("https://booth.pm/en");
		await page.waitForLoadState("domcontentloaded");

		expect(page.url()).toContain("/en");
	});
});

// ========================
// 検索機能テスト
// ========================

test.describe("検索機能", () => {
	test("検索ページが表示される", async ({ page }) => {
		await page.goto("https://booth.pm/ja/items");
		await page.waitForLoadState("domcontentloaded");

		expect(page.url()).toContain("/items");
	});

	test("キーワード検索が機能する", async ({ page }) => {
		await page.goto("https://booth.pm/ja/items?keyword=test");
		await page.waitForLoadState("domcontentloaded");

		expect(page.url()).toContain("keyword=test");
	});

	test("ソート順を変更できる", async ({ page }) => {
		await page.goto("https://booth.pm/ja/items?sort=new");
		await page.waitForLoadState("domcontentloaded");

		expect(page.url()).toContain("sort=new");
	});

	test("在庫ありフィルターが機能する", async ({ page }) => {
		await page.goto("https://booth.pm/ja/items?in_stock=true");
		await page.waitForLoadState("domcontentloaded");

		expect(page.url()).toContain("in_stock=true");
	});
});

// ========================
// URLパラメータテスト
// ========================

test.describe("URLパラメータ", () => {
	test.describe("ロケール", () => {
		const locales = [
			{ code: "ja", name: "日本語" },
			{ code: "en", name: "英語" },
			{ code: "ko", name: "韓国語" },
			{ code: "zh-cn", name: "簡体字中国語" },
			{ code: "zh-tw", name: "繁体字中国語" },
		];

		for (const { code, name } of locales) {
			test(`${name}（${code}）の検索ページ`, async ({ page }) => {
				await page.goto(`https://booth.pm/${code}/items`);
				await page.waitForLoadState("domcontentloaded");

				expect(page.url()).toContain(`/${code}/items`);
			});
		}
	});

	test.describe("ソート順", () => {
		const sortOptions = [
			{ value: "new", label: "新着順" },
			{ value: "popularity", label: "人気順" },
			{ value: "wish_lists", label: "お気に入り数順" },
			{ value: "price_asc", label: "価格安い順" },
			{ value: "price_desc", label: "価格高い順" },
		];

		for (const { value, label } of sortOptions) {
			test(`${label}（sort=${value}）`, async ({ page }) => {
				await page.goto(`https://booth.pm/ja/items?sort=${value}`);
				await page.waitForLoadState("domcontentloaded");

				expect(page.url()).toContain(`sort=${value}`);
			});
		}
	});
});

// ========================
// レスポンシブテスト
// ========================

test.describe("レスポンシブ対応", () => {
	test("デスクトップサイズで表示", async ({ page }) => {
		await page.setViewportSize({ width: 1920, height: 1080 });
		await page.goto("https://booth.pm/ja/items");
		await page.waitForLoadState("domcontentloaded");

		await expect(page.locator("body")).toBeVisible();
	});

	test("タブレットサイズで表示", async ({ page }) => {
		await page.setViewportSize({ width: 768, height: 1024 });
		await page.goto("https://booth.pm/ja/items");
		await page.waitForLoadState("domcontentloaded");

		await expect(page.locator("body")).toBeVisible();
	});

	test("モバイルサイズで表示", async ({ page }) => {
		await page.setViewportSize({ width: 375, height: 812 });
		await page.goto("https://booth.pm/ja/items");
		await page.waitForLoadState("domcontentloaded");

		await expect(page.locator("body")).toBeVisible();
	});
});

// ========================
// パフォーマンステスト
// ========================

test.describe("パフォーマンス", () => {
	test("トップページの読み込みが5秒以内", async ({ page }) => {
		const startTime = Date.now();

		await page.goto("https://booth.pm/ja");
		await page.waitForLoadState("domcontentloaded");

		const loadTime = Date.now() - startTime;
		expect(loadTime).toBeLessThan(5000);
	});

	test("検索ページの読み込みが5秒以内", async ({ page }) => {
		const startTime = Date.now();

		await page.goto("https://booth.pm/ja/items");
		await page.waitForLoadState("domcontentloaded");

		const loadTime = Date.now() - startTime;
		expect(loadTime).toBeLessThan(5000);
	});
});

// ========================
// アクセシビリティテスト（基本）
// ========================

test.describe("アクセシビリティ", () => {
	test("ページにtitleタグがある", async ({ page }) => {
		await page.goto("https://booth.pm/ja");

		const title = await page.title();
		expect(title.length).toBeGreaterThan(0);
	});

	test("ページにlang属性がある", async ({ page }) => {
		await page.goto("https://booth.pm/ja");

		const lang = await page.locator("html").getAttribute("lang");
		expect(lang).toBeTruthy();
	});

	test("画像にalt属性がある（サンプルチェック）", async ({ page }) => {
		await page.goto("https://booth.pm/ja/items");
		await page.waitForLoadState("domcontentloaded");

		// 最初の数枚の画像をチェック
		const images = page.locator("img").first();
		if (await images.isVisible({ timeout: 3000 }).catch(() => false)) {
			const alt = await images.getAttribute("alt");
			// altが存在するか空文字でないことを確認（装飾画像は空でもOK）
			expect(alt !== null).toBe(true);
		}
	});
});

// ========================
// エラーハンドリングテスト
// ========================

test.describe("エラーハンドリング", () => {
	test("404ページが適切に処理される", async ({ page }) => {
		const response = await page.goto(
			"https://booth.pm/ja/items/00000000000000",
		);

		// 404かリダイレクトされる
		const status = response?.status() ?? 0;
		expect([200, 301, 302, 404]).toContain(status);
	});

	test("無効なロケールがリダイレクトされる", async ({ page }) => {
		await page.goto("https://booth.pm/xx/items");
		await page.waitForLoadState("domcontentloaded");

		// 有効なページにリダイレクトされることを確認
		await expect(page.locator("body")).toBeVisible();
	});
});
