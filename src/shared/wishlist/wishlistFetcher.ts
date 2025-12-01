/**
 * ウィッシュリスト取得ユーティリティ
 *
 * accounts.booth.pm/wish_lists ページのDOMから商品情報を取得する
 */

/** ウィッシュリストから取得した生のアイテム情報 */
export interface WishlistItem {
	readonly id: string;
	readonly name: string;
	readonly url: string;
	readonly price: number;
}

/** ウィッシュリスト取得結果 */
export interface WishlistFetchResult {
	readonly success: boolean;
	readonly items: WishlistItem[];
	readonly error?: string;
}

/**
 * 価格文字列をパースして数値に変換
 *
 * @example
 * parsePrice("¥ 1,000") // 1000
 * parsePrice("¥ 500~") // 500
 */
function parsePrice(priceText: string): number {
	// 「~」などの範囲表示を除去し、最小価格を取得
	const cleaned = priceText.replace(/[¥￥,円\s~～]/g, "");
	const parsed = Number.parseInt(cleaned, 10);
	return Number.isNaN(parsed) ? 0 : parsed;
}

/**
 * 商品URLからIDを抽出
 *
 * @example
 * extractItemId("https://booth.pm/ja/items/12345") // "12345"
 */
function extractItemId(url: string): string | null {
	const match = url.match(/\/items\/(\d+)/);
	return match?.[1] ?? null;
}

/**
 * 現在のページ（ウィッシュリストページ）からアイテムを抽出
 *
 * コンテンツスクリプト内で呼び出す
 */
export function extractWishlistItemsFromDOM(): WishlistItem[] {
	const items: WishlistItem[] = [];

	// item-card-wrapperが各商品カード
	const cardElements = document.querySelectorAll(".item-card-wrapper");

	for (const card of cardElements) {
		// 商品URL（最初のリンクから取得）
		const itemLink =
			card.querySelector<HTMLAnchorElement>('a[href*="/items/"]');
		const url = itemLink?.href ?? "";
		const id = extractItemId(url);

		if (!id) continue;

		// 商品名（line-clamp-2内のテキスト）
		const nameElement = card.querySelector(".line-clamp-2 .break-all");
		const name = nameElement?.textContent?.trim() ?? "";

		// 価格（text-primary400クラス）
		const priceElement = card.querySelector(".text-primary400");
		const priceText = priceElement?.textContent?.trim() ?? "0";
		const price = parsePrice(priceText);

		items.push({
			id,
			name,
			url,
			price,
		});
	}

	return items;
}

/**
 * ウィッシュリストページかどうかを判定
 */
export function isWishlistPage(): boolean {
	return (
		window.location.hostname === "accounts.booth.pm" &&
		window.location.pathname.includes("/wish_list")
	);
}

/**
 * バックグラウンドスクリプトにウィッシュリストデータを送信
 */
export async function sendWishlistToBackground(
	items: WishlistItem[],
): Promise<void> {
	await browser.runtime.sendMessage({
		type: "WISHLIST_ITEMS_EXTRACTED",
		items,
	});
}

/**
 * ウィッシュリストの抽出とバックグラウンドへの送信を実行
 */
export function extractAndSendWishlist(): void {
	if (!isWishlistPage()) return;

	const items = extractWishlistItemsFromDOM();
	if (items.length > 0) {
		void sendWishlistToBackground(items);
	}
}
