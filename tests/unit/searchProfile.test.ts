/**
 * 検索プロファイル関連のユニットテスト
 *
 * テスト対象:
 * - URL生成 (buildRelativeSearchUrl)
 * - URLパース (parseShopListingPath, isShopListingPath)
 * - URL照合 (urlMatchesProfile)
 * - プロファイル正規化 (sanitizeProfile, normalizeSearchProfileSettings)
 */
import { describe, expect, it } from "vitest";
import type { LanguageSearchProfile } from "@/shared/search";
import {
	buildRelativeSearchUrl,
	createDefaultLanguageProfile,
	createDefaultSearchProfileSettings,
	DEFAULT_SEARCH_SORT,
	getEffectiveSort,
	isShopListingPath,
	normalizeSearchProfileSettings,
	parseShopListingPath,
	sanitizeArray,
	sanitizeProfile,
	urlMatchesProfile,
} from "@/shared/search";

/**
 * テスト用のデフォルトプロファイルを生成
 * 各テストで独立した状態を保証するためディープコピーを返す
 */
function cloneProfile(): LanguageSearchProfile {
	return { ...createDefaultLanguageProfile() };
}

// ============================================================
// URL生成テスト (buildRelativeSearchUrl)
// ============================================================
describe("buildRelativeSearchUrl", () => {
	describe("基本パス生成", () => {
		it("キーワードが空の場合は /items パスを生成", () => {
			const profile = cloneProfile();
			const relative = buildRelativeSearchUrl("ja", profile);
			expect(relative).toBe("/ja/items");
		});

		it("キーワードがある場合は /search パスを生成", () => {
			const profile = cloneProfile();
			profile.keyword = "test";
			const relative = buildRelativeSearchUrl("ja", profile);
			expect(relative).toBe("/ja/search/test");
		});

		it("キーワードに空白が含まれる場合はエンコード", () => {
			const profile = cloneProfile();
			profile.keyword = "test keyword";
			const relative = buildRelativeSearchUrl("ja", profile);
			expect(relative).toBe("/ja/search/test%20keyword");
		});

		it("日本語キーワードをエンコード", () => {
			const profile = cloneProfile();
			profile.keyword = "テスト";
			const relative = buildRelativeSearchUrl("ja", profile);
			expect(relative).toBe("/ja/search/%E3%83%86%E3%82%B9%E3%83%88");
		});
	});

	describe("ソートパラメータ", () => {
		it("デフォルトソート(popularity)の場合はsortパラメータを省略", () => {
			const profile = cloneProfile();
			expect(profile.sort).toBe(DEFAULT_SEARCH_SORT);
			const relative = buildRelativeSearchUrl("ja", profile);
			expect(relative).toBe("/ja/items");
			expect(relative).not.toContain("sort=");
		});

		it("非デフォルトソートの場合はsortパラメータを含む", () => {
			const profile = cloneProfile();
			profile.sort = "price_desc";
			const relative = buildRelativeSearchUrl("ja", profile);
			expect(relative).toBe("/ja/items?sort=price_desc");
		});

		it.each([
			["new", "sort=new"],
			["wish_lists", "sort=wish_lists"],
			["price_desc", "sort=price_desc"],
			["price_asc", "sort=price_asc"],
		])("ソート '%s' の場合は '%s' を含む", (sortValue, expected) => {
			const profile = cloneProfile();
			profile.sort = sortValue as LanguageSearchProfile["sort"];
			const relative = buildRelativeSearchUrl("ja", profile);
			expect(relative).toContain(expected);
		});

		it("recentOnlyの場合はsort=newが強制される", () => {
			const profile = cloneProfile();
			profile.sort = "price_desc"; // 別のソートを指定
			profile.recentOnly = true;
			const relative = buildRelativeSearchUrl("ja", profile);
			expect(relative).toContain("sort=new");
			expect(relative).not.toContain("sort=price_desc");
		});
	});

	describe("フィルタパラメータ", () => {
		it("inStockOnly=true の場合は in_stock=true を含む", () => {
			const profile = cloneProfile();
			profile.inStockOnly = true;
			const relative = buildRelativeSearchUrl("ja", profile);
			expect(relative).toContain("in_stock=true");
		});

		it("recentOnly=true の場合は new_arrival=on を含む", () => {
			const profile = cloneProfile();
			profile.recentOnly = true;
			const relative = buildRelativeSearchUrl("ja", profile);
			expect(relative).toContain("new_arrival=on");
		});

		it("adult=include の場合は adult=include を含む", () => {
			const profile = cloneProfile();
			profile.adult = "include";
			const relative = buildRelativeSearchUrl("ja", profile);
			expect(relative).toContain("adult=include");
		});

		it("adult=only の場合は adult=only を含む", () => {
			const profile = cloneProfile();
			profile.adult = "only";
			const relative = buildRelativeSearchUrl("ja", profile);
			expect(relative).toContain("adult=only");
		});

		it("adult=absent の場合は adult パラメータを省略", () => {
			const profile = cloneProfile();
			profile.adult = "absent";
			const relative = buildRelativeSearchUrl("ja", profile);
			expect(relative).not.toContain("adult=");
		});
	});

	describe("配列パラメータ", () => {
		it("タグが1つの場合", () => {
			const profile = cloneProfile();
			profile.tags = ["tag1"];
			const relative = buildRelativeSearchUrl("ja", profile);
			expect(relative).toContain("tags%5B%5D=tag1");
		});

		it("タグが複数の場合", () => {
			const profile = cloneProfile();
			profile.tags = ["tag1", "tag2"];
			const relative = buildRelativeSearchUrl("ja", profile);
			expect(relative).toContain("tags%5B%5D=tag1");
			expect(relative).toContain("tags%5B%5D=tag2");
		});

		it("除外ワードが1つの場合", () => {
			const profile = cloneProfile();
			profile.exceptWords = ["ng1"];
			const relative = buildRelativeSearchUrl("ja", profile);
			expect(relative).toContain("except_words%5B%5D=ng1");
		});

		it("日本語タグをエンコード", () => {
			const profile = cloneProfile();
			profile.tags = ["タグ"];
			const relative = buildRelativeSearchUrl("ja", profile);
			expect(relative).toContain("tags%5B%5D=%E3%82%BF%E3%82%B0");
		});
	});

	describe("ページネーション", () => {
		it("page オプションを指定した場合は page パラメータを含む", () => {
			const profile = cloneProfile();
			const relative = buildRelativeSearchUrl("ja", profile, { page: 5 });
			expect(relative).toContain("page=5");
		});

		it("page=1 の場合も page パラメータを含む", () => {
			const profile = cloneProfile();
			const relative = buildRelativeSearchUrl("ja", profile, { page: 1 });
			expect(relative).toContain("page=1");
		});

		it("page が null の場合は page パラメータを省略", () => {
			const profile = cloneProfile();
			const relative = buildRelativeSearchUrl("ja", profile, { page: null });
			expect(relative).not.toContain("page=");
		});

		it("page が小数の場合は切り捨て", () => {
			const profile = cloneProfile();
			const relative = buildRelativeSearchUrl("ja", profile, { page: 2.7 });
			expect(relative).toContain("page=2");
		});

		it("page が0以下の場合は1に補正", () => {
			const profile = cloneProfile();
			const relative = buildRelativeSearchUrl("ja", profile, { page: 0 });
			expect(relative).toContain("page=1");
		});
	});

	describe("ロケール", () => {
		it.each(["ja", "en", "ko", "zh-cn", "zh-tw"] as const)(
			"ロケール '%s' でパスを生成",
			(locale) => {
				const profile = cloneProfile();
				const relative = buildRelativeSearchUrl(locale, profile);
				expect(relative).toBe(`/${locale}/items`);
			},
		);
	});

	describe("複合条件", () => {
		it("全フィルタを組み合わせた場合", () => {
			const profile = cloneProfile();
			profile.keyword = "テスト";
			profile.sort = "new";
			profile.tags = ["タグ"];
			profile.exceptWords = ["除外"];
			profile.inStockOnly = true;
			profile.recentOnly = true;
			profile.adult = "include";
			const relative = buildRelativeSearchUrl("ja", profile, { page: 1 });

			expect(relative).toContain("/ja/search/");
			expect(relative).toContain("sort=new");
			expect(relative).toContain("in_stock=true");
			expect(relative).toContain("new_arrival=on");
			expect(relative).toContain("adult=include");
			expect(relative).toContain("tags%5B%5D=");
			expect(relative).toContain("except_words%5B%5D=");
			expect(relative).toContain("page=1");
		});
	});
});

// ============================================================
// URLパーステスト (parseShopListingPath, isShopListingPath)
// ============================================================
describe("parseShopListingPath", () => {
	describe("有効なパス", () => {
		it("/ja/items を正しくパース", () => {
			const result = parseShopListingPath("/ja/items");
			expect(result).toEqual({ locale: "ja", kind: "items" });
		});

		it("/en/items を正しくパース", () => {
			const result = parseShopListingPath("/en/items");
			expect(result).toEqual({ locale: "en", kind: "items" });
		});

		it("/ja/search/keyword を正しくパース", () => {
			const result = parseShopListingPath("/ja/search/keyword");
			expect(result).toEqual({
				locale: "ja",
				kind: "search",
				keyword: "keyword",
			});
		});

		it("エンコードされた日本語キーワードをデコード", () => {
			const result = parseShopListingPath(
				"/ja/search/%E3%83%86%E3%82%B9%E3%83%88",
			);
			expect(result).toEqual({
				locale: "ja",
				kind: "search",
				keyword: "テスト",
			});
		});

		it.each(["ja", "en", "ko", "zh-cn", "zh-tw"] as const)(
			"ロケール '%s' を正しく検出",
			(locale) => {
				const result = parseShopListingPath(`/${locale}/items`);
				expect(result?.locale).toBe(locale);
			},
		);

		it("末尾スラッシュありでもパース可能", () => {
			const result = parseShopListingPath("/ja/items/");
			expect(result).toEqual({ locale: "ja", kind: "items" });
		});
	});

	describe("無効なパス", () => {
		it("商品詳細ページ (/ja/items/123) は null を返す", () => {
			expect(parseShopListingPath("/ja/items/123456")).toBeNull();
		});

		it("不明なセクション (/ja/other) は null を返す", () => {
			expect(parseShopListingPath("/ja/other")).toBeNull();
		});

		it("ロケールなしのパス (/items) は null を返す", () => {
			expect(parseShopListingPath("/items")).toBeNull();
		});

		it("キーワードなしの /search は null を返す", () => {
			expect(parseShopListingPath("/ja/search")).toBeNull();
			expect(parseShopListingPath("/ja/search/")).toBeNull();
		});

		it("不正なロケール (/xx/items) は null を返す", () => {
			expect(parseShopListingPath("/xx/items")).toBeNull();
		});
	});
});

describe("isShopListingPath", () => {
	it("有効なリストパスで true を返す", () => {
		expect(isShopListingPath("/ja/items")).toBe(true);
		expect(isShopListingPath("/en/search/test")).toBe(true);
	});

	it("無効なパスで false を返す", () => {
		expect(isShopListingPath("/ja/items/123")).toBe(false);
		expect(isShopListingPath("/ja/other")).toBe(false);
		expect(isShopListingPath("/")).toBe(false);
	});
});

// ============================================================
// URL照合テスト (urlMatchesProfile)
// ============================================================
describe("urlMatchesProfile", () => {
	describe("パスとキーワードの照合", () => {
		it("キーワード空のプロファイルと /items パスが一致", () => {
			const profile = cloneProfile();
			const url = new URL("https://booth.pm/ja/items");
			expect(urlMatchesProfile(url, "ja", profile)).toBe(true);
		});

		it("キーワードありのプロファイルと /search パスが一致", () => {
			const profile = cloneProfile();
			profile.keyword = "test";
			const url = new URL("https://booth.pm/ja/search/test");
			expect(urlMatchesProfile(url, "ja", profile)).toBe(true);
		});

		it("ロケール不一致で false", () => {
			const profile = cloneProfile();
			const url = new URL("https://booth.pm/en/items");
			expect(urlMatchesProfile(url, "ja", profile)).toBe(false);
		});

		it("キーワード不一致で false", () => {
			const profile = cloneProfile();
			profile.keyword = "foo";
			const url = new URL("https://booth.pm/ja/search/bar");
			expect(urlMatchesProfile(url, "ja", profile)).toBe(false);
		});
	});

	describe("ソートの照合", () => {
		it("デフォルトソート時、sort パラメータなしで一致", () => {
			const profile = cloneProfile();
			const url = new URL("https://booth.pm/ja/items");
			expect(urlMatchesProfile(url, "ja", profile)).toBe(true);
		});

		it("デフォルトソート時、sort=popularity で一致", () => {
			const profile = cloneProfile();
			const url = new URL("https://booth.pm/ja/items?sort=popularity");
			expect(urlMatchesProfile(url, "ja", profile)).toBe(true);
		});

		it("非デフォルトソートで sort パラメータが必要", () => {
			const profile = cloneProfile();
			profile.sort = "price_desc";
			const url = new URL("https://booth.pm/ja/items");
			expect(urlMatchesProfile(url, "ja", profile)).toBe(false);
		});

		it("ソート不一致で false", () => {
			const profile = cloneProfile();
			profile.sort = "new";
			const url = new URL("https://booth.pm/ja/items?sort=price_desc");
			expect(urlMatchesProfile(url, "ja", profile)).toBe(false);
		});

		it("recentOnly 時は sort=new が必須", () => {
			const profile = cloneProfile();
			profile.recentOnly = true;
			const urlWithNew = new URL(
				"https://booth.pm/ja/items?sort=new&new_arrival=on",
			);
			const urlWithOther = new URL(
				"https://booth.pm/ja/items?sort=price_desc&new_arrival=on",
			);
			expect(urlMatchesProfile(urlWithNew, "ja", profile)).toBe(true);
			expect(urlMatchesProfile(urlWithOther, "ja", profile)).toBe(false);
		});
	});

	describe("フラグの照合", () => {
		it("inStockOnly の一致/不一致", () => {
			const profile = cloneProfile();
			profile.inStockOnly = true;
			const urlMatch = new URL("https://booth.pm/ja/items?in_stock=true");
			const urlNoMatch = new URL("https://booth.pm/ja/items");
			expect(urlMatchesProfile(urlMatch, "ja", profile)).toBe(true);
			expect(urlMatchesProfile(urlNoMatch, "ja", profile)).toBe(false);
		});

		it("recentOnly の一致/不一致", () => {
			const profile = cloneProfile();
			profile.recentOnly = true;
			const urlMatch = new URL(
				"https://booth.pm/ja/items?sort=new&new_arrival=on",
			);
			const urlNoMatch = new URL("https://booth.pm/ja/items?sort=new");
			expect(urlMatchesProfile(urlMatch, "ja", profile)).toBe(true);
			expect(urlMatchesProfile(urlNoMatch, "ja", profile)).toBe(false);
		});

		it("adult フィルタの一致/不一致", () => {
			const profile = cloneProfile();
			profile.adult = "include";
			const urlMatch = new URL("https://booth.pm/ja/items?adult=include");
			const urlNoMatch = new URL("https://booth.pm/ja/items");
			expect(urlMatchesProfile(urlMatch, "ja", profile)).toBe(true);
			expect(urlMatchesProfile(urlNoMatch, "ja", profile)).toBe(false);
		});
	});

	describe("配列パラメータの照合", () => {
		it("タグの一致", () => {
			const profile = cloneProfile();
			profile.tags = ["tag1", "tag2"];
			const url = new URL(
				"https://booth.pm/ja/items?tags%5B%5D=tag1&tags%5B%5D=tag2",
			);
			expect(urlMatchesProfile(url, "ja", profile)).toBe(true);
		});

		it("タグの順序不一致で false", () => {
			const profile = cloneProfile();
			profile.tags = ["tag1", "tag2"];
			const url = new URL(
				"https://booth.pm/ja/items?tags%5B%5D=tag2&tags%5B%5D=tag1",
			);
			expect(urlMatchesProfile(url, "ja", profile)).toBe(false);
		});

		it("タグの数が不一致で false", () => {
			const profile = cloneProfile();
			profile.tags = ["tag1"];
			const url = new URL(
				"https://booth.pm/ja/items?tags%5B%5D=tag1&tags%5B%5D=tag2",
			);
			expect(urlMatchesProfile(url, "ja", profile)).toBe(false);
		});
	});

	describe("ページ番号の扱い", () => {
		it("page パラメータは照合に影響しない", () => {
			const profile = cloneProfile();
			const url = new URL("https://booth.pm/ja/items?page=5");
			expect(urlMatchesProfile(url, "ja", profile)).toBe(true);
		});
	});

	describe("生成URLとの整合性", () => {
		it("buildRelativeSearchUrl で生成したURLは必ず一致", () => {
			const combinations = [
				{ keyword: "", sort: "popularity" as const },
				{ keyword: "test", sort: "new" as const },
				{ keyword: "日本語", sort: "price_desc" as const, inStockOnly: true },
				{ keyword: "", recentOnly: true },
				{ keyword: "", tags: ["tag1", "tag2"], adult: "include" as const },
			];

			for (const opts of combinations) {
				const profile: LanguageSearchProfile = { ...cloneProfile(), ...opts };
				const relative = buildRelativeSearchUrl("ja", profile, { page: 1 });
				const url = new URL(`https://booth.pm${relative}`);
				expect(urlMatchesProfile(url, "ja", profile)).toBe(true);
			}
		});
	});
});

// ============================================================
// ヘルパー関数テスト
// ============================================================
describe("getEffectiveSort", () => {
	it("recentOnly=false の場合はプロファイルの sort を返す", () => {
		expect(getEffectiveSort({ sort: "price_desc", recentOnly: false })).toBe(
			"price_desc",
		);
	});

	it("recentOnly=true の場合は常に 'new' を返す", () => {
		expect(getEffectiveSort({ sort: "price_desc", recentOnly: true })).toBe(
			"new",
		);
		expect(getEffectiveSort({ sort: "popularity", recentOnly: true })).toBe(
			"new",
		);
	});
});

describe("sanitizeArray", () => {
	it("空白をトリム", () => {
		expect(sanitizeArray(["  foo  ", "bar"])).toEqual(["foo", "bar"]);
	});

	it("空文字列を除去", () => {
		expect(sanitizeArray(["foo", "", "bar", "  "])).toEqual(["foo", "bar"]);
	});

	it("重複を除去", () => {
		expect(sanitizeArray(["foo", "bar", "foo"])).toEqual(["foo", "bar"]);
	});

	it("空配列を返す", () => {
		expect(sanitizeArray([])).toEqual([]);
		expect(sanitizeArray(["", "  "])).toEqual([]);
	});
});

describe("sanitizeProfile", () => {
	it("キーワードをトリム", () => {
		const profile = cloneProfile();
		profile.keyword = "  test  ";
		const sanitized = sanitizeProfile(profile);
		expect(sanitized.keyword).toBe("test");
	});

	it("タグと除外ワードをサニタイズ", () => {
		const profile = cloneProfile();
		profile.tags = ["  tag  ", "", "tag"];
		profile.exceptWords = ["ng", "  ", "ng"];
		const sanitized = sanitizeProfile(profile);
		expect(sanitized.tags).toEqual(["tag"]);
		expect(sanitized.exceptWords).toEqual(["ng"]);
	});
});

describe("normalizeSearchProfileSettings", () => {
	it("有効な設定をそのまま返す", () => {
		const settings = createDefaultSearchProfileSettings();
		const normalized = normalizeSearchProfileSettings(settings);
		expect(normalized.enabled).toBe(true);
		expect(normalized.profile).toBeDefined();
	});

	it("enabled が非 boolean の場合は true にデフォルト", () => {
		const settings = {
			enabled: "yes" as unknown as boolean,
			profile: createDefaultLanguageProfile(),
		};
		const normalized = normalizeSearchProfileSettings(settings);
		expect(normalized.enabled).toBe(true);
	});
});

// ============================================================
// 網羅的組み合わせテスト
// ============================================================
describe("組み合わせテスト", () => {
	it("様々な組み合わせで生成したURLが照合に一致", () => {
		const keywords = ["", "alpha", "タグ"];
		const tagSets = [[], ["tag1"], ["tag1", "tag2"]];
		const exceptSets = [[], ["ng"]];
		const inStockFlags = [false, true];
		const recentFlags = [false, true];
		const adultOptions: LanguageSearchProfile["adult"][] = [
			"absent",
			"include",
			"only",
		];

		let testCount = 0;
		for (const keyword of keywords) {
			for (const tags of tagSets) {
				for (const exceptWords of exceptSets) {
					for (const inStockOnly of inStockFlags) {
						for (const recentOnly of recentFlags) {
							for (const adult of adultOptions) {
								const profile: LanguageSearchProfile = {
									...cloneProfile(),
									keyword,
									tags: [...tags],
									exceptWords: [...exceptWords],
									inStockOnly,
									recentOnly,
									adult,
								};
								const relative = buildRelativeSearchUrl("ja", profile, {
									page: 1,
								});
								const url = new URL(`https://booth.pm${relative}`);
								expect(urlMatchesProfile(url, "ja", profile)).toBe(true);
								testCount++;
							}
						}
					}
				}
			}
		}
		// 組み合わせ数を確認
		expect(testCount).toBe(3 * 3 * 2 * 2 * 2 * 3); // 216
	});
});
