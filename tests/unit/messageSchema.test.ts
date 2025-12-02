/**
 * バックグラウンドメッセージスキーマのユニットテスト
 *
 * テスト対象:
 * - wishlistItemSchema: ウィッシュリストアイテムのバリデーション
 * - backgroundMessageSchema: バックグラウンドスクリプトへのメッセージバリデーション
 */
import { describe, expect, it } from "vitest";
import {
	backgroundMessageSchema,
	wishlistItemSchema,
} from "@/shared/schema/storageSchemas";

// ========================
// wishlistItemSchema テスト
// ========================

describe("wishlistItemSchema", () => {
	describe("有効なウィッシュリストアイテム", () => {
		it("正常なアイテムを検証", () => {
			const item = {
				id: "12345",
				name: "テスト商品",
				url: "https://booth.pm/ja/items/12345",
				price: 1000,
			};

			const result = wishlistItemSchema.safeParse(item);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data).toEqual(item);
			}
		});

		it("価格が0のアイテムを許容", () => {
			const item = {
				id: "12345",
				name: "無料商品",
				url: "https://booth.pm/ja/items/12345",
				price: 0,
			};

			const result = wishlistItemSchema.safeParse(item);
			expect(result.success).toBe(true);
		});

		it("空の名前を許容", () => {
			const item = {
				id: "12345",
				name: "",
				url: "https://booth.pm/ja/items/12345",
				price: 500,
			};

			const result = wishlistItemSchema.safeParse(item);
			expect(result.success).toBe(true);
		});
	});

	describe("無効なウィッシュリストアイテム", () => {
		it("idが空文字列の場合は無効", () => {
			const item = {
				id: "",
				name: "テスト商品",
				url: "https://booth.pm/ja/items/12345",
				price: 1000,
			};

			const result = wishlistItemSchema.safeParse(item);
			expect(result.success).toBe(false);
		});

		it("urlが空文字列の場合は無効", () => {
			const item = {
				id: "12345",
				name: "テスト商品",
				url: "",
				price: 1000,
			};

			const result = wishlistItemSchema.safeParse(item);
			expect(result.success).toBe(false);
		});

		it("priceが文字列の場合は無効", () => {
			const item = {
				id: "12345",
				name: "テスト商品",
				url: "https://booth.pm/ja/items/12345",
				price: "1000",
			};

			const result = wishlistItemSchema.safeParse(item);
			expect(result.success).toBe(false);
		});

		it("必須フィールドがない場合は無効", () => {
			const item = {
				id: "12345",
				name: "テスト商品",
			};

			const result = wishlistItemSchema.safeParse(item);
			expect(result.success).toBe(false);
		});

		it("nullは無効", () => {
			const result = wishlistItemSchema.safeParse(null);
			expect(result.success).toBe(false);
		});

		it("undefinedは無効", () => {
			const result = wishlistItemSchema.safeParse(undefined);
			expect(result.success).toBe(false);
		});
	});
});

// ========================
// backgroundMessageSchema テスト
// ========================

describe("backgroundMessageSchema", () => {
	describe("WISHLIST_ITEMS_EXTRACTED メッセージ", () => {
		it("有効なウィッシュリスト抽出メッセージを検証", () => {
			const message = {
				type: "WISHLIST_ITEMS_EXTRACTED",
				items: [
					{
						id: "12345",
						name: "商品1",
						url: "https://booth.pm/ja/items/12345",
						price: 1000,
					},
					{
						id: "67890",
						name: "商品2",
						url: "https://booth.pm/ja/items/67890",
						price: 2000,
					},
				],
			};

			const result = backgroundMessageSchema.safeParse(message);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.type).toBe("WISHLIST_ITEMS_EXTRACTED");
				if (result.data.type === "WISHLIST_ITEMS_EXTRACTED") {
					expect(result.data.items).toHaveLength(2);
				}
			}
		});

		it("空のアイテム配列を許容", () => {
			const message = {
				type: "WISHLIST_ITEMS_EXTRACTED",
				items: [],
			};

			const result = backgroundMessageSchema.safeParse(message);
			expect(result.success).toBe(true);
		});

		it("itemsフィールドがない場合は無効", () => {
			const message = {
				type: "WISHLIST_ITEMS_EXTRACTED",
			};

			const result = backgroundMessageSchema.safeParse(message);
			expect(result.success).toBe(false);
		});

		it("無効なアイテムが含まれる場合は無効", () => {
			const message = {
				type: "WISHLIST_ITEMS_EXTRACTED",
				items: [
					{
						id: "", // 空のID
						name: "商品",
						url: "https://booth.pm/ja/items/12345",
						price: 1000,
					},
				],
			};

			const result = backgroundMessageSchema.safeParse(message);
			expect(result.success).toBe(false);
		});
	});

	describe("CHECK_PRICE_TRACKER_NEEDED メッセージ", () => {
		it("有効なメッセージを検証", () => {
			const message = {
				type: "CHECK_PRICE_TRACKER_NEEDED",
			};

			const result = backgroundMessageSchema.safeParse(message);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.type).toBe("CHECK_PRICE_TRACKER_NEEDED");
			}
		});

		it("余分なフィールドがあっても有効", () => {
			const message = {
				type: "CHECK_PRICE_TRACKER_NEEDED",
				extra: "ignored",
			};

			const result = backgroundMessageSchema.safeParse(message);
			expect(result.success).toBe(true);
		});
	});

	describe("TRIGGER_PRICE_CHECK メッセージ", () => {
		it("有効なメッセージを検証", () => {
			const message = {
				type: "TRIGGER_PRICE_CHECK",
			};

			const result = backgroundMessageSchema.safeParse(message);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.type).toBe("TRIGGER_PRICE_CHECK");
			}
		});
	});

	describe("無効なメッセージ", () => {
		it("未知のメッセージタイプは無効", () => {
			const message = {
				type: "UNKNOWN_MESSAGE_TYPE",
			};

			const result = backgroundMessageSchema.safeParse(message);
			expect(result.success).toBe(false);
		});

		it("typeフィールドがない場合は無効", () => {
			const message = {
				items: [],
			};

			const result = backgroundMessageSchema.safeParse(message);
			expect(result.success).toBe(false);
		});

		it("空オブジェクトは無効", () => {
			const result = backgroundMessageSchema.safeParse({});
			expect(result.success).toBe(false);
		});

		it("nullは無効", () => {
			const result = backgroundMessageSchema.safeParse(null);
			expect(result.success).toBe(false);
		});

		it("文字列は無効", () => {
			const result = backgroundMessageSchema.safeParse(
				"CHECK_PRICE_TRACKER_NEEDED",
			);
			expect(result.success).toBe(false);
		});

		it("配列は無効", () => {
			const result = backgroundMessageSchema.safeParse([
				{ type: "CHECK_PRICE_TRACKER_NEEDED" },
			]);
			expect(result.success).toBe(false);
		});
	});

	describe("型推論", () => {
		it("WISHLIST_ITEMS_EXTRACTEDメッセージの型推論", () => {
			const message = {
				type: "WISHLIST_ITEMS_EXTRACTED" as const,
				items: [
					{
						id: "12345",
						name: "商品",
						url: "https://booth.pm/ja/items/12345",
						price: 1000,
					},
				],
			};

			const result = backgroundMessageSchema.safeParse(message);
			expect(result.success).toBe(true);
			if (result.success && result.data.type === "WISHLIST_ITEMS_EXTRACTED") {
				// 型推論により items にアクセス可能
				expect(result.data.items[0].id).toBe("12345");
				expect(result.data.items[0].price).toBe(1000);
			}
		});
	});
});

// ========================
// エッジケース・セキュリティ
// ========================

describe("メッセージスキーマのセキュリティ", () => {
	it("プロトタイプ汚染を含むオブジェクトは安全に処理", () => {
		const malicious = JSON.parse(
			'{"type":"CHECK_PRICE_TRACKER_NEEDED","__proto__":{"admin":true}}',
		);

		const result = backgroundMessageSchema.safeParse(malicious);
		// パースは成功するが、__proto__は無視される
		expect(result.success).toBe(true);
	});

	it("非常に長い文字列を含むアイテム", () => {
		const longString = "a".repeat(10000);
		const item = {
			id: longString,
			name: longString,
			url: longString,
			price: 1000,
		};

		const result = wishlistItemSchema.safeParse(item);
		// 長さ制限がないのでパースは成功
		expect(result.success).toBe(true);
	});

	it("大量のアイテムを含むメッセージ", () => {
		const items = Array.from({ length: 1000 }, (_, i) => ({
			id: `item-${i}`,
			name: `商品${i}`,
			url: `https://booth.pm/ja/items/${i}`,
			price: i * 100,
		}));

		const message = {
			type: "WISHLIST_ITEMS_EXTRACTED",
			items,
		};

		const result = backgroundMessageSchema.safeParse(message);
		expect(result.success).toBe(true);
		if (result.success && result.data.type === "WISHLIST_ITEMS_EXTRACTED") {
			expect(result.data.items).toHaveLength(1000);
		}
	});
});
