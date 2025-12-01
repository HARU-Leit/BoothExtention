/**
 * 価格トラッカー通知システム
 *
 * バッジ更新とブラウザ通知を管理
 */

import type { PriceChange } from "@/types";

/** バッジの背景色 */
const BADGE_COLOR = "#e53935";

/**
 * 拡張機能アイコンのバッジを更新
 *
 * @param count - 表示する数字（0の場合はバッジを非表示）
 */
export async function updateBadge(count: number): Promise<void> {
	const text = count > 0 ? String(count) : "";
	await browser.action.setBadgeText({ text });

	if (count > 0) {
		await browser.action.setBadgeBackgroundColor({ color: BADGE_COLOR });
	}
}

/**
 * バッジをクリア
 */
export async function clearBadge(): Promise<void> {
	await browser.action.setBadgeText({ text: "" });
}

/**
 * 価格変動のブラウザ通知を表示
 *
 * @param change - 価格変動情報
 * @returns 通知ID
 */
export async function showPriceDropNotification(
	change: PriceChange,
): Promise<string> {
	const { item, oldPrice, newPrice } = change;
	const discount = Math.round(((oldPrice - newPrice) / oldPrice) * 100);

	const notificationId = `price-drop-${item.id}-${Date.now()}`;

	await browser.notifications.create(notificationId, {
		type: "basic",
		iconUrl: browser.runtime.getURL("icon/128.png"),
		title: "価格が下がりました！",
		message: `${item.name}\n¥${oldPrice.toLocaleString()} → ¥${newPrice.toLocaleString()} (${discount}% OFF)`,
	});

	return notificationId;
}

/**
 * 複数の価格変動をまとめて通知
 *
 * @param changes - 価格変動の配列
 */
export async function showPriceDropNotifications(
	changes: PriceChange[],
): Promise<void> {
	if (changes.length === 0) return;

	// 3件以上の場合はまとめて通知
	if (changes.length >= 3) {
		const totalSavings = changes.reduce(
			(sum, c) => sum + (c.oldPrice - c.newPrice),
			0,
		);

		await browser.notifications.create(`price-drop-summary-${Date.now()}`, {
			type: "basic",
			iconUrl: browser.runtime.getURL("icon/128.png"),
			title: `${changes.length}件の商品が値下げ！`,
			message: `合計 ¥${totalSavings.toLocaleString()} お得になりました`,
		});

		return;
	}

	// 少数の場合は個別に通知
	for (const change of changes) {
		await showPriceDropNotification(change);
	}
}

/**
 * 通知クリックハンドラを設定
 *
 * @param callback - 通知がクリックされたときのコールバック
 * @returns クリーンアップ関数
 */
export function setupNotificationClickHandler(
	callback: (notificationId: string) => void,
): () => void {
	const handler = (notificationId: string) => {
		callback(notificationId);
	};

	browser.notifications.onClicked.addListener(handler);

	return () => {
		browser.notifications.onClicked.removeListener(handler);
	};
}
