/**
 * ウィッシュリストページ用コンテンツスクリプト
 *
 * accounts.booth.pm/wish_lists でウィッシュリストデータを抽出し、
 * バックグラウンドに送信する
 *
 * 自動ページネーション対応：全ページを巡回して収集
 */

import {
	extractWishlistItemsFromDOM,
	sendWishlistToBackground,
	type WishlistItem,
} from "@/shared/wishlist";

/** トースト通知を表示 */
function showToast(
	message: string,
	type: "success" | "info" | "progress" = "info",
): HTMLDivElement {
	// 既存のトーストを削除
	const existingToast = document.getElementById("booth-optimizer-toast");
	if (existingToast) {
		existingToast.remove();
	}

	const toast = document.createElement("div");
	toast.id = "booth-optimizer-toast";
	toast.textContent = message;

	const bgColor =
		type === "success"
			? "#10b981"
			: type === "progress"
				? "#6366f1"
				: "#3b82f6";

	toast.style.cssText = `
		position: fixed;
		bottom: 20px;
		right: 20px;
		padding: 12px 20px;
		background: ${bgColor};
		color: white;
		border-radius: 8px;
		font-size: 14px;
		font-weight: 500;
		box-shadow: 0 4px 12px rgba(0,0,0,0.15);
		z-index: 999999;
		opacity: 0;
		transform: translateY(10px);
		transition: opacity 0.3s, transform 0.3s;
	`;

	document.body.appendChild(toast);

	// アニメーション開始
	requestAnimationFrame(() => {
		toast.style.opacity = "1";
		toast.style.transform = "translateY(0)";
	});

	return toast;
}

/** トーストを自動で消す */
function dismissToast(toast: HTMLDivElement, delay = 3000): void {
	setTimeout(() => {
		toast.style.opacity = "0";
		toast.style.transform = "translateY(10px)";
		setTimeout(() => toast.remove(), 300);
	}, delay);
}

/** ページネーションコンテナを取得 */
function getPaginationContainer(): HTMLElement | null {
	// ページネーションは flex items-center justify-center gap-8 を持つコンテナ
	const containers = document.querySelectorAll(
		".flex.items-center.justify-center",
	);
	for (const container of containers) {
		// 数字を含む子要素があるかチェック
		const hasPageNumbers = Array.from(container.children).some((child) =>
			/^\d+$/.test(child.textContent?.trim() ?? ""),
		);
		if (hasPageNumbers) {
			return container as HTMLElement;
		}
	}
	return null;
}

/** 総ページ数を取得 */
function getTotalPages(): number {
	const container = getPaginationContainer();
	if (!container) return 1;

	let maxPage = 1;
	for (const child of container.children) {
		const text = child.textContent?.trim() ?? "";
		const num = Number.parseInt(text, 10);
		if (!Number.isNaN(num) && num > maxPage) {
			maxPage = num;
		}
	}
	return maxPage;
}

/** 次のページボタンをクリック */
function clickNextPage(): boolean {
	const container = getPaginationContainer();
	if (!container) return false;

	// ArrowOpenRight アイコンを持つ要素を探す
	const nextBtn = container.querySelector(
		'pixiv-icon[name="24/ArrowOpenRight"]',
	);
	if (nextBtn) {
		const clickable =
			nextBtn.closest(".cursor-pointer") ?? nextBtn.parentElement;
		if (clickable) {
			(clickable as HTMLElement).click();
			return true;
		}
	}
	return false;
}

/** 特定のページ番号をクリック */
function clickPageNumber(pageNum: number): boolean {
	const container = getPaginationContainer();
	if (!container) return false;

	for (const child of container.children) {
		const text = child.textContent?.trim() ?? "";
		if (
			text === String(pageNum) &&
			child.classList.contains("cursor-pointer")
		) {
			(child as HTMLElement).click();
			return true;
		}
	}
	return false;
}

/** 指定時間待機 */
function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

/** DOMの変更を待つ */
function waitForDOMChange(timeout = 5000): Promise<void> {
	return new Promise((resolve) => {
		let resolved = false;

		const observer = new MutationObserver(() => {
			if (!resolved) {
				resolved = true;
				observer.disconnect();
				// DOM更新後に少し待ってから解決
				setTimeout(resolve, 500);
			}
		});

		const mountPoint = document.querySelector("#js-mount-point-wish-list");
		if (mountPoint) {
			observer.observe(mountPoint, {
				childList: true,
				subtree: true,
			});
		}

		// タイムアウト
		setTimeout(() => {
			if (!resolved) {
				resolved = true;
				observer.disconnect();
				resolve();
			}
		}, timeout);
	});
}

/** 全ページからアイテムを収集 */
async function collectAllItems(): Promise<WishlistItem[]> {
	const allItems = new Map<string, WishlistItem>();
	const totalPages = getTotalPages();

	if (totalPages === 1) {
		// 1ページのみの場合はそのまま抽出
		const items = extractWishlistItemsFromDOM();
		return items;
	}

	const toast = showToast(`価格を更新中... (1/${totalPages})`, "progress");

	// 最初のページの商品を取得
	let items = extractWishlistItemsFromDOM();
	for (const item of items) {
		allItems.set(item.id, item);
	}

	// 2ページ目以降を巡回
	for (let page = 2; page <= totalPages; page++) {
		// 429回避のためページ間で待機（1.5〜2.5秒のランダム）
		const delay = 1500 + Math.random() * 1000;
		await sleep(delay);

		toast.textContent = `価格を更新中... (${page}/${totalPages})`;

		// 次のページをクリック
		const clicked = clickNextPage();
		if (!clicked) {
			// 次へボタンがない場合はページ番号を直接クリック
			clickPageNumber(page);
		}

		// DOM更新を待つ
		await waitForDOMChange();

		// 商品を抽出
		items = extractWishlistItemsFromDOM();
		for (const item of items) {
			allItems.set(item.id, item);
		}
	}

	// トーストを消す
	toast.remove();

	return Array.from(allItems.values());
}

export default defineContentScript({
	matches: ["*://accounts.booth.pm/wish_list*"],
	runAt: "document_idle",

	main() {
		console.log("[Booth Optimizer] Wishlist content script loaded");

		// バックグラウンドからのトリガーを待つ
		browser.runtime.onMessage.addListener((message, _sender, sendResponse) => {
			const msg = message as { type?: string };
			if (msg.type === "TRIGGER_WISHLIST_EXTRACTION") {
				void extractAndSend();
				sendResponse({ success: true });
			}
			return true;
		});
	},
});

async function extractAndSend(): Promise<void> {
	try {
		const items = await collectAllItems();
		console.log(
			`[Booth Optimizer] Extracted ${items.length} wishlist items from all pages`,
		);

		if (items.length > 0) {
			await sendWishlistToBackground(items);
			const toast = showToast(
				`${items.length}件の商品を価格追跡に登録しました`,
				"success",
			);
			dismissToast(toast);
		} else {
			const toast = showToast("ウィッシュリストに商品がありません", "info");
			dismissToast(toast);
		}
	} catch (error) {
		console.error("[Booth Optimizer] Failed to extract wishlist:", error);
		const toast = showToast("価格追跡の登録に失敗しました", "info");
		dismissToast(toast);
	}
}
