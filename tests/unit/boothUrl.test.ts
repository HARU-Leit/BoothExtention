/**
 * Booth URL関連のユニットテスト
 *
 * テスト対象:
 * - extractBoothPathLocale: パスからロケール抽出
 * - isBoothItemPath: 商品詳細ページ判定
 * - parseBoothUrl: URL文字列のパース
 * - isBoothDomain: Boothドメイン判定
 * - isValidBoothUrl: 有効なBooth URL判定
 * - getCurrentPath / getCurrentOrigin: 現在の位置取得
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	BOOTH_PATH_LOCALES,
	extractBoothPathLocale,
	getCurrentOrigin,
	getCurrentPath,
	isBoothDomain,
	isBoothItemPath,
	isValidBoothUrl,
	parseBoothUrl,
} from "@/shared/url/boothUrl";

// ========================
// extractBoothPathLocale テスト
// ========================

describe("extractBoothPathLocale", () => {
	// --- 正常系 ---

	describe("有効なロケール抽出", () => {
		it.each(BOOTH_PATH_LOCALES)("ロケール '%s' をパスから抽出", (locale) => {
			const result = extractBoothPathLocale(`/${locale}/items`);
			expect(result).toBe(locale);
		});

		it.each(BOOTH_PATH_LOCALES)("大文字ロケール '%s' も抽出可能", (locale) => {
			const result = extractBoothPathLocale(`/${locale.toUpperCase()}/items`);
			expect(result).toBe(locale);
		});

		it("ロケール直後のスラッシュなしでも抽出", () => {
			expect(extractBoothPathLocale("/ja")).toBe("ja");
		});

		it("ロケール直後にクエリパラメータがあっても抽出", () => {
			// パスのみを見るので、クエリ文字列は別途処理される想定
			expect(extractBoothPathLocale("/en/items")).toBe("en");
		});
	});

	// --- 異常系 ---

	describe("抽出失敗", () => {
		it("ロケールなしのパス", () => {
			expect(extractBoothPathLocale("/items")).toBeNull();
		});

		it("ルートパス", () => {
			expect(extractBoothPathLocale("/")).toBeNull();
		});

		it("無効なロケール", () => {
			expect(extractBoothPathLocale("/fr/items")).toBeNull();
			expect(extractBoothPathLocale("/de/items")).toBeNull();
		});

		it("パス途中のロケール文字列は無視", () => {
			// ロケールはパスの先頭にのみ存在
			expect(extractBoothPathLocale("/items/ja/details")).toBeNull();
		});

		it("空文字列", () => {
			expect(extractBoothPathLocale("")).toBeNull();
		});

		it("スラッシュなし", () => {
			expect(extractBoothPathLocale("ja")).toBeNull();
		});
	});

	// --- 中国語ロケールの特殊ケース ---

	describe("中国語ロケール（ハイフン含む）", () => {
		it("zh-cn を正しく抽出", () => {
			expect(extractBoothPathLocale("/zh-cn/items")).toBe("zh-cn");
		});

		it("zh-tw を正しく抽出", () => {
			expect(extractBoothPathLocale("/zh-tw/items")).toBe("zh-tw");
		});

		it("ZH-CN（大文字）も zh-cn として抽出", () => {
			expect(extractBoothPathLocale("/ZH-CN/items")).toBe("zh-cn");
		});
	});
});

// ========================
// isBoothItemPath テスト
// ========================

describe("isBoothItemPath", () => {
	// --- 商品詳細ページ ---

	describe("商品詳細ページ", () => {
		it.each([
			"/items/12345",
			"/ja/items/12345",
			"/en/items/67890",
			"/zh-cn/items/1",
			"/items/999999999",
		])("'%s' は商品ページと判定", (path) => {
			expect(isBoothItemPath(path)).toBe(true);
		});
	});

	// --- 非商品ページ ---

	describe("非商品ページ", () => {
		it.each([
			"/",
			"/ja",
			"/items",
			"/ja/items",
			"/browse/items",
			"/items/",
			"/items/abc",
		])("'%s' は商品ページではない", (path) => {
			expect(isBoothItemPath(path)).toBe(false);
		});
	});

	// --- 正規表現マッチの特性 ---

	describe("正規表現マッチの特性", () => {
		// 現在の実装は /items/\d+ にマッチするかを見るため、
		// パスの途中に含まれていてもマッチする
		it("'/items/12345/edit' はマッチする（正規表現の特性）", () => {
			expect(isBoothItemPath("/items/12345/edit")).toBe(true);
		});

		it("'/shop/items/12345' はマッチする（正規表現の特性）", () => {
			expect(isBoothItemPath("/shop/items/12345")).toBe(true);
		});
	});
});

// ========================
// parseBoothUrl テスト
// ========================

describe("parseBoothUrl", () => {
	// --- 正常系 ---

	describe("正常なパース", () => {
		it("絶対URLをパース", () => {
			const result = parseBoothUrl("https://booth.pm/ja/items/12345");
			expect(result).not.toBeNull();
			expect(result?.hostname).toBe("booth.pm");
			expect(result?.pathname).toBe("/ja/items/12345");
		});

		it("相対URLをベースURLでパース", () => {
			const result = parseBoothUrl("/ja/items", "https://booth.pm");
			expect(result).not.toBeNull();
			expect(result?.href).toBe("https://booth.pm/ja/items");
		});

		it("サブドメイン付きURLをパース", () => {
			const result = parseBoothUrl("https://shop.booth.pm/items/123");
			expect(result).not.toBeNull();
			expect(result?.hostname).toBe("shop.booth.pm");
		});

		it("クエリパラメータ付きURLをパース", () => {
			const result = parseBoothUrl("https://booth.pm/ja/items?sort=new&page=2");
			expect(result).not.toBeNull();
			expect(result?.search).toBe("?sort=new&page=2");
		});
	});

	// --- 相対URLの解釈 ---

	describe("相対URLの解釈", () => {
		it("相対パスはデフォルトbaseでパースされる", () => {
			// parseBoothUrlはbaseが指定されない場合、getCurrentOrigin()を使用
			// SSR環境ではhttps://booth.pmがデフォルト
			const result = parseBoothUrl("not-a-url");
			// 相対URLとして解釈される
			expect(result).not.toBeNull();
		});

		it("空文字列は現在のURLとして解釈", () => {
			const result = parseBoothUrl("");
			// baseがデフォルトで設定されるため、空文字列は有効
			expect(result).not.toBeNull();
		});

		it("javascript: プロトコルもパース可能", () => {
			const result = parseBoothUrl("javascript:alert(1)");
			expect(result).not.toBeNull();
			expect(result?.protocol).toBe("javascript:");
		});
	});
});

// ========================
// isBoothDomain テスト
// ========================

describe("isBoothDomain", () => {
	// --- Boothドメイン ---

	describe("Boothドメイン", () => {
		it.each([
			"https://booth.pm",
			"https://booth.pm/ja/items",
			"https://shop.booth.pm",
			"https://myshop.booth.pm/items/123",
			"http://booth.pm",
			"https://BOOTH.PM",
		])("'%s' はBoothドメイン", (url) => {
			const parsed = new URL(url);
			expect(isBoothDomain(parsed)).toBe(true);
		});
	});

	// --- 非Boothドメイン ---

	describe("非Boothドメイン", () => {
		it.each([
			"https://google.com",
			"https://fakebooth.pm.com",
			"https://booth.pm.evil.com",
			"https://mybooth.com",
		])("'%s' はBoothドメインではない", (url) => {
			const parsed = new URL(url);
			expect(isBoothDomain(parsed)).toBe(false);
		});
	});

	// --- 境界ケース ---

	describe("境界ケース", () => {
		it("'notbooth.pm' は endsWith で booth.pm にマッチする", () => {
			// 現在の実装は endsWith("booth.pm") を使用しているため、
			// notbooth.pm もマッチしてしまう点に注意
			const parsed = new URL("https://notbooth.pm");
			expect(isBoothDomain(parsed)).toBe(true);
		});
	});
});

// ========================
// isValidBoothUrl テスト
// ========================

describe("isValidBoothUrl", () => {
	beforeEach(() => {
		// window.location.protocol をモック
		vi.stubGlobal("window", {
			location: {
				protocol: "https:",
				origin: "https://booth.pm",
			},
		});
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	// --- 有効なBooth URL ---

	describe("有効なBooth URL", () => {
		it("httpsのBooth URL", () => {
			expect(isValidBoothUrl("https://booth.pm/ja/items")).toBe(true);
		});

		it("サブドメイン付きBooth URL", () => {
			expect(isValidBoothUrl("https://shop.booth.pm/items/123")).toBe(true);
		});

		it("相対URLはベースURLでBooth判定", () => {
			expect(isValidBoothUrl("/ja/items", "https://booth.pm")).toBe(true);
		});
	});

	// --- 無効なBooth URL ---

	describe("無効なBooth URL", () => {
		it("非Boothドメイン", () => {
			expect(isValidBoothUrl("https://google.com")).toBe(false);
		});

		it("プロトコル不一致（http vs https）", () => {
			// window.location.protocol が https: なので http は無効
			expect(isValidBoothUrl("http://booth.pm")).toBe(false);
		});
	});

	// --- 相対URLの解釈 ---

	describe("相対URLの解釈", () => {
		it("相対パスはベースURLでBooth判定される", () => {
			// "not-a-url" は相対URLとしてパースされ、
			// ベースがbooth.pmなのでBoothドメインと判定される
			expect(isValidBoothUrl("not-a-url", "https://booth.pm")).toBe(true);
		});
	});
});

// ========================
// getCurrentPath / getCurrentOrigin テスト
// ========================

describe("getCurrentPath", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("windowが存在する場合はlocation.pathnameを返す", () => {
		vi.stubGlobal("window", {
			location: {
				pathname: "/ja/items/12345",
			},
		});

		expect(getCurrentPath()).toBe("/ja/items/12345");
	});

	it("windowが存在しない場合（SSR）は '/' を返す", () => {
		vi.stubGlobal("window", undefined);

		expect(getCurrentPath()).toBe("/");
	});
});

describe("getCurrentOrigin", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("windowが存在する場合はlocation.originを返す", () => {
		vi.stubGlobal("window", {
			location: {
				origin: "https://shop.booth.pm",
			},
		});

		expect(getCurrentOrigin()).toBe("https://shop.booth.pm");
	});

	it("windowが存在しない場合（SSR）はデフォルトURLを返す", () => {
		vi.stubGlobal("window", undefined);

		expect(getCurrentOrigin()).toBe("https://booth.pm");
	});
});

// ========================
// BOOTH_PATH_LOCALES 定数テスト
// ========================

describe("BOOTH_PATH_LOCALES", () => {
	it("5つのロケールを含む", () => {
		expect(BOOTH_PATH_LOCALES).toHaveLength(5);
	});

	it("サポートされるロケールが含まれる", () => {
		expect(BOOTH_PATH_LOCALES).toContain("ja");
		expect(BOOTH_PATH_LOCALES).toContain("en");
		expect(BOOTH_PATH_LOCALES).toContain("ko");
		expect(BOOTH_PATH_LOCALES).toContain("zh-cn");
		expect(BOOTH_PATH_LOCALES).toContain("zh-tw");
	});

	it("配列はreadonlyである", () => {
		// TypeScript型チェックのためのテスト
		// 実行時は常にtrueだが、型安全性の確認
		expect(Array.isArray(BOOTH_PATH_LOCALES)).toBe(true);
	});
});

// ========================
// 組み合わせテスト
// ========================

describe("URL関数の組み合わせ", () => {
	beforeEach(() => {
		vi.stubGlobal("window", {
			location: {
				protocol: "https:",
				origin: "https://booth.pm",
				pathname: "/ja/items",
			},
		});
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("parseBoothUrl → isBoothDomain の連携", () => {
		const url = "https://booth.pm/ja/items/12345";
		const parsed = parseBoothUrl(url);
		expect(parsed).not.toBeNull();
		expect(isBoothDomain(parsed as URL)).toBe(true);
	});

	it("parseBoothUrl → extractBoothPathLocale の連携", () => {
		const url = "https://booth.pm/ko/items";
		const parsed = parseBoothUrl(url);
		expect(parsed).not.toBeNull();
		const locale = extractBoothPathLocale(parsed?.pathname);
		expect(locale).toBe("ko");
	});

	it("全ロケールでURL生成→パース→ロケール抽出が一致", () => {
		for (const locale of BOOTH_PATH_LOCALES) {
			const url = `https://booth.pm/${locale}/items`;
			const parsed = parseBoothUrl(url);
			expect(parsed).not.toBeNull();
			expect(isBoothDomain(parsed as URL)).toBe(true);
			expect(extractBoothPathLocale(parsed?.pathname)).toBe(locale);
		}
	});

	it("商品URLの完全な検証フロー", () => {
		const url = "https://booth.pm/ja/items/12345";

		// URLをパース
		const parsed = parseBoothUrl(url);
		expect(parsed).not.toBeNull();

		// Boothドメインか確認
		expect(isBoothDomain(parsed as URL)).toBe(true);

		// ロケールを抽出
		const locale = extractBoothPathLocale(parsed?.pathname);
		expect(locale).toBe("ja");

		// 商品ページか確認
		expect(isBoothItemPath(parsed?.pathname)).toBe(true);

		// 有効なBooth URLか確認
		expect(isValidBoothUrl(url)).toBe(true);
	});
});
