import { TIMEOUTS } from "@/config/constants";
import { domBatcher } from "@/utils/domBatcher";

/**
 * MutationObserverで対象要素がDOMに現れるまで待機する
 *
 * @param selector - 待機する要素のCSSセレクター
 * @param timeout - タイムアウト時間（ミリ秒）
 * @returns 見つかった要素、またはタイムアウト時はnull
 *
 * @example
 * ```ts
 * const grid = await waitForElement('.item-grid', 5000);
 * if (grid) {
 *   // 要素が見つかった
 * }
 * ```
 */
export async function waitForElement(
	selector: string,
	timeout: number = TIMEOUTS.WAIT_FOR_ELEMENT_MS,
): Promise<Element | null> {
	const existing = document.querySelector(selector);
	if (existing) {
		return existing;
	}

	return new Promise<Element | null>((resolve) => {
		let timeoutId: NodeJS.Timeout | null = null;

		const observer = new MutationObserver(() => {
			domBatcher.read(() => {
				const element = document.querySelector(selector);
				if (element) {
					if (timeoutId) clearTimeout(timeoutId);
					observer.disconnect();
					resolve(element);
				}
			});
		});

		const root = document.body || document.documentElement;
		observer.observe(root, {
			childList: true,
			subtree: true,
			attributes: false,
			characterData: false,
		});

		timeoutId = setTimeout(() => {
			observer.disconnect();
			resolve(null);
		}, timeout);
	});
}

/**
 * 指定セレクターに一致する要素の表示/非表示を切り替える
 *
 * @param selector - 対象要素のCSSセレクター
 * @param visible - trueで表示、falseで非表示
 * @returns 処理した要素の配列
 */
export function toggleDisplay(
	selector: string,
	visible: boolean,
): HTMLElement[] {
	const elements = Array.from(document.querySelectorAll<HTMLElement>(selector));
	for (const element of elements) {
		element.style.display = visible ? "" : "none";
	}
	return elements;
}

/**
 * 指定セレクターに一致する要素をすべて削除する
 *
 * @param selector - 削除する要素のCSSセレクター
 * @returns 削除した要素の数
 */
export function removeElements(selector: string): number {
	const elements = document.querySelectorAll(selector);
	let count = 0;
	for (const element of elements) {
		element.remove();
		count++;
	}
	return count;
}
