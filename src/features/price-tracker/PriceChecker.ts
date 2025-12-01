/**
 * 価格チェックロジック
 *
 * ウィッシュリストの商品価格を追跡し、価格変動を検出する
 */

import type { WishlistItem } from "@/shared/wishlist";
import type {
	PriceChange,
	PriceHistoryEntry,
	PriceTrackerSettings,
	TrackedItem,
} from "@/types";

/** 価格履歴の最大保持日数 */
const MAX_HISTORY_DAYS = 30;

/**
 * 価格履歴を追加し、古いエントリを削除
 */
function addPriceHistory(
	history: readonly PriceHistoryEntry[],
	newPrice: number,
): PriceHistoryEntry[] {
	const now = new Date().toISOString();
	const cutoffDate = new Date();
	cutoffDate.setDate(cutoffDate.getDate() - MAX_HISTORY_DAYS);

	// 古いエントリを除去して新しいエントリを追加
	const filtered = history.filter((entry) => {
		const entryDate = new Date(entry.checkedAt);
		return entryDate > cutoffDate;
	});

	return [...filtered, { price: newPrice, checkedAt: now }];
}

/**
 * WishlistItemからTrackedItemを作成
 */
function createTrackedItem(wishlistItem: WishlistItem): TrackedItem {
	const now = new Date().toISOString();
	return {
		id: wishlistItem.id,
		name: wishlistItem.name,
		url: wishlistItem.url,
		priceHistory: [{ price: wishlistItem.price, checkedAt: now }],
		lastNotifiedPrice: null,
	};
}

/**
 * 既存のTrackedItemを更新
 */
function updateTrackedItem(
	existing: TrackedItem,
	wishlistItem: WishlistItem,
): TrackedItem {
	return {
		...existing,
		name: wishlistItem.name,
		priceHistory: addPriceHistory(existing.priceHistory, wishlistItem.price),
	};
}

/**
 * TrackedItemの最新価格を取得
 */
export function getLatestPrice(item: TrackedItem): number | null {
	if (item.priceHistory.length === 0) return null;
	return item.priceHistory[item.priceHistory.length - 1].price;
}

/**
 * TrackedItemの1つ前の価格を取得
 */
export function getPreviousPrice(item: TrackedItem): number | null {
	if (item.priceHistory.length < 2) return null;
	return item.priceHistory[item.priceHistory.length - 2].price;
}

/**
 * 価格変動を検出
 *
 * @param currentItems - 現在のウィッシュリストアイテム
 * @param storedItems - ストレージに保存されている追跡アイテム
 * @returns 値下げがあったアイテムの一覧
 */
export function detectPriceChanges(
	currentItems: WishlistItem[],
	storedItems: TrackedItem[],
): PriceChange[] {
	const storedMap = new Map(storedItems.map((item) => [item.id, item]));
	const changes: PriceChange[] = [];

	for (const current of currentItems) {
		const stored = storedMap.get(current.id);
		if (!stored) continue;

		const lastPrice = getLatestPrice(stored);
		if (lastPrice === null) continue;

		// 値下げを検出（値上げは通知しない）
		if (current.price < lastPrice) {
			changes.push({
				item: stored,
				oldPrice: lastPrice,
				newPrice: current.price,
			});
		}
	}

	return changes;
}

/**
 * 追跡アイテムを更新
 *
 * @param currentItems - 現在のウィッシュリストアイテム
 * @param storedItems - ストレージに保存されている追跡アイテム
 * @returns 更新された追跡アイテム一覧
 */
export function updateTrackedItems(
	currentItems: WishlistItem[],
	storedItems: TrackedItem[],
): TrackedItem[] {
	const storedMap = new Map(storedItems.map((item) => [item.id, item]));
	const updatedItems: TrackedItem[] = [];

	for (const current of currentItems) {
		const stored = storedMap.get(current.id);

		if (stored) {
			// 既存のアイテムを更新
			updatedItems.push(updateTrackedItem(stored, current));
		} else {
			// 新しいアイテムを追加
			updatedItems.push(createTrackedItem(current));
		}
	}

	return updatedItems;
}

/**
 * 通知済み価格を更新
 *
 * @param settings - 現在の設定
 * @param notifiedItems - 通知したアイテムのIDと価格のマップ
 * @returns 更新された設定
 */
export function markAsNotified(
	settings: PriceTrackerSettings,
	notifiedItems: Map<string, number>,
): PriceTrackerSettings {
	const updatedItems = settings.items.map((item) => {
		const notifiedPrice = notifiedItems.get(item.id);
		if (notifiedPrice !== undefined) {
			return {
				...item,
				lastNotifiedPrice: notifiedPrice,
			};
		}
		return item;
	});

	return {
		...settings,
		items: updatedItems,
	};
}

/**
 * 未通知の値下げをフィルタリング
 *
 * @param changes - 検出された価格変動
 * @returns 未通知の価格変動のみ
 */
export function filterUnnotifiedChanges(changes: PriceChange[]): PriceChange[] {
	return changes.filter((change) => {
		const { item, newPrice } = change;
		// 通知済み価格と同じ場合はスキップ
		if (item.lastNotifiedPrice !== null && item.lastNotifiedPrice <= newPrice) {
			return false;
		}
		return true;
	});
}
