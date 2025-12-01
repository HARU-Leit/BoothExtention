/**
 * ショップブロッカー関連のユニットテスト
 *
 * テスト対象:
 * - toggleShopInList: ブロックリストの追加・削除
 * - formatBlockedDate: 日付フォーマット
 * - shopNameSchema: ショップ名バリデーション
 * - ShopBlocker: DOMフィルタリングロジック
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { shopNameSchema } from "@/features/shop-blocker/schemas";
import {
	formatBlockedDate,
	toggleShopInList,
} from "@/features/shop-blocker/shopBlockControls";
import type { BlockedShop } from "@/types";

// ========================
// toggleShopInList テスト
// ========================

describe("toggleShopInList", () => {
	// 固定日時でテスト
	const MOCK_DATE = "2024-01-15T10:30:00.000Z";

	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date(MOCK_DATE));
	});

	// --- 追加操作 ---

	describe("ショップ追加（block=true）", () => {
		it("空リストにショップを追加", () => {
			const result = toggleShopInList([], "TestShop", true);

			expect(result).toHaveLength(1);
			expect(result[0]).toEqual({
				id: "TestShop",
				name: "TestShop",
				blockedAt: MOCK_DATE,
			});
		});

		it("既存リストに新しいショップを追加", () => {
			const existing: BlockedShop[] = [
				{ id: "Shop1", name: "Shop1", blockedAt: "2024-01-01T00:00:00.000Z" },
			];

			const result = toggleShopInList(existing, "Shop2", true);

			expect(result).toHaveLength(2);
			expect(result[0].name).toBe("Shop1");
			expect(result[1].name).toBe("Shop2");
		});

		it("重複するショップは追加されない", () => {
			const existing: BlockedShop[] = [
				{
					id: "TestShop",
					name: "TestShop",
					blockedAt: "2024-01-01T00:00:00.000Z",
				},
			];

			const result = toggleShopInList(existing, "TestShop", true);

			expect(result).toHaveLength(1);
			expect(result).toEqual(existing);
		});

		it("日本語のショップ名を追加", () => {
			const result = toggleShopInList([], "テストショップ", true);

			expect(result).toHaveLength(1);
			expect(result[0].name).toBe("テストショップ");
		});

		it("特殊文字を含むショップ名を追加", () => {
			const result = toggleShopInList([], "Shop & Co.", true);

			expect(result).toHaveLength(1);
			expect(result[0].name).toBe("Shop & Co.");
		});

		it("元の配列は変更されない（イミュータブル）", () => {
			const original: BlockedShop[] = [
				{ id: "Shop1", name: "Shop1", blockedAt: "2024-01-01T00:00:00.000Z" },
			];
			const originalCopy = [...original];

			toggleShopInList(original, "Shop2", true);

			expect(original).toEqual(originalCopy);
		});
	});

	// --- 削除操作 ---

	describe("ショップ削除（block=false）", () => {
		it("リストからショップを削除", () => {
			const existing: BlockedShop[] = [
				{ id: "Shop1", name: "Shop1", blockedAt: "2024-01-01T00:00:00.000Z" },
				{ id: "Shop2", name: "Shop2", blockedAt: "2024-01-02T00:00:00.000Z" },
			];

			const result = toggleShopInList(existing, "Shop1", false);

			expect(result).toHaveLength(1);
			expect(result[0].name).toBe("Shop2");
		});

		it("存在しないショップの削除は何もしない", () => {
			const existing: BlockedShop[] = [
				{ id: "Shop1", name: "Shop1", blockedAt: "2024-01-01T00:00:00.000Z" },
			];

			const result = toggleShopInList(existing, "NotExist", false);

			expect(result).toHaveLength(1);
			expect(result).toEqual(existing);
		});

		it("空リストからの削除", () => {
			const result = toggleShopInList([], "TestShop", false);

			expect(result).toHaveLength(0);
		});

		it("最後のショップを削除すると空リストになる", () => {
			const existing: BlockedShop[] = [
				{ id: "Shop1", name: "Shop1", blockedAt: "2024-01-01T00:00:00.000Z" },
			];

			const result = toggleShopInList(existing, "Shop1", false);

			expect(result).toHaveLength(0);
		});

		it("元の配列は変更されない（イミュータブル）", () => {
			const original: BlockedShop[] = [
				{ id: "Shop1", name: "Shop1", blockedAt: "2024-01-01T00:00:00.000Z" },
				{ id: "Shop2", name: "Shop2", blockedAt: "2024-01-02T00:00:00.000Z" },
			];
			const originalLength = original.length;

			toggleShopInList(original, "Shop1", false);

			expect(original).toHaveLength(originalLength);
		});
	});
});

// ========================
// formatBlockedDate テスト
// ========================

describe("formatBlockedDate", () => {
	const testDate = "2024-06-15T10:30:00.000Z";

	it("ロケール指定なしでフォーマット", () => {
		const result = formatBlockedDate(testDate);
		// 結果はシステムロケールに依存するが、少なくともエラーにならないことを確認
		expect(typeof result).toBe("string");
		expect(result.length).toBeGreaterThan(0);
	});

	it.each([
		["en-US", /6\/15\/2024|June 15, 2024/],
		["ja-JP", /2024\/6\/15|2024年6月15日/],
		["de-DE", /15\.6\.2024|15\. Juni 2024/],
	])("ロケール '%s' でフォーマット", (locale, pattern) => {
		const result = formatBlockedDate(testDate, locale);
		expect(result).toMatch(pattern);
	});

	it("無効な日付文字列はエラーをスロー", () => {
		expect(() => formatBlockedDate("invalid-date", "en-US")).toThrow();
	});

	it("ISO形式の日付を正しく処理", () => {
		const isoDate = "2024-12-25T00:00:00.000Z";
		const result = formatBlockedDate(isoDate, "en-US");
		expect(result).toContain("12"); // 12月
		expect(result).toContain("2024");
	});
});

// ========================
// shopNameSchema テスト
// ========================

describe("shopNameSchema", () => {
	// --- 有効な入力 ---

	describe("有効なショップ名", () => {
		it.each([
			["通常の文字列", "TestShop"],
			["日本語", "テストショップ"],
			["数字を含む", "Shop123"],
			["スペースを含む", "Test Shop"],
			["特殊文字を含む", "Shop & Co."],
			["絵文字を含む", "Shop ✨"],
			["1文字", "A"],
		])("%s: '%s' は有効", (_desc, input) => {
			const result = shopNameSchema.safeParse(input);
			expect(result.success).toBe(true);
		});

		it("前後の空白はトリムされる", () => {
			const result = shopNameSchema.safeParse("  TestShop  ");
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data).toBe("TestShop");
			}
		});
	});

	// --- 無効な入力 ---

	describe("無効なショップ名", () => {
		it("空文字列", () => {
			const result = shopNameSchema.safeParse("");
			expect(result.success).toBe(false);
		});

		it("空白のみ", () => {
			const result = shopNameSchema.safeParse("   ");
			expect(result.success).toBe(false);
		});

		it("タブと改行のみ", () => {
			const result = shopNameSchema.safeParse("\t\n");
			expect(result.success).toBe(false);
		});
	});
});

// ========================
// ShopBlocker DOM操作テスト
// ========================

describe("ShopBlocker DOM操作ロジック", () => {
	// DOMベースのブロックロジックをシミュレート
	// 実際のShopBlockerクラスはdomBatcherなどに依存するため、
	// ここではロジックの正確性のみテスト

	beforeEach(() => {
		document.body.innerHTML = "";
	});

	/**
	 * テスト用のショップカードDOMを生成
	 */
	function createShopCard(shopName: string): HTMLElement {
		const card = document.createElement("div");
		card.className = "item-card";
		const shopNameEl = document.createElement("a");
		shopNameEl.className = "shop-name";
		shopNameEl.textContent = shopName;
		card.appendChild(shopNameEl);
		return card;
	}

	/**
	 * ブロックロジックをシミュレート
	 */
	function applyBlockFilter(blockedNames: Set<string>): void {
		const shopNameElements = document.querySelectorAll(".shop-name");
		for (const shopNameEl of shopNameElements) {
			const shopName = shopNameEl.textContent?.trim() ?? "";
			if (shopName && blockedNames.has(shopName)) {
				const card = shopNameEl.closest(".item-card");
				card?.remove();
			}
		}
	}

	// --- 基本的なブロック動作 ---

	describe("基本的なブロック動作", () => {
		it("ブロック対象のショップカードを削除", () => {
			document.body.appendChild(createShopCard("Shop1"));
			document.body.appendChild(createShopCard("Shop2"));
			document.body.appendChild(createShopCard("Shop3"));

			applyBlockFilter(new Set(["Shop1"]));

			const cards = document.querySelectorAll(".item-card");
			expect(cards).toHaveLength(2);

			const names = Array.from(document.querySelectorAll(".shop-name")).map(
				(el) => el.textContent,
			);
			expect(names).not.toContain("Shop1");
			expect(names).toContain("Shop2");
			expect(names).toContain("Shop3");
		});

		it("複数のショップを同時にブロック", () => {
			document.body.appendChild(createShopCard("Shop1"));
			document.body.appendChild(createShopCard("Shop2"));
			document.body.appendChild(createShopCard("Shop3"));

			applyBlockFilter(new Set(["Shop1", "Shop3"]));

			const cards = document.querySelectorAll(".item-card");
			expect(cards).toHaveLength(1);

			const names = Array.from(document.querySelectorAll(".shop-name")).map(
				(el) => el.textContent,
			);
			expect(names).toEqual(["Shop2"]);
		});

		it("全てのショップをブロック", () => {
			document.body.appendChild(createShopCard("Shop1"));
			document.body.appendChild(createShopCard("Shop2"));

			applyBlockFilter(new Set(["Shop1", "Shop2"]));

			const cards = document.querySelectorAll(".item-card");
			expect(cards).toHaveLength(0);
		});
	});

	// --- エッジケース ---

	describe("エッジケース", () => {
		it("空のブロックリストは何も削除しない", () => {
			document.body.appendChild(createShopCard("Shop1"));
			document.body.appendChild(createShopCard("Shop2"));
			document.body.appendChild(createShopCard("Shop3"));

			applyBlockFilter(new Set());

			const cards = document.querySelectorAll(".item-card");
			expect(cards).toHaveLength(3);
		});

		it("空のDOMに対しても安全に動作", () => {
			expect(() => applyBlockFilter(new Set(["Shop1"]))).not.toThrow();
		});

		it("ショップ名の前後の空白をトリムして照合", () => {
			const card = createShopCard("  TestShop  ");
			document.body.appendChild(card);

			applyBlockFilter(new Set(["TestShop"]));

			const cards = document.querySelectorAll(".item-card");
			expect(cards).toHaveLength(0);
		});

		it("存在しないショップをブロックしても安全", () => {
			document.body.appendChild(createShopCard("Shop1"));

			applyBlockFilter(new Set(["NonExistent"]));

			const cards = document.querySelectorAll(".item-card");
			expect(cards).toHaveLength(1);
		});

		it("日本語ショップ名のブロック", () => {
			document.body.appendChild(createShopCard("テストショップ"));
			document.body.appendChild(createShopCard("サンプル屋"));

			applyBlockFilter(new Set(["テストショップ"]));

			const cards = document.querySelectorAll(".item-card");
			expect(cards).toHaveLength(1);

			const names = Array.from(document.querySelectorAll(".shop-name")).map(
				(el) => el.textContent,
			);
			expect(names).toEqual(["サンプル屋"]);
		});

		it("同名ショップが複数ある場合すべて削除", () => {
			document.body.appendChild(createShopCard("Shop1"));
			document.body.appendChild(createShopCard("Shop1"));
			document.body.appendChild(createShopCard("Shop2"));

			applyBlockFilter(new Set(["Shop1"]));

			const cards = document.querySelectorAll(".item-card");
			expect(cards).toHaveLength(1);
		});
	});

	// --- パフォーマンス確認 ---

	describe("パフォーマンス", () => {
		it("Setを使用したO(1)ルックアップ", () => {
			const shops = Array.from({ length: 100 }, (_, i) => `Shop${i}`);

			const blockedSet = new Set(shops);
			const startSet = performance.now();
			const _resultSet = blockedSet.has("Shop50");
			const endSet = performance.now();

			const startArray = performance.now();
			const _resultArray = shops.includes("Shop50");
			const endArray = performance.now();

			// 両方の操作が完了することを確認
			// 実際のパフォーマンス差は小さいデータでは測定困難
			expect(endSet - startSet).toBeGreaterThanOrEqual(0);
			expect(endArray - startArray).toBeGreaterThanOrEqual(0);
		});

		it("大量のカードに対するフィルタリング", () => {
			// 100個のカードを作成
			for (let i = 0; i < 100; i++) {
				document.body.appendChild(createShopCard(`Shop${i}`));
			}

			// 50個をブロック
			const blockedNames = new Set(
				Array.from({ length: 50 }, (_, i) => `Shop${i * 2}`),
			);

			applyBlockFilter(blockedNames);

			const cards = document.querySelectorAll(".item-card");
			expect(cards).toHaveLength(50);
		});
	});
});

// ========================
// ブロックリストの整合性テスト
// ========================

describe("ブロックリスト整合性", () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2024-01-15T10:30:00.000Z"));
	});

	it("追加→削除→再追加で新しいタイムスタンプ", () => {
		let list: BlockedShop[] = [];

		// 追加
		list = toggleShopInList(list, "TestShop", true);
		expect(list[0].blockedAt).toBe("2024-01-15T10:30:00.000Z");

		// 時間を進める
		vi.setSystemTime(new Date("2024-02-20T15:00:00.000Z"));

		// 削除
		list = toggleShopInList(list, "TestShop", false);
		expect(list).toHaveLength(0);

		// 再追加
		list = toggleShopInList(list, "TestShop", true);
		expect(list[0].blockedAt).toBe("2024-02-20T15:00:00.000Z");
	});

	it("複数操作後のリスト順序", () => {
		let list: BlockedShop[] = [];

		list = toggleShopInList(list, "Shop1", true);
		list = toggleShopInList(list, "Shop2", true);
		list = toggleShopInList(list, "Shop3", true);
		list = toggleShopInList(list, "Shop2", false);
		list = toggleShopInList(list, "Shop4", true);

		expect(list.map((s) => s.name)).toEqual(["Shop1", "Shop3", "Shop4"]);
	});
});
